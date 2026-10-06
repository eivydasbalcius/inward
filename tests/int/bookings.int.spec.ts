import { sql } from '@payloadcms/db-postgres'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getSlots } from '@/lib/availability'
import { isOverlapViolation } from '@/lib/bookingGuard'
import config from '@/payload.config'
import { onePerDay } from '../helpers/freeSlots'

// Runs against the dev database and the admin's real schedule; everything created is removed in afterAll.
let payload: Payload
let serviceId: number
let durationMin: number
let day: string
let slot: string
const TAG = `bk-test-${Date.now()}@example.com`
const plus = (iso: string, min: number) =>
  new Date(new Date(iso).getTime() + min * 60_000).toISOString()

describe('bookings + slots', { timeout: 30_000 }, () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const { docs } = await payload.find({
      collection: 'services',
      where: { slug: { equals: 'pirmoji-konsultacija' } },
    })
    serviceId = docs[0].id
    durationMin = docs[0].durationMin
    ;[
      {
        date: day,
        slots: [slot],
      },
    ] = await onePerDay(payload, durationMin, 1)
  })

  afterAll(async () => {
    await payload.delete({ collection: 'bookings', where: { clientEmail: { equals: TAG } } })
    await payload.delete({ collection: 'busy-blocks', where: { calendarId: { equals: 'test' } } })
  })

  const book = (start: string) =>
    payload.create({
      collection: 'bookings',
      data: {
        service: serviceId,
        start,
        status: 'confirmed',
        clientName: 'Test',
        clientEmail: TAG,
      },
    })

  it('a confirmed booking removes its slot', async () => {
    const b = await book(slot)
    expect(new Date(b.end!).getTime() - new Date(slot).getTime()).toBe(durationMin * 60_000)
    const [after] = await getSlots(payload, { durationMin, from: day, to: day })
    expect(after.slots).not.toContain(slot)
  })

  it('rejects an overlapping booking with a friendly error', async () => {
    await expect(book(plus(slot, 10))).rejects.toThrow(/užimtas/)
  })

  it('database constraint blocks overlaps even when the app check is bypassed', async () => {
    const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }
    const err = await db.drizzle
      .execute(
        sql`insert into bookings (service_id, start, "end", status, client_name, client_email, updated_at, created_at)
            values (${serviceId}, ${plus(slot, 5)}, ${plus(slot, 25)}, 'confirmed', 'Raw', ${TAG}, now(), now())`,
      )
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(isOverlapViolation(err)).toBe(true)
  })

  it('cancelling frees the slot again', async () => {
    await payload.update({
      collection: 'bookings',
      where: { clientEmail: { equals: TAG } },
      data: { status: 'cancelled' },
    })
    const [d] = await getSlots(payload, { durationMin, from: day, to: day })
    expect(d.slots).toContain(slot)
  })

  it('busy time mirrored from Google blocks slots', async () => {
    await payload.create({
      collection: 'busy-blocks',
      data: { calendarId: 'test', eventId: `t-${Date.now()}`, start: slot, end: plus(slot, 20) },
    })
    const [d] = await getSlots(payload, { durationMin, from: day, to: day })
    expect(d.slots).not.toContain(slot)
  })
})
