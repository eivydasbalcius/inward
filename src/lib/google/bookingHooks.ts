import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { Booking } from '@/payload-types'
import { isGoogleConfigured } from './config'
import { deleteBookingEvent, pushBookingToGoogle } from './events'

// Holds are not pushed (they are short-lived); confirmed → upsert, cancelled/expired → remove.
// The Google call runs after the save has committed (outside the DB transaction), so a slow or failing
// Google API never holds booking locks. If it can't run, the googleRetryBookings job picks it up.
export const onBookingChange: CollectionAfterChangeHook<Booking> = async ({ doc, req }) => {
  if (req.context?.fromGoogleSync || !(await isGoogleConfigured(req.payload))) return doc
  if (doc.status === 'held' && !doc.googleEventId) return doc
  const { payload } = req
  setTimeout(() => {
    payload
      .findByID({ collection: 'bookings', id: doc.id, depth: 1, disableErrors: true })
      .then((fresh) => fresh && pushBookingToGoogle(payload, fresh))
      .catch((err) => payload.logger.error({ err, bookingId: doc.id }, 'Google: deferred push failed'))
  }, 250)
  return doc
}

export const onBookingDelete: CollectionAfterDeleteHook<Booking> = async ({ doc, req }) => {
  if (!doc.googleEventId || !(await isGoogleConfigured(req.payload))) return doc
  try {
    await deleteBookingEvent(req.payload, doc.googleEventId)
  } catch (err) {
    req.payload.logger.error({ err, bookingId: doc.id }, 'Google: failed to delete event of deleted booking')
  }
  return doc
}
