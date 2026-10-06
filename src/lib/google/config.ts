import type { Payload } from 'payload'

export const oauthClientId = () => process.env.GOOGLE_OAUTH_CLIENT_ID || ''
export const oauthClientSecret = () => process.env.GOOGLE_OAUTH_CLIENT_SECRET || ''
export const hasOAuthClient = () => Boolean(oauthClientId() && oauthClientSecret())

export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar']

/** The "Inward sesijos" calendar bookings are written to. */
export const bookingsCalendarId = () => process.env.GOOGLE_BOOKINGS_CALENDAR_ID || ''

/** Calendars we read busy time from: the bookings calendar and the connected account's main calendar. */
export const watchedCalendars = () => {
  const list = [
    ...(bookingsCalendarId() ? [{ calendarId: bookingsCalendarId(), role: 'bookings' as const }] : []),
    { calendarId: 'primary', role: 'busy' as const },
  ]
  return list.filter((c, i) => list.findIndex((x) => x.calendarId === c.calendarId) === i)
}

/** True when the OAuth app is set up and an admin has connected their Google account. */
export async function isGoogleConfigured(payload: Payload) {
  if (!hasOAuthClient() || !bookingsCalendarId()) return false
  const conn = await payload.findGlobal({ slug: 'google-connection', depth: 0, overrideAccess: true })
  return Boolean(conn.refreshTokenEnc) && conn.status !== 'error'
}

export const publicUrl = () => (process.env.PUBLIC_URL || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')

export const siteOrigin = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export const oauthRedirectUri = () => `${siteOrigin()}/api/google/oauth/callback`

export const webhookToken = () => process.env.GOOGLE_WEBHOOK_TOKEN || ''

/** Google only delivers push notifications to public HTTPS endpoints. */
export const canReceiveWebhooks = () => publicUrl().startsWith('https://') && !!webhookToken()

/** How far ahead Google events are mirrored (covers the max booking horizon). */
export const MIRROR_DAYS = 400
