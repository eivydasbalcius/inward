import type { Payload, PayloadRequest } from 'payload'

import type { Booking, Service } from '@/payload-types'
import { STUDIO_TZ } from '../slots'
import { getCalendar, googleMessage, googleStatus, markConnectionBroken } from './client'
import { bookingsCalendarId, publicUrl } from './config'

/** Deterministic Google event id (base32hex: a–v, 0–9), so retries never create duplicates. */
export const bookingEventId = (bookingId: number | string) => `booking${bookingId}`

function eventBody(booking: Booking, service: Service | null) {
  const admin = publicUrl() ? `${publicUrl()}/admin/collections/bookings/${booking.id}` : ''
  return {
    summary: `${service?.title ?? 'Sesija'} – ${booking.clientName}`,
    description: [`Klientas: ${booking.clientName} <${booking.clientEmail}>`, admin && `Administravimas: ${admin}`]
      .filter(Boolean)
      .join('\n'),
    start: { dateTime: new Date(booking.start).toISOString(), timeZone: STUDIO_TZ },
    end: { dateTime: new Date(booking.end!).toISOString(), timeZone: STUDIO_TZ },
    status: 'confirmed',
    transparency: 'opaque',
    extendedProperties: { private: { inwardBookingId: String(booking.id) } },
  }
}

async function upsertEvent(payload: Payload, booking: Booking, service: Service | null) {
  const cal = await getCalendar(payload)
  const calendarId = bookingsCalendarId()
  const eventId = bookingEventId(booking.id)
  const requestBody = eventBody(booking, service)
  try {
    await cal.events.update({ calendarId, eventId, requestBody })
  } catch (err) {
    if (googleStatus(err) !== 404) throw err
    await cal.events.insert({ calendarId, requestBody: { ...requestBody, id: eventId } })
  }
  return eventId
}

export async function deleteBookingEvent(payload: Payload, eventId: string) {
  try {
    await (await getCalendar(payload)).events.delete({ calendarId: bookingsCalendarId(), eventId })
  } catch (err) {
    const status = googleStatus(err)
    if (status !== 404 && status !== 410) throw err
  }
}

/** Mirrors one booking to the "Inward sesijos" calendar and records the result on the booking. */
export async function pushBookingToGoogle(payload: Payload, booking: Booking, req?: PayloadRequest) {
  const context = { fromGoogleSync: true }
  try {
    let googleEventId = booking.googleEventId ?? null
    if (booking.status === 'confirmed') {
      const service =
        typeof booking.service === 'object'
          ? booking.service
          : await payload.findByID({ collection: 'services', id: booking.service, depth: 0, req })
      googleEventId = await upsertEvent(payload, booking, service)
    } else if (booking.googleEventId) {
      await deleteBookingEvent(payload, booking.googleEventId)
    }
    await payload.update({
      collection: 'bookings',
      id: booking.id,
      data: { googleEventId, googleSyncState: 'ok', googleError: null },
      context,
      req,
    })
  } catch (err) {
    payload.logger.error({ err, bookingId: booking.id }, 'Google: failed to push booking')
    await markConnectionBroken(payload, err)
    await payload.update({
      collection: 'bookings',
      id: booking.id,
      data: { googleSyncState: 'error', googleError: googleMessage(err) },
      context,
      req,
    })
  }
}

/** Pushes bookings whose Google copy is missing or failed (after connecting, and every 5 min). */
export async function retryPendingBookings(payload: Payload) {
  const { docs } = await payload.find({
    collection: 'bookings',
    where: {
      and: [
        { googleSyncState: { in: ['pending', 'error'] } },
        { status: { in: ['confirmed', 'cancelled', 'expired'] } },
        { end: { greater_than: new Date().toISOString() } },
      ],
    },
    limit: 50,
    depth: 1,
  })
  for (const b of docs) await pushBookingToGoogle(payload, b)
  return docs.length
}
