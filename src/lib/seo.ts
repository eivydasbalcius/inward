import type { Metadata } from 'next'

import { locales, type Locale } from '@/i18n/config'

/** Canonical + hreflang for a path that exists in every locale (path without locale prefix, e.g. "/about"). */
export function localeAlternates(locale: Locale, path = ''): Metadata['alternates'] {
  return {
    canonical: `/${locale}${path}`,
    languages: Object.fromEntries([
      ...locales.map((l) => [l, `/${l}${path}`]),
      ['x-default', `/lt${path}`],
    ]),
  }
}
