import type { CollectionConfig } from 'payload'

import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'

import { slugField } from '../fields/slug'
import { isAdmin, publishedOrAdmin } from './access'

export const Services: CollectionConfig = {
  slug: 'services',
  hooks: { afterChange: [revalidateAfterChange], afterDelete: [revalidateAfterDelete] },
  labels: { singular: { lt: 'Paslauga', en: 'Service' }, plural: { lt: 'Paslaugos', en: 'Services' } },
  admin: {
    group: { lt: 'Turinys', en: 'Content' },
    useAsTitle: 'title',
    defaultColumns: ['title', 'format', 'durationMin', 'priceEur', 'published'],
  },
  defaultSort: 'order',
  access: { read: publishedOrAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    slugField(),
    { name: 'summary', type: 'textarea', required: true, localized: true },
    { name: 'body', type: 'richText', localized: true },
    {
      type: 'row',
      fields: [
        {
          name: 'format',
          type: 'select',
          required: true,
          defaultValue: 'individual',
          options: [
            { label: { lt: 'Individuali', en: 'Individual' }, value: 'individual' },
            { label: { lt: 'Grupinė', en: 'Group' }, value: 'group' },
          ],
        },
        {
          name: 'mode',
          type: 'select',
          hasMany: true,
          defaultValue: ['in-person'],
          options: [
            { label: { lt: 'Gyvai', en: 'In person' }, value: 'in-person' },
            { label: { lt: 'Nuotoliu', en: 'Online' }, value: 'online' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'durationMin', type: 'number', required: true, min: 15 },
        { name: 'priceEur', type: 'number', required: true, min: 0 },
        { name: 'sessionsCount', type: 'number', min: 1, defaultValue: 1 },
        { name: 'groupSize', type: 'number', min: 1 },
      ],
    },
    {
      name: 'whoFor',
      type: 'array',
      localized: true,
      labels: { singular: { lt: 'Kam tinka', en: 'Who it is for' }, plural: { lt: 'Kam tinka', en: 'Who it is for' } },
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'notFor',
      type: 'array',
      localized: true,
      labels: { singular: { lt: 'Kam netinka', en: 'Not for' }, plural: { lt: 'Kam netinka', en: 'Not for' } },
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    { name: 'supplies', type: 'textarea', localized: true },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
    { name: 'published', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
  ],
}
