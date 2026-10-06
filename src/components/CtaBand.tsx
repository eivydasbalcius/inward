import Link from 'next/link'

import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import { bookHref } from '@/lib/content'

export function CtaBand({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <section className="cta-band" data-reveal>
      <h2>{t.home.ctaTitle}</h2>
      <p>{t.home.ctaText}</p>
      <Link href={bookHref(locale)} className="btn btn-primary btn-lg">
        {t.home.cta}
      </Link>
    </section>
  )
}
