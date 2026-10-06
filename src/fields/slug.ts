import type { Field } from 'payload'

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// Shared across locales; generated from the default-locale title when left empty.
export const slugField = (from = 'title'): Field => ({
  name: 'slug',
  type: 'text',
  unique: true,
  index: true,
  admin: { position: 'sidebar', description: 'URL dalis, pvz. individuali-sesija' },
  hooks: {
    beforeValidate: [
      ({ value, data }) => (value ? slugify(value) : data?.[from] ? slugify(String(data[from])) : value),
    ],
  },
})
