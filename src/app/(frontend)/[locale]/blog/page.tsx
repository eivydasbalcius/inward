import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { PageHeader } from '@/components/PageHeader'
import { formatDate, getPosts, resolveLocale } from '@/lib/content'
import { asMedia } from '@/lib/media'
import { localeAlternates } from '@/lib/seo'

export async function generateMetadata(props: PageProps<'/[locale]/blog'>): Promise<Metadata> {
  const { locale, t } = await resolveLocale(props.params)
  return { title: t.blog.title, description: t.blog.lead, alternates: localeAlternates(locale, '/blog') }
}

export default async function BlogPage(props: PageProps<'/[locale]/blog'>) {
  const { locale, t } = await resolveLocale(props.params)
  const posts = await getPosts(locale)

  return (
    <>
      <PageHeader title={t.blog.title} lead={t.blog.lead} />
      <section className="section">
        {posts.length === 0 ? (
          <p className="muted">{t.blog.empty}</p>
        ) : (
          <div className="cards">
            {posts.map((p) => {
              const cover = asMedia(p.cover)
              return (
                <article key={p.id} className="card post-card">
                  {cover && (
                    <Image
                      src={cover.sizes?.card?.url || cover.url!}
                      alt={cover.alt}
                      width={cover.sizes?.card?.width || 800}
                      height={cover.sizes?.card?.height || 500}
                    />
                  )}
                  <p className="card-kicker">{formatDate(p.publishedAt, locale)}</p>
                  <h3>
                    <Link href={`/${locale}/blog/${p.slug}`}>{p.title}</Link>
                  </h3>
                  <p>{p.excerpt}</p>
                  <Link href={`/${locale}/blog/${p.slug}`} className="link-arrow">
                    {t.blog.read} →
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
