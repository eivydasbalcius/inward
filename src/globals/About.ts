import type { GlobalConfig } from 'payload'

import { revalidateGlobal } from '../hooks/revalidate'

export const About: GlobalConfig = {
  slug: 'about',
  hooks: { afterChange: [revalidateGlobal] },
  label: { lt: 'Apie mane', en: 'About' },
  admin: { group: { lt: 'Turinys', en: 'Content' } },
  access: { read: () => true },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'role', type: 'text', localized: true },
    { name: 'headline', type: 'text', required: true, localized: true },
    { name: 'teaser', type: 'textarea', localized: true, admin: { description: 'Rodoma pagrindiniame puslapyje' } },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    { name: 'bio', type: 'richText', localized: true },
    {
      name: 'credentials',
      type: 'array',
      localized: true,
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'year', type: 'text' },
      ],
    },
  ],
}
