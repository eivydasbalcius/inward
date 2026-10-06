import type { GlobalConfig } from 'payload'

import { revalidateGlobal } from '../hooks/revalidate'

export const Home: GlobalConfig = {
  slug: 'home',
  hooks: { afterChange: [revalidateGlobal] },
  label: { lt: 'Pagrindinis puslapis', en: 'Home page' },
  admin: { group: { lt: 'Turinys', en: 'Content' } },
  access: { read: () => true },
  fields: [
    {
      name: 'heroTitle',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: { lt: 'Žodžius tarp *žvaigždučių* paryškinsime kursyvu, pvz.: Kelionė *į vidų* prasideda…', en: 'Words between *asterisks* are shown in italics.' } },
    },
    { name: 'heroLead', type: 'textarea', required: true, localized: true },
    { name: 'introTitle', type: 'text', localized: true },
    { name: 'introText', type: 'textarea', localized: true },
    {
      name: 'steps',
      type: 'array',
      localized: true,
      maxRows: 4,
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'text', type: 'textarea', required: true },
      ],
    },
  ],
}
