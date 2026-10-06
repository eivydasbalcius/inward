import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { en } from '@payloadcms/translations/languages/en'
import { lt } from '@payloadcms/translations/languages/lt'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { AvailabilityExceptions } from './collections/AvailabilityExceptions'
import { Bookings } from './collections/Bookings'
import { BusyBlocks } from './collections/BusyBlocks'
import { Faqs } from './collections/Faqs'
import { GoogleCalendars } from './collections/GoogleCalendars'
import { Inquiries } from './collections/Inquiries'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Services } from './collections/Services'
import { Testimonials } from './collections/Testimonials'
import { Users } from './collections/Users'
import { endpoints } from './endpoints'
import { About } from './globals/About'
import { Availability } from './globals/Availability'
import { GoogleConnection } from './globals/GoogleConnection'
import { Home } from './globals/Home'
import { SiteSettings } from './globals/SiteSettings'
import { jobs } from './jobs'
import { ensureBookingOverlapConstraint } from './lib/bookingGuard'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' · Inward admin',
    },
  },
  i18n: {
    supportedLanguages: { lt, en },
    fallbackLanguage: 'lt',
  },
  localization: {
    locales: [
      { label: 'Lietuvių', code: 'lt' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'lt',
    fallback: true,
  },
  collections: [
    Bookings,
    AvailabilityExceptions,
    BusyBlocks,
    GoogleCalendars,
    Services,
    Posts,
    Testimonials,
    Faqs,
    Media,
    Inquiries,
    Users,
  ],
  globals: [Availability, GoogleConnection, Home, About, SiteSettings],
  endpoints,
  jobs,
  onInit: async (payload) => {
    await ensureBookingOverlapConstraint(payload)
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
})
