'use server'

import { headers } from 'next/headers'

import { createWebsiteBooking, type BookingResult } from '@/lib/booking/create'
import { payloadClient } from '@/lib/content'

// Simple per-IP throttle (single server). Enough to stop casual abuse of the public form.
const WINDOW_MS = 10 * 60_000
const MAX_PER_WINDOW = 5
const hits = new Map<string, number[]>()

function throttled(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > MAX_PER_WINDOW
}

export async function bookSession(formData: FormData): Promise<BookingResult> {
  if (String(formData.get('company') ?? '')) return { ok: false, error: 'invalid' } // honeypot

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local'
  if (throttled(ip)) return { ok: false, error: 'rate' }

  const payload = await payloadClient()
  return createWebsiteBooking(payload, {
    service: String(formData.get('service') ?? ''),
    start: String(formData.get('start') ?? ''),
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    note: String(formData.get('note') ?? ''),
    consent: formData.get('consent') === 'on',
    locale: String(formData.get('locale') ?? 'lt'),
  })
}
