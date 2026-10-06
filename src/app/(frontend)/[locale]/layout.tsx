import type { Metadata } from 'next'
import { Figtree, Instrument_Serif } from 'next/font/google'
import React from 'react'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { RevealObserver } from '@/components/Reveal'
import { locales } from '@/i18n/config'
import { getSettings, resolveLocale, siteUrl } from '@/lib/content'
import '../styles.css'

const display = Instrument_Serif({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
})
const body = Figtree({ subsets: ['latin', 'latin-ext'], variable: '--font-body' })

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata(props: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale, t } = await resolveLocale(props.params)
  return {
    metadataBase: new URL(siteUrl),
    title: { default: t.meta.title, template: `%s · Inward` },
    description: t.meta.description,
    openGraph: {
      siteName: 'Inward',
      locale: locale === 'lt' ? 'lt_LT' : 'en_GB',
      type: 'website',
      images: ['/brand/inward-logo.jpg'],
    },
  }
}

export default async function LocaleLayout(props: LayoutProps<'/[locale]'>) {
  const { locale, t } = await resolveLocale(props.params)
  const settings = await getSettings(locale)

  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* Scroll reveals only hide content once JS is known to run */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          {locale === 'lt' ? 'Pereiti prie turinio' : 'Skip to content'}
        </a>
        <Header locale={locale} t={t} />
        <main id="main">{props.children}</main>
        <Footer locale={locale} t={t} settings={settings} />
        <RevealObserver />
      </body>
    </html>
  )
}
