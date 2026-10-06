import type { Payload } from 'payload'

import { encrypt } from '../crypto'
import { ensureCalendarDocs } from './calendars'
import { getCalendar, googleMessage, oauthClient, resetCalendarClient, TOKEN_PURPOSE } from './client'
import { bookingsCalendarId, GOOGLE_SCOPES } from './config'
import { retryPendingBookings } from './events'
import { syncCalendar } from './sync'
import { ensureWatch, stopChannel } from './watch'

export function authUrl(state: string) {
  return oauthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // always return a refresh token
    include_granted_scopes: true,
    scope: GOOGLE_SCOPES,
    state,
  })
}

/** Exchanges the OAuth code, stores the encrypted refresh token and brings everything in sync. */
export async function completeConnection(payload: Payload, code: string) {
  const { tokens } = await oauthClient().getToken(code)
  if (!tokens.refresh_token) throw new Error('Google negrąžino ilgalaikio prieigos rakto. Bandykite prisijungti dar kartą.')
  if (!tokens.scope?.includes('auth/calendar')) {
    throw new Error('Nebuvo suteikta prieiga prie kalendoriaus. Prisijungdami pažymėkite kalendoriaus leidimą.')
  }

  resetCalendarClient()
  await payload.updateGlobal({
    slug: 'google-connection',
    data: { refreshTokenEnc: encrypt(tokens.refresh_token, TOKEN_PURPOSE), status: 'connected', lastError: null },
    overrideAccess: true,
  })

  const api = await getCalendar(payload)
  const primary = await api.calendars.get({ calendarId: 'primary' })
  // The bookings calendar must belong to (or be shared with) the connected account
  try {
    await api.calendars.get({ calendarId: bookingsCalendarId() })
  } catch (err) {
    await disconnect(payload)
    throw new Error(
      `Paskyra ${primary.data.id} nemato kalendoriaus „Inward sesijos“ (${googleMessage(err)}). Prisijunkite ta paskyra, kurioje jis sukurtas.`,
    )
  }
  await payload.updateGlobal({
    slug: 'google-connection',
    data: { email: primary.data.id, connectedAt: new Date().toISOString() },
    overrideAccess: true,
  })

  // Calendar docs from an earlier connection carry stale sync tokens/channels: start clean
  await payload.delete({ collection: 'google-calendars', where: { id: { exists: true } }, overrideAccess: true })
  for (const cal of await ensureCalendarDocs(payload)) {
    await syncCalendar(payload, cal, { full: true })
    await ensureWatch(payload, cal)
  }
  const pushed = await retryPendingBookings(payload)
  payload.logger.info({ email: primary.data.id, pushed }, 'Google: account connected')
  return primary.data.id
}

export async function disconnect(payload: Payload) {
  const { docs } = await payload.find({ collection: 'google-calendars', limit: 20, overrideAccess: true })
  for (const c of docs) if (c.channelId && c.resourceId) await stopChannel(payload, c.channelId, c.resourceId).catch(() => {})
  try {
    const conn = await payload.findGlobal({ slug: 'google-connection', overrideAccess: true })
    if (conn.refreshTokenEnc) {
      const api = await getCalendar(payload)
      const auth = api.context._options.auth as { revokeCredentials?: () => Promise<unknown> }
      await auth?.revokeCredentials?.().catch(() => {})
    }
  } catch {
    // token may already be invalid
  }
  resetCalendarClient()
  await payload.delete({ collection: 'google-calendars', where: { id: { exists: true } }, overrideAccess: true })
  await payload.delete({ collection: 'busy-blocks', where: { id: { exists: true } }, overrideAccess: true })
  await payload.updateGlobal({
    slug: 'google-connection',
    data: { refreshTokenEnc: null, email: null, connectedAt: null, status: 'disconnected', lastError: null },
    overrideAccess: true,
  })
}
