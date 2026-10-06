import type { Payload } from 'payload'

import type { Availability } from '@/payload-types'
import { WEEKDAYS } from '../globals/Availability'
import {
  computeSlots,
  dayBounds,
  toDateKey,
  type AvailabilityException,
  type BookingLike,
  type SlotInput,
  type WeeklySchedule,
} from './slots'

const DAY = 86_400_000

function weeklySchedule(a: Availability): WeeklySchedule {
  const schedule: WeeklySchedule = {}
  for (const d of WEEKDAYS) {
    const ranges = (a[d.key] ?? []).map((r) => ({ from: r.from, to: r.to }))
    if (ranges.length) schedule[d.iso] = ranges
  }
  return schedule
}

/** Everything computeSlots needs for a date window, loaded from the DB (no Google calls). */
export async function loadSlotInput(
  payload: Payload,
  opts: { durationMin: number; from: string; to: string; now?: Date; excludeBookingId?: number },
): Promise<SlotInput> {
  const now = opts.now ?? new Date()
  const availability = await payload.findGlobal({ slug: 'availability', depth: 0 })
  const windowStart = new Date(dayBounds(opts.from).start.getTime() - DAY).toISOString()
  const windowEnd = new Date(dayBounds(opts.to).end.getTime() + DAY).toISOString()

  const [exceptions, busy, bookings] = await Promise.all([
    payload.find({
      collection: 'availability-exceptions',
      where: { and: [{ dateFrom: { less_than_equal: windowEnd } }, { dateTo: { greater_than_equal: windowStart } }] },
      sort: 'createdAt',
      limit: 500,
      depth: 0,
    }),
    payload.find({
      collection: 'busy-blocks',
      where: { and: [{ start: { less_than: windowEnd } }, { end: { greater_than: windowStart } }] },
      limit: 5000,
      depth: 0,
    }),
    payload.find({
      collection: 'bookings',
      where: {
        and: [
          { status: { in: ['held', 'confirmed'] } },
          { start: { less_than: windowEnd } },
          { end: { greater_than: windowStart } },
          ...(opts.excludeBookingId ? [{ id: { not_equals: opts.excludeBookingId } }] : []),
        ],
      },
      limit: 5000,
      depth: 0,
    }),
  ])

  return {
    schedule: weeklySchedule(availability),
    exceptions: exceptions.docs.map<AvailabilityException>((e) => ({
      dateFrom: toDateKey(new Date(e.dateFrom)),
      dateTo: toDateKey(new Date(e.dateTo)),
      type: e.type,
      ranges: (e.ranges ?? []).map((r) => ({ from: r.from, to: r.to })),
    })),
    busy: busy.docs.map((b) => ({ start: new Date(b.start), end: new Date(b.end) })),
    bookings: bookings.docs.map<BookingLike>((b) => ({
      start: new Date(b.start),
      end: new Date(b.end!),
      status: b.status as BookingLike['status'],
      holdExpiresAt: b.holdExpiresAt ? new Date(b.holdExpiresAt) : null,
    })),
    durationMin: opts.durationMin,
    bufferMin: availability.bufferMin ?? 15,
    stepMin: availability.slotStepMin ?? 30,
    minNoticeHours: availability.minNoticeHours ?? 24,
    horizonDays: availability.horizonDays ?? 60,
    now,
    from: opts.from,
    to: opts.to,
  }
}

export async function getSlots(payload: Payload, opts: Parameters<typeof loadSlotInput>[1]) {
  return computeSlots(await loadSlotInput(payload, opts))
}
