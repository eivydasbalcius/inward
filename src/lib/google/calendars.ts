import type { Payload } from 'payload'

import type { GoogleCalendar } from '@/payload-types'
import { watchedCalendars } from './config'

/** Ensures a google-calendars doc exists for every configured calendar and returns them. */
export async function ensureCalendarDocs(payload: Payload): Promise<GoogleCalendar[]> {
  const docs: GoogleCalendar[] = []
  for (const { calendarId, role } of watchedCalendars()) {
    const { docs: found } = await payload.find({
      collection: 'google-calendars',
      where: { calendarId: { equals: calendarId } },
      limit: 1,
    })
    docs.push(found[0] ?? (await payload.create({ collection: 'google-calendars', data: { calendarId, role } })))
  }
  return docs
}

export async function updateCalendarDoc(payload: Payload, id: number, data: Partial<GoogleCalendar>) {
  return payload.update({ collection: 'google-calendars', id, data })
}
