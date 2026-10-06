import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/JsonLd'
import { RichText } from '@/components/RichText'
import { formatDate, getAbout, getPost, resolveLocale, siteUrl } from '@/lib/content'
import { asMedia } from '@/lib/media'
import { localeAlternates } from '@/lib/seo'

export async function generateMetadata(props: PageProps<'/[locale]/blog/[slug]'>): Promise<Metadata> {
  const { locale } = await resolveLocale(props.params)
  const { slug } = await props.params
  const post = await getPost(locale, slug)
  if (!post) return {}
  const cover = asMedia(post.cover)
  return {
    title: post.title,
    description: post.excerpt,
    alternates: localeAlternates(locale, `/blog/${slug}`),
    openGraph: { type: 'article', images: cover?.url ? [cover.url] : undefined },
  }
}

export default async function PostPage(props: PageProps<'/[locale]/blog/[slug]'>) {
  const { locale, t } = await resolveLocale(props.params)
  const { slug } = await props.params
  const [post, about] = await Promise.all([getPost(locale, slug), getAbout(locale)])
  if (!post) notFound()
  const cover = asMedia(post.cover)

  return (
    <article className="section narrow post">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.excerpt,
          datePublished: post.publishedAt,
          author: { '@type': 'Person', name: about.name },
          url: `${siteUrl}/${locale}/blog/${slug}`,
        }}
      />
      <Link href={`/${locale}/blog`} className="link-arrow">
        ← {t.blog.back}
      </Link>
      <p className="card-kicker">{formatDate(post.publishedAt, locale)}</p>
      <h1>{post.title}</h1>
      <p className="lead">{post.excerpt}</p>
      {cover && (
        <Image src={cover.url!} alt={cover.alt} width={cover.width || 1600} height={cover.height || 900} priority />
      )}
      <RichText data={post.body} />
    </article>
  )
}
