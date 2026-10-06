import type { CollectionConfig } from 'payload'

import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

import { anyone, isAdmin } from './access'

export const Faqs: CollectionConfig = {
  slug: 'faqs',
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  labels: { singular: { lt: 'DUK klausimas', en: 'FAQ' }, plural: { lt: 'DUK', en: 'FAQs' } },
  admin: { group: { lt: 'Turinys', en: 'Content' }, useAsTitle: 'question' },
  defaultSort: 'order',
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'question', type: 'text', required: true, localized: true },
    { name: 'answer', type: 'textarea', required: true, localized: true },
    { name: 'showOnHome', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
