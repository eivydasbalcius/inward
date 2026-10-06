import { calendar, type calendar_v3 } from '@googleapis/calendar'
import { OAuth2Client } from 'google-auth-library'
import type { Payload } from 'payload'

import { decrypt } from '../crypto'
import { oauthClientId, oauthClientSecret, oauthRedirectUri } from './config'

export const TOKEN_PURPOSE = 'google-refresh-token'

export const oauthClient = () => new OAuth2Client(oauthClientId(), oauthClientSecret(), oauthRedirectUri())

let cached: { tokenEnc: string; api: calendar_v3.Calendar } | null = null

/** Calendar API client acting as the connected admin account (access tokens refresh automatically). */
export async function getCalendar(payload: Payload): Promise<calendar_v3.Calendar> {
  const conn = await payload.findGlobal({ slug: 'google-connection', depth: 0, overrideAccess: true })
  if (!conn.refreshTokenEnc) throw new Error('Google Calendar is not connected')
  if (cached?.tokenEnc === conn.refreshTokenEnc) return cached.api
  const auth = oauthClient()
  auth.setCredentials({ refresh_token: decrypt(conn.refreshTokenEnc, TOKEN_PURPOSE) })
  const api = calendar({ version: 'v3', auth })
  cached = { tokenEnc: conn.refreshTokenEnc, api }
  return api
}

export function resetCalendarClient() {
  cached = null
}

export function googleStatus(err: unknown): number | undefined {
  const e = err as { code?: number | string; status?: number; response?: { status?: number } }
  const code = e?.response?.status ?? e?.status ?? (typeof e?.code === 'number' ? e.code : Number(e?.code))
  return Number.isFinite(code) ? Number(code) : undefined
}

export function googleMessage(err: unknown): string {
  const e = err as { message?: string; errors?: { message?: string }[]; response?: { data?: { error?: string } } }
  return (e?.response?.data?.error || e?.errors?.[0]?.message || e?.message || String(err)).slice(0, 500)
}

/** Refresh token revoked/expired → the admin must reconnect. */
export const isAuthRevoked = (err: unknown) => /invalid_grant|unauthorized_client|Token has been expired or revoked/i.test(googleMessage(err))

export async function markConnectionBroken(payload: Payload, err: unknown) {
  if (!isAuthRevoked(err)) return
  resetCalendarClient()
  await payload.updateGlobal({
    slug: 'google-connection',
    data: { status: 'error', lastError: 'Google prieiga nebegalioja – prisijunkite iš naujo.' },
    overrideAccess: true,
  })
}
