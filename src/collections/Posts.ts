import type { CollectionConfig } from 'payload'

import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

import { slugField } from '../fields/slug'
import { isAdmin, publishedOrAdmin } from './access'

export const Posts: CollectionConfig = {
  slug: 'posts',
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  labels: { singular: { lt: 'Straipsnis', en: 'Article' }, plural: { lt: 'Straipsniai', en: 'Articles' } },
  admin: {
    group: { lt: 'Turinys', en: 'Content' },
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', 'published'],
  },
  defaultSort: '-publishedAt',
  access: { read: publishedOrAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    slugField(),
    { name: 'excerpt', type: 'textarea', required: true, localized: true },
    { name: 'cover', type: 'upload', relationTo: 'media' },
    { name: 'body', type: 'richText', localized: true },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { position: 'sidebar' },
    },
    { name: 'published', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
  ],
}
