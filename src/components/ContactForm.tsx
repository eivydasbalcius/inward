'use client'

import { useActionState } from 'react'

import { submitInquiry, type ContactState } from '@/app/(frontend)/actions'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'

export function ContactForm({ locale, t }: { locale: Locale; t: Dictionary['contact'] }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitInquiry, { status: 'idle' })

  if (state.status === 'success') {
    return (
      <p className="form-success" role="status">
        {t.success}
      </p>
    )
  }

  return (
    <form action={action} className="contact-form">
      <input type="hidden" name="locale" value={locale} />
      <div className="hp" aria-hidden="true">
        <label>
          Company <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label>
        {t.name}
        <input name="name" required maxLength={120} autoComplete="name" />
      </label>
      <label>
        {t.email}
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        {t.phone}
        <input name="phone" type="tel" autoComplete="tel" />
      </label>
      <label>
        {t.message}
        <textarea name="message" required minLength={5} maxLength={5000} rows={6} />
      </label>
      {state.status === 'error' && (
        <p className="form-error" role="alert">
          {t.error}
        </p>
      )}
      <p className="muted small">{t.consent}</p>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? t.sending : t.send}
      </button>
    </form>
  )
}
