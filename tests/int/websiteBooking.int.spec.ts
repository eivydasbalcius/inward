import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createWebsiteBooking,
  MAX_ACTIVE_PER_EMAIL,
  type BookingRequest,
} from '@/lib/booking/create'
import config from '@/payload.config'
import { onePerDay } from '../helpers/freeSlots'

// Runs against the dev database; every booking made here is deleted in afterAll.
let payload: Payload
const EMAIL = `web-test-${Date.now()}@example.com`
const SERVICE = 'pirmoji-konsultacija'
let free: string[] = []

const req = (over: Partial<BookingRequest> = {}): BookingRequest => ({
  service: SERVICE,
  start: free[0],
  name: 'Web Test',
  email: EMAIL,
  consent: true,
  locale: 'lt',
  ...over,
})

describe('website booking', { timeout: 30_000 }, () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const { docs } = await payload.find({
      collection: 'services',
      where: { slug: { equals: SERVICE } },
    })
    // one free slot per day from the admin's current schedule, so tests never depend on specific hours
    free = (await onePerDay(payload, docs[0].durationMin, MAX_ACTIVE_PER_EMAIL + 3)).map(
      (d) => d.slots[0],
    )
  })

  afterAll(async () => {
    await payload.delete({ collection: 'bookings', where: { clientEmail: { equals: EMAIL } } })
    await payload.delete({
      collection: 'bookings',
      where: { clientEmail: { like: 'race-%@example.com' } },
    })
  })

  it('rejects missing consent and invalid input', async () => {
    expect(await createWebsiteBooking(payload, req({ consent: false }))).toEqual({
      ok: false,
      error: 'consent',
    })
    expect(await createWebsiteBooking(payload, req({ email: 'nope' }))).toEqual({
      ok: false,
      error: 'invalid',
    })
    expect(await createWebsiteBooking(payload, req({ service: 'missing' }))).toEqual({
      ok: false,
      error: 'invalid',
    })
    // a start time that is not on the slot grid
    const offGrid = new Date(new Date(free[0]).getTime() + 7 * 60_000).toISOString()
    expect(await createWebsiteBooking(payload, req({ start: offGrid }))).toEqual({
      ok: false,
      error: 'taken',
    })
  })

  it('books a free slot as confirmed website booking', async () => {
    const res = await createWebsiteBooking(
      payload,
      req({ phone: '+37060000000', note: 'Pirmas kartas' }),
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const b = await payload.findByID({ collection: 'bookings', id: res.booking.id })
    expect(b).toMatchObject({
      status: 'confirmed',
      source: 'website',
      clientEmail: EMAIL,
      clientNote: 'Pirmas kartas',
    })
    expect(b.consentAt).toBeTruthy()
  })

  it('the same slot cannot be booked twice, even concurrently', async () => {
    expect(await createWebsiteBooking(payload, req())).toEqual({ ok: false, error: 'taken' })

    const results = await Promise.all(
      [1, 2, 3].map((n) =>
        createWebsiteBooking(
          payload,
          req({ start: free[1], email: `race-${n}-${Date.now()}@example.com` }),
        ),
      ),
    )
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.filter((r) => !r.ok && r.error === 'taken')).toHaveLength(2)
  })

  it(`limits one email to ${MAX_ACTIVE_PER_EMAIL} upcoming bookings`, async () => {
    // EMAIL already holds 1 booking (free[0])
    for (let i = 2; i < 2 + MAX_ACTIVE_PER_EMAIL - 1; i++) {
      expect((await createWebsiteBooking(payload, req({ start: free[i] }))).ok).toBe(true)
    }
    const extra = await createWebsiteBooking(
      payload,
      req({ start: free[2 + MAX_ACTIVE_PER_EMAIL - 1] }),
    )
    expect(extra).toEqual({ ok: false, error: 'limit' })
  })
})
