import type { CollectionConfig } from 'payload'

import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

export const Media: CollectionConfig = {
  slug: 'media',
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  labels: { singular: { lt: 'Failas', en: 'Media' }, plural: { lt: 'Failai', en: 'Media' } },
  admin: { group: { lt: 'Turinys', en: 'Content' } },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      localized: true,
    },
  ],
  upload: {
    imageSizes: [
      { name: 'card', width: 800 },
      { name: 'hero', width: 1600 },
    ],
  },
}
