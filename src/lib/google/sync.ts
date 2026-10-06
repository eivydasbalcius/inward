import type { calendar_v3 } from '@googleapis/calendar'
import type { Payload } from 'payload'

import type { GoogleCalendar } from '@/payload-types'
import { dayBounds } from '../slots'
import { updateCalendarDoc } from './calendars'
import { getCalendar, googleMessage, googleStatus, markConnectionBroken } from './client'
import { MIRROR_DAYS } from './config'

const DAY = 86_400_000

type Busy = { start: Date; end: Date; allDay: boolean }

/** Converts a Google event to busy time, or null when it does not block the admin. */
export function eventToBusy(ev: calendar_v3.Schema$Event): Busy | null {
  if (ev.status === 'cancelled' || ev.transparency === 'transparent') return null
  if (ev.attendees?.find((a) => a.self)?.responseStatus === 'declined') return null
  if (ev.start?.dateTime && ev.end?.dateTime) {
    return { start: new Date(ev.start.dateTime), end: new Date(ev.end.dateTime), allDay: false }
  }
  if (ev.start?.date && ev.end?.date) {
    // all-day: end.date is exclusive → block from start-day 00:00 to end-day 00:00 (Vilnius)
    return { start: dayBounds(ev.start.date).start, end: dayBounds(ev.end.date).start, allDay: true }
  }
  return null
}

async function upsertBlock(payload: Payload, calendarId: string, eventId: string, busy: Busy | null) {
  const { docs } = await payload.find({
    collection: 'busy-blocks',
    where: { and: [{ calendarId: { equals: calendarId } }, { eventId: { equals: eventId } }] },
    limit: 1,
    depth: 0,
  })
  const existing = docs[0]
  const now = Date.now()
  const relevant = busy && busy.end.getTime() > now - DAY && busy.start.getTime() < now + MIRROR_DAYS * DAY
  if (!relevant) {
    if (existing) await payload.delete({ collection: 'busy-blocks', id: existing.id })
    return
  }
  const data = { calendarId, eventId, start: busy.start.toISOString(), end: busy.end.toISOString(), allDay: busy.allDay }
  if (!existing) await payload.create({ collection: 'busy-blocks', data })
  else if (existing.start !== data.start || existing.end !== data.end || existing.allDay !== data.allDay)
    await payload.update({ collection: 'busy-blocks', id: existing.id, data })
}

/** Our own booking events: never busy time; flag the booking if the admin moved/deleted it in Google. */
async function reconcileBookingEvent(payload: Payload, bookingId: string, ev: calendar_v3.Schema$Event) {
  const booking = await payload
    .findByID({ collection: 'bookings', id: Number(bookingId), depth: 0, disableErrors: true })
    .catch(() => null)
  if (!booking || booking.status !== 'confirmed') return
  let state: 'changed-in-google' | 'deleted-in-google' | null = null
  if (ev.status === 'cancelled') state = 'deleted-in-google'
  else {
    const busy = eventToBusy(ev)
    const moved =
      !busy ||
      busy.start.getTime() !== new Date(booking.start).getTime() ||
      busy.end.getTime() !== new Date(booking.end!).getTime()
    if (moved) state = 'changed-in-google'
  }
  if (state && booking.googleSyncState !== state) {
    payload.logger.warn({ bookingId, state }, 'Google: booking event was modified in Google Calendar')
    await payload.update({
      collection: 'bookings',
      id: booking.id,
      data: { googleSyncState: state },
      context: { fromGoogleSync: true },
    })
  }
}

async function runSync(payload: Payload, cal: GoogleCalendar, full: boolean) {
  const api = await getCalendar(payload)
  const syncToken = full ? null : cal.syncToken
  // Full sync = mark & sweep: blocks whose event no longer exists are removed afterwards,
  // so busy time never disappears mid-sync.
  const seen = syncToken ? null : new Set<string>()

  let pageToken: string | undefined
  let nextSyncToken: string | null | undefined
  let count = 0
  do {
    let res
    try {
      res = await api.events.list({
        calendarId: cal.calendarId,
        singleEvents: true,
        maxResults: 2500,
        pageToken,
        ...(syncToken ? { syncToken } : { timeMin: new Date(Date.now() - DAY).toISOString() }),
      })
    } catch (err) {
      if (googleStatus(err) === 410 && syncToken) {
        // token expired → start over with a full sync
        payload.logger.info({ calendarId: cal.calendarId }, 'Google: sync token expired, full resync')
        return runSync(payload, { ...cal, syncToken: null }, true)
      }
      throw err
    }
    for (const ev of res.data.items ?? []) {
      if (!ev.id) continue
      count++
      seen?.add(ev.id)
      const bookingId = ev.extendedProperties?.private?.inwardBookingId
      if (bookingId) await reconcileBookingEvent(payload, bookingId, ev)
      else await upsertBlock(payload, cal.calendarId, ev.id, eventToBusy(ev))
    }
    pageToken = res.data.nextPageToken ?? undefined
    nextSyncToken = res.data.nextSyncToken
  } while (pageToken)

  if (seen) {
    await payload.delete({
      collection: 'busy-blocks',
      where: { and: [{ calendarId: { equals: cal.calendarId } }, { eventId: { not_in: [...seen, '__none__'] } }] },
    })
  }

  const now = new Date().toISOString()
  await updateCalendarDoc(payload, cal.id, {
    syncToken: nextSyncToken ?? null,
    lastSyncedAt: now,
    ...(!syncToken ? { lastFullSyncAt: now } : {}),
    lastError: null,
  })
  payload.logger.info({ calendarId: cal.calendarId, changes: count, full: !syncToken }, 'Google: calendar synced')
}

// One sync per calendar at a time; a request arriving mid-sync schedules exactly one follow-up run.
const running = new Map<string, Promise<void>>()
const rerun = new Set<string>()

export async function syncCalendar(payload: Payload, cal: GoogleCalendar, opts: { full?: boolean } = {}) {
  const key = cal.calendarId
  if (running.has(key)) {
    rerun.add(key)
    return running.get(key)
  }
  const task = (async () => {
    try {
      let full = !!opts.full
      do {
        rerun.delete(key)
        const fresh = await payload.findByID({ collection: 'google-calendars', id: cal.id })
        await runSync(payload, fresh, full)
        full = false
      } while (rerun.has(key))
    } catch (err) {
      // Log once per distinct error (e.g. a calendar not shared yet) instead of every minute
      await markConnectionBroken(payload, err)
      const message = googleMessage(err)
      const previous = (await payload.findByID({ collection: 'google-calendars', id: cal.id })).lastError ?? ''
      if (!previous.endsWith(message)) payload.logger.error({ err, calendarId: key }, 'Google: sync failed')
      await updateCalendarDoc(payload, cal.id, { lastError: `${new Date().toISOString()}: ${message}` })
    } finally {
      running.delete(key)
    }
  })()
  running.set(key, task)
  return task
}
