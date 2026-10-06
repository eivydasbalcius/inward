import Image from 'next/image'
import Link from 'next/link'

import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import { bookHref } from '@/lib/content'
import { MobileMenu } from './MobileMenu'

export function Header({ locale, t }: { locale: Locale; t: Dictionary }) {
  const other: Locale = locale === 'lt' ? 'en' : 'lt'
  const links = [
    { href: `/${locale}/about`, label: t.nav.about },
    { href: `/${locale}/services`, label: t.nav.services },
    { href: `/${locale}/prices`, label: t.nav.prices },
    { href: `/${locale}/blog`, label: t.nav.blog },
    { href: `/${locale}/contact`, label: t.nav.contacts },
  ]
  const localeLink = (
    <Link href={`/${other}`} hrefLang={other} lang={other} className="locale-switch">
      {t.switchLocale}
    </Link>
  )
  const cta = (
    <Link href={bookHref(locale)} className="btn btn-primary">
      {t.nav.book}
    </Link>
  )

  return (
    <header className="site-header">
      <Link href={`/${locale}`} className="site-logo" aria-label="Inward – pradžia">
        <Image src="/brand/inward-logo.png" alt="Inward" width={389} height={228} priority />
      </Link>
      <nav className="site-nav" aria-label="Main">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
        {localeLink}
        {cta}
      </nav>
      <MobileMenu label={t.nav.menu}>
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
        {localeLink}
        {cta}
      </MobileMenu>
    </header>
  )
}
