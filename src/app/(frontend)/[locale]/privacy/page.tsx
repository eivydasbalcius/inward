import type { Metadata } from 'next'

import { PageHeader } from '@/components/PageHeader'
import { RichText } from '@/components/RichText'
import { getSettings, resolveLocale } from '@/lib/content'
import { localeAlternates } from '@/lib/seo'

export async function generateMetadata(props: PageProps<'/[locale]/privacy'>): Promise<Metadata> {
  const { locale, t } = await resolveLocale(props.params)
  return { title: t.privacy.title, alternates: localeAlternates(locale, '/privacy') }
}

export default async function PrivacyPage(props: PageProps<'/[locale]/privacy'>) {
  const { locale, t } = await resolveLocale(props.params)
  const settings = await getSettings(locale)

  return (
    <>
      <PageHeader title={t.privacy.title} />
      <section className="section narrow">
        <RichText data={settings.privacyPolicy} />
      </section>
    </>
  )
}
