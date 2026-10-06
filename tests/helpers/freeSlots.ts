import type { Payload } from 'payload'

import { getSlots } from '@/lib/availability'
import { toDateKey } from '@/lib/slots'

/**
 * Free slots from the *current* admin schedule (tests must not depend on specific working hours).
 * Returns at most one slot per day, starting `fromDays` ahead, so bookings in tests never interfere via buffers.
 */
export async function onePerDay(
  payload: Payload,
  durationMin: number,
  count: number,
  fromDays = 14,
) {
  const start = new Date(Date.now() + fromDays * 86_400_000)
  const from = toDateKey(start)
  const to = toDateKey(new Date(start.getTime() + 30 * 86_400_000))
  const days = await getSlots(payload, { durationMin, from, to })
  const picked = days.filter((d) => d.slots.length).map((d) => ({ date: d.date, slots: d.slots }))
  if (picked.length < count)
    throw new Error(`Need ${count} days with free slots, schedule only has ${picked.length}`)
  return picked.slice(0, count)
}
