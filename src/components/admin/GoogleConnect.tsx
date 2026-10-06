'use client'

import { Button, toast } from '@payloadcms/ui'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type Conn = { email?: string | null; status?: string | null; connectedAt?: string | null; lastError?: string | null }
type Cal = { id: number; calendarId: string; role: string; lastSyncedAt?: string | null; channelExpiresAt?: string | null; lastError?: string | null }

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('lt-LT', { dateStyle: 'short', timeStyle: 'short' }) : '—')

async function post(path: string) {
  const res = await fetch(path, { method: 'POST', credentials: 'include' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || res.statusText)
  return body
}

export function GoogleConnect() {
  const params = useSearchParams()
  const [conn, setConn] = useState<Conn | null>(null)
  const [cals, setCals] = useState<Cal[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch('/api/globals/google-connection', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/google-calendars?limit=20', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([c, l]) => {
      if (!alive) return
      setConn(c)
      setCals(l.docs ?? [])
    })
    return () => {
      alive = false
    }
  }, [version])

  const run = (key: string, path: string, done: string) => async () => {
    setBusy(key)
    try {
      await post(path)
      toast.success(done)
      setVersion((v) => v + 1)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const justConnected = params.get('connected')
  const error = params.get('error')
  const connected = conn?.status === 'connected'
  const broken = conn?.status === 'error'

  const box: React.CSSProperties = {
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    background: 'var(--theme-elevation-50)',
  }

  return (
    <div style={{ marginBottom: 32 }}>
      {justConnected && (
        <div style={{ ...box, borderColor: '#0e7c61', background: '#d6f1e7', color: '#0a5f4a' }}>
          ✓ Prijungta: <strong>{justConnected}</strong>. Registracijos dabar keliauja į Google kalendorių.
        </div>
      )}
      {error && <div style={{ ...box, borderColor: '#c0392b', background: '#fbe4e0', color: '#8a3326' }}>{error}</div>}

      <div style={box}>
        <p style={{ margin: '0 0 6px', fontSize: 13, opacity: 0.7 }}>Būsena</p>
        {!conn ? (
          <p>Įkeliama…</p>
        ) : connected ? (
          <p style={{ fontSize: 18, margin: 0 }}>
            🟢 Prijungta kaip <strong>{conn.email}</strong>
            <span style={{ opacity: 0.6, fontSize: 13 }}> · nuo {fmt(conn.connectedAt)}</span>
          </p>
        ) : broken ? (
          <p style={{ fontSize: 18, margin: 0, color: '#8a3326' }}>🔴 {conn.lastError || 'Ryšys su Google nutrūko.'}</p>
        ) : (
          <p style={{ fontSize: 18, margin: 0 }}>⚪ Neprijungta</p>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
          <Button el="anchor" url="/api/google/oauth/start" buttonStyle={connected ? 'secondary' : 'primary'}>
            {connected || broken ? 'Prisijungti iš naujo' : 'Prisijungti prie Google'}
          </Button>
          {connected && (
            <>
              <Button buttonStyle="secondary" disabled={!!busy} onClick={run('sync', '/api/google/sync', 'Sinchronizuota')}>
                {busy === 'sync' ? 'Sinchronizuojama…' : 'Sinchronizuoti dabar'}
              </Button>
              <Button buttonStyle="secondary" disabled={!!busy} onClick={run('full', '/api/google/sync?full=1', 'Pilna sinchronizacija atlikta')}>
                Pilna sinchronizacija
              </Button>
              <Button buttonStyle="secondary" disabled={!!busy} onClick={run('watch', '/api/google/watch', 'Webhook atnaujintas')}>
                Iš naujo užregistruoti webhook
              </Button>
            </>
          )}
          {(connected || broken) && (
            <Button
              buttonStyle="error"
              disabled={!!busy}
              onClick={async () => {
                if (!confirm('Atjungti Google kalendorių? Naujos registracijos nebebus perkeliamos į Google.')) return
                await run('disconnect', '/api/google/disconnect', 'Atjungta')()
              }}
            >
              Atjungti
            </Button>
          )}
        </div>
      </div>

      {connected && cals.length > 0 && (
        <div style={box}>
          <p style={{ margin: '0 0 10px', fontSize: 13, opacity: 0.7 }}>Sinchronizuojami kalendoriai</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', opacity: 0.7 }}>
                <th style={{ padding: '6px 8px' }}>Kalendorius</th>
                <th style={{ padding: '6px 8px' }}>Paskutinė sinchronizacija</th>
                <th style={{ padding: '6px 8px' }}>Tiesioginiai pranešimai iki</th>
                <th style={{ padding: '6px 8px' }}>Klaida</th>
              </tr>
            </thead>
            <tbody>
              {cals.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid var(--theme-elevation-150)' }}>
                  <td style={{ padding: '8px' }}>{c.role === 'bookings' ? 'Inward sesijos (registracijos)' : 'Pagrindinis (užimtumas)'}</td>
                  <td style={{ padding: '8px' }}>{fmt(c.lastSyncedAt)}</td>
                  <td style={{ padding: '8px' }}>{c.channelExpiresAt ? fmt(c.channelExpiresAt) : 'tik su viešu HTTPS adresu'}</td>
                  <td style={{ padding: '8px', color: c.lastError ? '#8a3326' : undefined }}>{c.lastError ? c.lastError.replace(/^\S+: /, '') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
