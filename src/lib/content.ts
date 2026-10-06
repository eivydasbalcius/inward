import config from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'

import { isLocale, type Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'

export const payloadClient = cache(() => getPayload({ config }))

/** Resolves the `[locale]` route param or 404s. */
export async function resolveLocale(params: Promise<{ locale: string }>) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return { locale, t: getDictionary(locale) }
}

export const getServices = cache(async (locale: Locale) => {
  const payload = await payloadClient()
  const { docs } = await payload.find({
    collection: 'services',
    locale,
    where: { published: { equals: true } },
    sort: 'order',
    limit: 50,
    depth: 1,
  })
  return docs
})

export const getService = cache(async (locale: Locale, slug: string) => {
  const payload = await payloadClient()
  const { docs } = await payload.find({
    collection: 'services',
    locale,
    where: { slug: { equals: slug }, published: { equals: true } },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
})

export const getPosts = cache(async (locale: Locale) => {
  const payload = await payloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    locale,
    where: { published: { equals: true } },
    sort: '-publishedAt',
    limit: 100,
    depth: 1,
  })
  return docs
})

export const getPost = cache(async (locale: Locale, slug: string) => {
  const payload = await payloadClient()
  const { docs } = await payload.find({
    collection: 'posts',
    locale,
    where: { slug: { equals: slug }, published: { equals: true } },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
})

export const getTestimonials = cache(async (locale: Locale) => {
  const payload = await payloadClient()
  const { docs } = await payload.find({ collection: 'testimonials', locale, sort: 'order', limit: 12 })
  return docs
})

export const getFaqs = cache(async (locale: Locale, onlyHome = false) => {
  const payload = await payloadClient()
  const { docs } = await payload.find({
    collection: 'faqs',
    locale,
    sort: 'order',
    limit: 100,
    where: onlyHome ? { showOnHome: { equals: true } } : undefined,
  })
  return docs
})

export const getHome = cache(async (locale: Locale) =>
  (await payloadClient()).findGlobal({ slug: 'home', locale, depth: 1 }),
)

export const getAbout = cache(async (locale: Locale) =>
  (await payloadClient()).findGlobal({ slug: 'about', locale, depth: 1 }),
)

export const getSettings = cache(async (locale: Locale) =>
  (await payloadClient()).findGlobal({ slug: 'site-settings', locale, depth: 1 }),
)

/** Online booking is on unless explicitly disabled. Payment (Paysera) is a separate switch. */
export const bookingEnabled = process.env.BOOKING_ENABLED !== 'false'
export const paymentsEnabled = process.env.PAYMENTS_ENABLED === 'true'
export const bookHref = (locale: Locale) => (bookingEnabled ? `/${locale}/book` : `/${locale}/contact`)

export function formatPrice(eur: number, locale: Locale) {
  return new Intl.NumberFormat(locale === 'lt' ? 'lt-LT' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: eur % 1 ? 2 : 0,
  }).format(eur)
}

export function formatDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'lt' ? 'lt-LT' : 'en-GB', { dateStyle: 'long' }).format(
    new Date(iso),
  )
}

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
