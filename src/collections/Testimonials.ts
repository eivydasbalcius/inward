import type { CollectionConfig } from 'payload'

import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

import { anyone, isAdmin } from './access'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  labels: { singular: { lt: 'Atsiliepimas', en: 'Testimonial' }, plural: { lt: 'Atsiliepimai', en: 'Testimonials' } },
  admin: { group: { lt: 'Turinys', en: 'Content' }, useAsTitle: 'name', defaultColumns: ['name', 'quote'] },
  defaultSort: 'order',
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'quote', type: 'textarea', required: true, localized: true },
    { name: 'name', type: 'text', required: true },
    { name: 'service', type: 'relationship', relationTo: 'services' },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
