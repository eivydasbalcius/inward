import type { MetadataRoute } from 'next'

import { locales } from '@/i18n/config'
import { getPosts, getServices, siteUrl } from '@/lib/content'

const STATIC = ['', '/book', '/about', '/services', '/prices', '/faq', '/blog', '/contact', '/privacy']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, posts] = await Promise.all([getServices('lt'), getPosts('lt')])
  const paths = [
    ...STATIC.map((p) => ({ path: p, lastModified: undefined as string | undefined })),
    ...services.map((s) => ({ path: `/services/${s.slug}`, lastModified: s.updatedAt })),
    ...posts.map((p) => ({ path: `/blog/${p.slug}`, lastModified: p.updatedAt })),
  ]
  return paths.map(({ path, lastModified }) => ({
    url: `${siteUrl}/lt${path}`,
    lastModified,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}/${l}${path}`])) },
  }))
}
