'use client'

import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react'

import { bookSession } from '@/app/(frontend)/[locale]/book/actions'
import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import type { BookingResult } from '@/lib/booking/create'
import type { ServiceOption } from './BookingCalendar'
import { googleCalendarUrl } from './dates'

export type Selection = { start: string; anchorRect: DOMRect }

const DIALOG_W = 400

/**
 * Google-Calendar-style event card: anchored beside the chosen block on desktop,
 * a bottom sheet on phones. Native <dialog> gives Esc, focus trapping and inert background.
 */
export function BookingDialog({
  locale,
  t,
  service,
  color,
  selection,
  end,
  range,
  dateLabel,
  privacyHref,
  location,
  onClose,
  onTaken,
}: {
  locale: Locale
  t: Dictionary['book']
  service: ServiceOption
  color: string
  selection: Selection
  end: string
  range: string
  dateLabel: string
  privacyHref: string
  location?: string
  onClose: (booked: boolean) => void
  onTaken: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<BookingResult | null>(null)
  const booked = result?.ok === true

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    const onCancel = (e: Event) => {
      e.preventDefault()
      onClose(booked)
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose, booked])

  // Anchor next to the chosen block (desktop); CSS turns it into a bottom sheet on phones.
  useLayoutEffect(() => {
    const dialog = ref.current
    if (!dialog || matchMedia('(max-width: 639px)').matches) return
    const r = selection.anchorRect
    const h = dialog.offsetHeight
    const fitsRight = r.right + 16 + DIALOG_W < innerWidth - 16
    const left = fitsRight ? r.right + 16 : Math.max(16, r.left - 16 - DIALOG_W)
    const top = Math.min(Math.max(16, r.top - 60), Math.max(16, innerHeight - h - 16))
    dialog.style.left = `${left}px`
    dialog.style.top = `${top}px`
  }, [selection, result])

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const res = await bookSession(formData)
      setResult(res)
      if (!res.ok && res.error === 'taken') setTimeout(onTaken, 2200)
    })
  }

  const error = result && !result.ok ? t.errors[result.error] : null

  return (
    <dialog
      ref={ref}
      className="event-dialog"
      aria-labelledby="event-title"
      style={{ '--svc': color } as React.CSSProperties}
      onClick={(e) => {
        if (e.target === ref.current) onClose(booked) // click on backdrop
      }}
    >
      <div className="event-bar">
        <button type="button" className="icon-btn" aria-label={t.close} onClick={() => onClose(booked)}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div className="event-summary">
        <span className="event-swatch" aria-hidden="true" />
        <div>
          <h3 id="event-title">{booked ? t.doneTitle : service.title}</h3>
          <p>
            {dateLabel} · {range}
          </p>
          <p className="muted">
            {booked ? service.title + ' · ' : ''}
            {service.durationMin} {t.minutes} · {service.price}
          </p>
        </div>
      </div>

      {booked ? (
        <div className="event-done">
          <div className="done-mark" aria-hidden="true">
            <svg viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="24" />
              <path d="M15 27l7 7 15-16" />
            </svg>
          </div>
          <p>{t.doneText}</p>
          <a
            className="btn btn-ghost block gcal-add"
            href={googleCalendarUrl({
              start: selection.start,
              end,
              title: `Inward – ${service.title}`,
              details: `${service.title} · ${service.durationMin} ${t.minutes}`,
              location,
            })}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V9h14v11Zm-7-9h2v3h3v2h-3v3h-2v-3H9v-2h3v-3Z"
              />
            </svg>
            {t.addToCalendar}
          </a>
          <button type="button" className="btn btn-primary block" onClick={() => onClose(true)}>
            {t.another}
          </button>
        </div>
      ) : (
        <form action={submit} className="event-form">
          <input type="hidden" name="service" value={service.slug} />
          <input type="hidden" name="start" value={selection.start} />
          <input type="hidden" name="locale" value={locale} />
          <div className="hp" aria-hidden="true">
            <label>
              Company <input name="company" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <label className="field">
            {t.name}
            <input name="name" required maxLength={120} autoComplete="name" autoFocus />
          </label>
          <label className="field">
            {t.email}
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label className="field">
            {t.phone}
            <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
          </label>
          <label className="field">
            {t.note}
            <textarea name="note" rows={2} maxLength={2000} />
          </label>
          <label className="consent">
            <input type="checkbox" name="consent" required />
            <span>
              {t.consentBefore}
              <Link href={privacyHref} target="_blank">
                {t.consentLink}
              </Link>
              .
            </span>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary block" disabled={pending}>
            {pending ? t.submitting : t.submit}
          </button>
        </form>
      )}
    </dialog>
  )
}
