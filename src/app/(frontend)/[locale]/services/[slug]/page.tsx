import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHeader } from '@/components/PageHeader'
import { RichText } from '@/components/RichText'
import { ServiceMeta } from '@/components/ServiceMeta'
import { bookHref, formatPrice, getService, resolveLocale } from '@/lib/content'
import { localeAlternates } from '@/lib/seo'

export async function generateMetadata(props: PageProps<'/[locale]/services/[slug]'>): Promise<Metadata> {
  const { locale } = await resolveLocale(props.params)
  const { slug } = await props.params
  const service = await getService(locale, slug)
  if (!service) return {}
  return {
    title: service.title,
    description: service.summary,
    alternates: localeAlternates(locale, `/services/${slug}`),
  }
}

export default async function ServicePage(props: PageProps<'/[locale]/services/[slug]'>) {
  const { locale, t } = await resolveLocale(props.params)
  const { slug } = await props.params
  const service = await getService(locale, slug)
  if (!service) notFound()

  return (
    <article>
      <PageHeader eyebrow={t.service.format[service.format]} title={service.title} lead={service.summary} />
      <div className="section service-layout">
        <div>
          <RichText data={service.body} />
          {!!service.whoFor?.length && (
            <>
              <h2 className="h3">{t.service.whoFor}</h2>
              <ul className="ticks">
                {service.whoFor.map((i) => (
                  <li key={i.id}>{i.text}</li>
                ))}
              </ul>
            </>
          )}
          {!!service.notFor?.length && (
            <>
              <h2 className="h3">{t.service.notFor}</h2>
              <ul className="crosses">
                {service.notFor.map((i) => (
                  <li key={i.id}>{i.text}</li>
                ))}
              </ul>
            </>
          )}
          {service.supplies && (
            <>
              <h2 className="h3">{t.service.supplies}</h2>
              <p>{service.supplies}</p>
            </>
          )}
        </div>
        <aside className="card booking-card">
          <p className="price big">{formatPrice(service.priceEur, locale)}</p>
          <ServiceMeta service={service} t={t} />
          <Link href={`${bookHref(locale)}?service=${service.slug}`} className="btn btn-primary block">
            {t.service.book}
          </Link>
        </aside>
      </div>
    </article>
  )
}
