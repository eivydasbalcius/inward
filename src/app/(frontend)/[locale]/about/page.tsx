import type { Metadata } from 'next'
import Image from 'next/image'

import { CtaBand } from '@/components/CtaBand'
import { PageHeader } from '@/components/PageHeader'
import { RichText } from '@/components/RichText'
import { getAbout, resolveLocale } from '@/lib/content'
import { asMedia } from '@/lib/media'
import { localeAlternates } from '@/lib/seo'

export async function generateMetadata(props: PageProps<'/[locale]/about'>): Promise<Metadata> {
  const { locale, t } = await resolveLocale(props.params)
  const about = await getAbout(locale)
  return { title: t.nav.about, description: about.teaser ?? undefined, alternates: localeAlternates(locale, '/about') }
}

export default async function AboutPage(props: PageProps<'/[locale]/about'>) {
  const { locale, t } = await resolveLocale(props.params)
  const about = await getAbout(locale)
  const photo = asMedia(about.photo)

  return (
    <>
      <PageHeader eyebrow={about.role ?? undefined} title={about.headline} />
      <section className="section about-layout">
        {photo && (
          <Image
            src={photo.url!}
            alt={photo.alt}
            width={photo.width || 800}
            height={photo.height || 1000}
            className="about-photo"
            priority
          />
        )}
        <div>
          <p className="about-name">{about.name}</p>
          <RichText data={about.bio} />
          {!!about.credentials?.length && (
            <>
              <h2 className="h3">{t.about.credentials}</h2>
              <ul className="credentials">
                {about.credentials.map((c) => (
                  <li key={c.id}>
                    {c.title}
                    {c.year && <span className="muted"> · {c.year}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
      <CtaBand locale={locale} t={t} />
    </>
  )
}
