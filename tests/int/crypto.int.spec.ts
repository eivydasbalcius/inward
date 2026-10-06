import { describe, expect, it } from 'vitest'

import { googleCalendarUrl } from '@/components/booking/dates'
import { decrypt, encrypt, sign, verify } from '@/lib/crypto'

describe('crypto', () => {
  it('round-trips and uses a fresh IV every time', () => {
    const a = encrypt('1//refresh-token-ąčę', 'test')
    const b = encrypt('1//refresh-token-ąčę', 'test')
    expect(a).not.toBe(b)
    expect(decrypt(a, 'test')).toBe('1//refresh-token-ąčę')
  })

  it('rejects tampering and the wrong purpose', () => {
    const c = encrypt('secret', 'test')
    const [v, iv, tag, data] = c.split('.')
    const flipped = `${v}.${iv}.${tag}.${data.slice(0, -2)}${data.at(-2) === 'A' ? 'B' : 'A'}${data.at(-1)}`
    expect(() => decrypt(flipped, 'test')).toThrow()
    expect(() => decrypt(c, 'other')).toThrow()
  })

  it('signed state verifies, expires and cannot be forged', () => {
    const s = sign({ uid: 1, nonce: 'n' }, 'state', 60_000)
    expect(verify<{ uid: number }>(s, 'state')?.uid).toBe(1)
    expect(verify(s, 'other')).toBeNull()
    const [body, mac] = s.split('.')
    const forged = Buffer.from(
      JSON.stringify({ uid: 2, nonce: 'n', exp: Date.now() + 1e6 }),
    ).toString('base64url')
    expect(verify(`${forged}.${mac}`, 'state')).toBeNull()
    expect(verify(`${body}.x`, 'state')).toBeNull()
    expect(verify(sign({ uid: 1 }, 'state', -1), 'state')).toBeNull()
  })
})

describe('googleCalendarUrl', () => {
  it('builds a pre-filled Google Calendar event in UTC', () => {
    const url = new URL(
      googleCalendarUrl({
        start: '2026-10-09T13:00:00.000Z',
        end: '2026-10-09T13:50:00.000Z',
        title: 'Inward – Individuali sesija',
        location: 'Gatvė 1, Vilnius',
      }),
    )
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('dates')).toBe('20261009T130000Z/20261009T135000Z')
    expect(url.searchParams.get('text')).toBe('Inward – Individuali sesija')
    expect(url.searchParams.get('location')).toBe('Gatvė 1, Vilnius')
    expect(url.searchParams.get('ctz')).toBe('Europe/Vilnius')
  })
})
