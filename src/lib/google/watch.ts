import { randomUUID } from 'node:crypto'
import type { Payload } from 'payload'

import type { GoogleCalendar } from '@/payload-types'
import { updateCalendarDoc } from './calendars'
import { getCalendar, googleMessage } from './client'
import { canReceiveWebhooks, publicUrl, webhookToken } from './config'

const RENEW_BEFORE_MS = 24 * 3_600_000
const TTL_SECONDS = 7 * 24 * 3600

export async function stopChannel(payload: Payload, channelId: string, resourceId: string) {
  try {
    await (await getCalendar(payload)).channels.stop({ requestBody: { id: channelId, resourceId } })
  } catch {
    // already expired or unknown – nothing to stop
  }
}

/** Registers (or renews) a push-notification channel so Google calls our webhook on every change. */
export async function ensureWatch(payload: Payload, cal: GoogleCalendar, opts: { force?: boolean } = {}) {
  if (!canReceiveWebhooks()) return { skipped: 'PUBLIC_URL must be https and GOOGLE_WEBHOOK_TOKEN set' }
  const expires = cal.channelExpiresAt ? new Date(cal.channelExpiresAt).getTime() : 0
  if (!opts.force && cal.channelId && expires - Date.now() > RENEW_BEFORE_MS) return { skipped: 'channel still valid' }

  try {
    const res = await (await getCalendar(payload)).events.watch({
      calendarId: cal.calendarId,
      requestBody: {
        id: randomUUID(),
        type: 'web_hook',
        address: `${publicUrl()}/api/google/webhook`,
        token: webhookToken(),
        params: { ttl: String(TTL_SECONDS) },
      },
    })
    if (cal.channelId && cal.resourceId) await stopChannel(payload, cal.channelId, cal.resourceId)
    await updateCalendarDoc(payload, cal.id, {
      channelId: res.data.id ?? null,
      resourceId: res.data.resourceId ?? null,
      channelExpiresAt: res.data.expiration ? new Date(Number(res.data.expiration)).toISOString() : null,
      lastError: null,
    })
    payload.logger.info({ calendarId: cal.calendarId }, 'Google: push channel registered')
    return { ok: true }
  } catch (err) {
    payload.logger.error({ err, calendarId: cal.calendarId }, 'Google: watch failed')
    await updateCalendarDoc(payload, cal.id, { lastError: `${new Date().toISOString()}: watch: ${googleMessage(err)}` })
    return { error: googleMessage(err) }
  }
}
