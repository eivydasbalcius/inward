import { APIError, type Payload } from 'payload'

import { isLocale } from '@/i18n/config'
import { loadSlotInput } from '../availability'
import { isOverlapViolation } from '../bookingGuard'
import { isSlotAvailable, toDateKey } from '../slots'

export type BookingRequest = {
  service: string // slug
  start: string // ISO
  name: string
  email: string
  phone?: string
  note?: string
  consent: boolean
  locale: string
}

export type BookingResult =
  | {
      ok: true
      booking: { id: number; start: string; end: string; serviceTitle: string; durationMin: number }
    }
  | { ok: false; error: 'invalid' | 'consent' | 'taken' | 'limit' | 'rate' | 'server' }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MAX_ACTIVE_PER_EMAIL = 3

/** Validates and creates a website booking (confirmed immediately while payments are off). */
export async function createWebsiteBooking(
  payload: Payload,
  input: BookingRequest,
): Promise<BookingResult> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const phone = input.phone?.trim().slice(0, 40) || undefined
  const note = input.note?.trim().slice(0, 2000) || undefined
  const start = new Date(input.start)
  if (
    !name ||
    name.length > 120 ||
    !EMAIL.test(email) ||
    Number.isNaN(start.getTime()) ||
    !input.service
  ) {
    return { ok: false, error: 'invalid' }
  }
  if (!input.consent) return { ok: false, error: 'consent' }

  const { docs } = await payload.find({
    collection: 'services',
    locale: isLocale(input.locale) ? input.locale : 'lt',
    where: { and: [{ slug: { equals: input.service } }, { published: { equals: true } }] },
    limit: 1,
    depth: 0,
  })
  const service = docs[0]
  if (!service) return { ok: false, error: 'invalid' }

  const active = await payload.count({
    collection: 'bookings',
    where: {
      and: [
        { clientEmail: { equals: email } },
        { status: { in: ['held', 'confirmed'] } },
        { start: { greater_than: new Date().toISOString() } },
      ],
    },
  })
  if (active.totalDocs >= MAX_ACTIVE_PER_EMAIL) return { ok: false, error: 'limit' }

  // Re-check against the live schedule (another client or a Google event may have taken it meanwhile)
  const day = toDateKey(start)
  const stillFree = async () =>
    isSlotAvailable(
      await loadSlotInput(payload, { durationMin: service.durationMin, from: day, to: day }),
      start,
    )
  if (!(await stillFree())) return { ok: false, error: 'taken' }

  for (let attempt = 0; ; attempt++) {
    try {
      const booking = await payload.create({
        collection: 'bookings',
        data: {
          service: service.id,
          start: start.toISOString(),
          status: 'confirmed',
          source: 'website',
          clientName: name,
          clientEmail: email,
          clientPhone: phone,
          clientNote: note,
          consentAt: new Date().toISOString(),
          locale: input.locale,
        },
      })
      return {
        ok: true,
        booking: {
          id: booking.id,
          start: booking.start,
          end: booking.end!,
          serviceTitle: service.title,
          durationMin: service.durationMin,
        },
      }
    } catch (err) {
      if (isOverlapViolation(err) || (err instanceof APIError && err.status === 409))
        return { ok: false, error: 'taken' }
      // Two clients racing for the same time can deadlock on the overlap constraint: whoever lost re-checks.
      if (isTransientConflict(err) && attempt < 2) {
        if (!(await stillFree())) return { ok: false, error: 'taken' }
        continue
      }
      payload.logger.error({ err }, 'createWebsiteBooking failed')
      return { ok: false, error: 'server' }
    }
  }
}

function isTransientConflict(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string }; message?: string }
  const code = e?.cause?.code ?? e?.code
  return (
    code === '40P01' ||
    code === '40001' ||
    /deadlock detected|could not serialize/.test(String(e?.message))
  )
}
