import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: { lt: 'Administratorius', en: 'Admin' }, plural: { lt: 'Administratoriai', en: 'Admins' } },
  admin: {
    useAsTitle: 'email',
    group: { lt: 'Studija', en: 'Studio' },
  },
  auth: true,
  fields: [
    // Email added by default
    { name: 'name', type: 'text' },
  ],
}
