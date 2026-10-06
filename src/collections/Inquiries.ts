import type { CollectionConfig } from 'payload'

import { isAdmin } from './access'

// Contact form submissions. Created only through the server action (local API), never via public REST.
export const Inquiries: CollectionConfig = {
  slug: 'inquiries',
  labels: { singular: { lt: 'Užklausa', en: 'Inquiry' }, plural: { lt: 'Užklausos', en: 'Inquiries' } },
  admin: {
    group: { lt: 'Studija', en: 'Studio' },
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'createdAt', 'handled'],
  },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    { name: 'message', type: 'textarea', required: true },
    { name: 'locale', type: 'text', admin: { readOnly: true } },
    { name: 'handled', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
  ],
}
