import Link from 'next/link'

import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import type { SiteSetting } from '@/payload-types'

export function Footer({ locale, t, settings }: { locale: Locale; t: Dictionary; settings: SiteSetting }) {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <p className="footer-brand">Inward</p>
          <p className="muted">{t.home.eyebrow}</p>
        </div>
        <div>
          <p className="footer-label">{t.nav.contacts}</p>
          <p>
            <a href={`mailto:${settings.email}`}>{settings.email}</a>
            {settings.phone && (
              <>
                <br />
                <a href={`tel:${settings.phone.replace(/\s/g, '')}`}>{settings.phone}</a>
              </>
            )}
            {settings.address && (
              <>
                <br />
                {settings.address}
              </>
            )}
          </p>
        </div>
        <div>
          <p className="footer-label">Inward</p>
          <p className="footer-links">
            <Link href={`/${locale}/services`}>{t.nav.services}</Link>
            <Link href={`/${locale}/prices`}>{t.nav.prices}</Link>
            <Link href={`/${locale}/faq`}>{t.nav.faq}</Link>
            <Link href={`/${locale}/privacy`}>{t.footer.privacy}</Link>
          </p>
        </div>
        {!!settings.socials?.length && (
          <div>
            <p className="footer-label">{t.footer.follow}</p>
            <p className="footer-links">
              {settings.socials.map((s) => (
                <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.network.charAt(0).toUpperCase() + s.network.slice(1)}
                </a>
              ))}
            </p>
          </div>
        )}
      </div>
      <p className="footer-bottom">
        © {new Date().getFullYear()} Inward. {t.footer.rights}
      </p>
    </footer>
  )
}
