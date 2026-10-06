import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BookingCalendar } from '@/components/booking/BookingCalendar'
import { PageHeader } from '@/components/PageHeader'
import { bookingEnabled, formatPrice, getServices, getSettings, resolveLocale } from '@/lib/content'
import { localeAlternates } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/[locale]/book'>): Promise<Metadata> {
  const { locale, t } = await resolveLocale(props.params)
  return { title: t.book.title, description: t.book.lead, alternates: localeAlternates(locale, '/book') }
}

export default async function BookPage(props: PageProps<'/[locale]/book'>) {
  const { locale, t } = await resolveLocale(props.params)
  if (!bookingEnabled) notFound()
  const { service } = await props.searchParams
  const [services, settings] = await Promise.all([getServices(locale), getSettings(locale)])

  return (
    <>
      <PageHeader title={t.book.title} lead={t.book.lead} />
      <section className="section book-section">
        <BookingCalendar
          locale={locale}
          t={t.book}
          initialService={typeof service === 'string' ? service : undefined}
          privacyHref={`/${locale}/privacy`}
          location={settings.address ?? undefined}
          services={services.map((s) => ({
            slug: s.slug!,
            title: s.title,
            durationMin: s.durationMin,
            price: formatPrice(s.priceEur, locale),
          }))}
        />
      </section>
    </>
  )
}
