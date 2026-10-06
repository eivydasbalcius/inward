import type { Metadata } from 'next'

import { CtaBand } from '@/components/CtaBand'
import { PageHeader } from '@/components/PageHeader'
import { ServiceCard } from '@/components/ServiceCard'
import { getServices, resolveLocale } from '@/lib/content'
import { localeAlternates } from '@/lib/seo'

export async function generateMetadata(props: PageProps<'/[locale]/services'>): Promise<Metadata> {
  const { locale, t } = await resolveLocale(props.params)
  return { title: t.nav.services, alternates: localeAlternates(locale, '/services') }
}

export default async function ServicesPage(props: PageProps<'/[locale]/services'>) {
  const { locale, t } = await resolveLocale(props.params)
  const services = await getServices(locale)

  return (
    <>
      <PageHeader title={t.nav.services} />
      <section className="section">
        <div className="cards">
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} locale={locale} t={t} />
          ))}
        </div>
      </section>
      <CtaBand locale={locale} t={t} />
    </>
  )
}
