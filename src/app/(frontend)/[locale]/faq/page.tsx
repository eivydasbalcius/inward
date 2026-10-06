import type { Metadata } from 'next'

import { FaqList } from '@/components/FaqList'
import { JsonLd } from '@/components/JsonLd'
import { PageHeader } from '@/components/PageHeader'
import { getFaqs, resolveLocale } from '@/lib/content'
import { localeAlternates } from '@/lib/seo'

export async function generateMetadata(props: PageProps<'/[locale]/faq'>): Promise<Metadata> {
  const { locale, t } = await resolveLocale(props.params)
  return { title: t.faq.title, alternates: localeAlternates(locale, '/faq') }
}

export default async function FaqPage(props: PageProps<'/[locale]/faq'>) {
  const { locale, t } = await resolveLocale(props.params)
  const faqs = await getFaqs(locale)

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
          })),
        }}
      />
      <PageHeader title={t.faq.title} />
      <section className="section narrow">
        <FaqList faqs={faqs} />
      </section>
    </>
  )
}
