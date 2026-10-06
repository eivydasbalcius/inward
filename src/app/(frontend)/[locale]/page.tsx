import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { BrushTitle } from '@/components/BrushTitle'
import { CtaBand } from '@/components/CtaBand'
import { Emphasis } from '@/components/Emphasis'
import { FaqList } from '@/components/FaqList'
import { JsonLd } from '@/components/JsonLd'
import { ServiceCard } from '@/components/ServiceCard'
import { Testimonials } from '@/components/Testimonials'
import { Watercolor } from '@/components/Watercolor'
import {
  bookHref,
  getAbout,
  getFaqs,
  getHome,
  getServices,
  getSettings,
  getTestimonials,
  resolveLocale,
  siteUrl,
} from '@/lib/content'
import { asMedia } from '@/lib/media'
import { localeAlternates } from '@/lib/seo'

export async function generateMetadata(props: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await resolveLocale(props.params)
  return { alternates: localeAlternates(locale) }
}

export default async function HomePage(props: PageProps<'/[locale]'>) {
  const { locale, t } = await resolveLocale(props.params)
  const [home, about, services, testimonials, faqs, settings] = await Promise.all([
    getHome(locale),
    getAbout(locale),
    getServices(locale),
    getTestimonials(locale),
    getFaqs(locale, true),
    getSettings(locale),
  ])
  const photo = asMedia(about.photo)

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ProfessionalService',
          name: 'Inward – kūrybinės terapijos studija',
          url: `${siteUrl}/${locale}`,
          image: `${siteUrl}/brand/inward-logo.jpg`,
          email: settings.email,
          telephone: settings.phone ?? undefined,
          address: settings.address ?? undefined,
          sameAs: settings.socials?.map((s) => s.url),
        }}
      />
      <section className="hero">
        <Watercolor />
        <div className="hero-text">
          <p className="eyebrow hero-in" style={{ '--d': 0 } as React.CSSProperties}>
            {t.home.eyebrow}
          </p>
          <h1 className="hero-in" style={{ '--d': 1 } as React.CSSProperties}>
            <Emphasis text={home.heroTitle} />
          </h1>
          <p className="lead hero-in" style={{ '--d': 2 } as React.CSSProperties}>
            {home.heroLead}
          </p>
          <div className="hero-actions hero-in" style={{ '--d': 3 } as React.CSSProperties}>
            <Link href={bookHref(locale)} className="btn btn-primary btn-lg">
              {t.home.cta}
            </Link>
            <Link href={`/${locale}/services`} className="btn btn-ghost btn-lg">
              {t.home.secondary}
            </Link>
          </div>
        </div>
      </section>

      {home.introTitle && (
        <section className="section intro" data-reveal>
          <h2>{home.introTitle}</h2>
          <p className="lead">{home.introText}</p>
        </section>
      )}

      {services.length > 0 && (
        <section className="section">
          <BrushTitle>{t.home.servicesTitle}</BrushTitle>
          <div className="cards" data-reveal-stagger>
            {services.map((s) => (
              <ServiceCard key={s.id} service={s} locale={locale} t={t} />
            ))}
          </div>
        </section>
      )}

      {!!home.steps?.length && (
        <section className="section section-tint">
          <BrushTitle>{t.home.stepsTitle}</BrushTitle>
          <ol className="steps" data-reveal-stagger>
            {home.steps.map((step) => (
              <li key={step.id} data-reveal>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="section about-teaser" data-reveal>
        {photo && (
          <Image
            src={photo.sizes?.card?.url || photo.url!}
            alt={photo.alt}
            width={photo.sizes?.card?.width || photo.width || 800}
            height={photo.sizes?.card?.height || photo.height || 800}
            className="about-photo"
          />
        )}
        <div>
          <p className="eyebrow">{about.role}</p>
          <h2>{about.headline}</h2>
          {about.teaser && <p className="lead">{about.teaser}</p>}
          <Link href={`/${locale}/about`} className="link-arrow">
            {t.about.more} →
          </Link>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="section">
          <BrushTitle>{t.home.testimonialsTitle}</BrushTitle>
          <Testimonials items={testimonials} />
        </section>
      )}

      {faqs.length > 0 && (
        <section className="section narrow">
          <BrushTitle>{t.home.faqTitle}</BrushTitle>
          <div data-reveal>
            <FaqList faqs={faqs} />
          </div>
          <p>
            <Link href={`/${locale}/faq`} className="link-arrow">
              {t.home.allFaq} →
            </Link>
          </p>
        </section>
      )}

      <CtaBand locale={locale} t={t} />
    </>
  )
}
