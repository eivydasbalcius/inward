import Link from 'next/link'

import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import { formatPrice } from '@/lib/content'
import type { Service } from '@/payload-types'
import { ServiceMeta } from './ServiceMeta'

export function ServiceCard({ service, locale, t }: { service: Service; locale: Locale; t: Dictionary }) {
  return (
    <article className="card service-card" data-reveal>
      <p className="card-kicker">{t.service.format[service.format]}</p>
      <h3>
        <Link href={`/${locale}/services/${service.slug}`}>{service.title}</Link>
      </h3>
      <p>{service.summary}</p>
      <ServiceMeta service={service} t={t} />
      <div className="card-foot">
        <span className="price">{formatPrice(service.priceEur, locale)}</span>
        <Link href={`/${locale}/services/${service.slug}`} className="link-arrow">
          {t.service.details} →
        </Link>
      </div>
    </article>
  )
}
