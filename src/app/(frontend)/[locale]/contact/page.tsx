import type { Metadata } from 'next'

import { ContactForm } from '@/components/ContactForm'
import { PageHeader } from '@/components/PageHeader'
import { getSettings, resolveLocale } from '@/lib/content'
import { localeAlternates } from '@/lib/seo'

export async function generateMetadata(props: PageProps<'/[locale]/contact'>): Promise<Metadata> {
  const { locale, t } = await resolveLocale(props.params)
  return { title: t.contact.title, description: t.contact.lead, alternates: localeAlternates(locale, '/contact') }
}

export default async function ContactPage(props: PageProps<'/[locale]/contact'>) {
  const { locale, t } = await resolveLocale(props.params)
  const settings = await getSettings(locale)

  return (
    <>
      <PageHeader title={t.contact.title} lead={t.contact.lead} />
      <section className="section contact-layout">
        <div className="contact-details">
          <p>
            <span className="footer-label">{t.contact.email}</span>
            <a href={`mailto:${settings.email}`}>{settings.email}</a>
          </p>
          {settings.phone && (
            <p>
              <span className="footer-label">{t.contact.phoneLabel}</span>
              <a href={`tel:${settings.phone.replace(/\s/g, '')}`}>{settings.phone}</a>
            </p>
          )}
          {settings.address && (
            <p>
              <span className="footer-label">{t.contact.address}</span>
              {settings.mapUrl ? (
                <a href={settings.mapUrl} target="_blank" rel="noopener noreferrer">
                  {settings.address}
                </a>
              ) : (
                settings.address
              )}
            </p>
          )}
        </div>
        <ContactForm locale={locale} t={t.contact} />
      </section>
    </>
  )
}
