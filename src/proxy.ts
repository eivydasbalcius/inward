import { NextResponse, type NextRequest } from 'next/server'

import { defaultLocale, isLocale } from './i18n/config'

// Prefix every public route with a locale; admin, API and static files are left alone.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const first = pathname.split('/')[1] ?? ''
  if (isLocale(first)) return NextResponse.next()

  const preferred = request.headers.get('accept-language')?.toLowerCase().startsWith('en')
    ? 'en'
    : defaultLocale
  const url = request.nextUrl.clone()
  url.pathname = `/${preferred}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!admin|api|_next|brand|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml).*)'],
}
