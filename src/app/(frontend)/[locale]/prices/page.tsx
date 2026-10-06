import type { Metadata } from 'next'
import Link from 'next/link'

import { CtaBand } from '@/components/CtaBand'
import { PageHeader } from '@/components/PageHeader'
import { formatPrice, getServices, getSettings, resolveLocale } from '@/lib/content'
import { localeAlternates } from '@/lib/seo'

export async function generateMetadata(props: PageProps<'/[locale]/prices'>): Promise<Metadata> {
  const { locale, t } = await resolveLocale(props.params)
  return { title: t.prices.title, description: t.prices.lead, alternates: localeAlternates(locale, '/prices') }
}

export default async function PricesPage(props: PageProps<'/[locale]/prices'>) {
  const { locale, t } = await resolveLocale(props.params)
  const [services, settings] = await Promise.all([getServices(locale), getSettings(locale)])

  return (
    <>
      <PageHeader title={t.prices.title} lead={t.prices.lead} />
      <section className="section narrow">
        <table className="price-table">
          <thead>
            <tr>
              <th scope="col">{t.prices.service}</th>
              <th scope="col">{t.prices.duration}</th>
              <th scope="col">{t.prices.price}</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <th scope="row">
                  <Link href={`/${locale}/services/${s.slug}`}>{s.title}</Link>
                  <span className="muted small"> · {t.service.format[s.format]}</span>
                </th>
                <td>
                  {s.durationMin} {t.service.minutes}
                  {s.sessionsCount && s.sessionsCount > 1 ? ` × ${s.sessionsCount}` : ''}
                </td>
                <td className="price">{formatPrice(s.priceEur, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {settings.cancellationPolicy && (
          <div className="card note">
            <h2 className="h3">{t.prices.cancellation}</h2>
            <p>{settings.cancellationPolicy}</p>
          </div>
        )}
      </section>
      <CtaBand locale={locale} t={t} />
    </>
  )
}
