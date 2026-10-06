'use server'

import { isLocale } from '@/i18n/config'
import { payloadClient } from '@/lib/content'

export type ContactState = { status: 'idle' | 'success' | 'error' }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function submitInquiry(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: real users never fill this hidden field; pretend success for bots.
  if (String(formData.get('company') ?? '')) return { status: 'success' }

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim()
  const locale = String(formData.get('locale') ?? 'lt')

  if (!name || name.length > 120 || !EMAIL.test(email) || message.length < 5 || message.length > 5000) {
    return { status: 'error' }
  }

  try {
    const payload = await payloadClient()
    await payload.create({
      collection: 'inquiries',
      data: { name, email, phone: phone || undefined, message, locale: isLocale(locale) ? locale : 'lt' },
    })
    return { status: 'success' }
  } catch (err) {
    console.error('submitInquiry failed', err)
    return { status: 'error' }
  }
}
