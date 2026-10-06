import type { GlobalConfig } from 'payload'

import { revalidateGlobal } from '../hooks/revalidate'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  hooks: { afterChange: [revalidateGlobal] },
  label: { lt: 'Studijos nustatymai', en: 'Site settings' },
  admin: { group: { lt: 'Studija', en: 'Studio' } },
  access: { read: () => true },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'email', type: 'email', required: true },
        { name: 'phone', type: 'text' },
      ],
    },
    { name: 'address', type: 'text', localized: true },
    { name: 'mapUrl', type: 'text' },
    {
      name: 'socials',
      type: 'array',
      fields: [
        {
          name: 'network',
          type: 'select',
          required: true,
          options: ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok'],
        },
        { name: 'url', type: 'text', required: true },
      ],
    },
    { name: 'cancellationPolicy', type: 'textarea', localized: true },
    { name: 'privacyPolicy', type: 'richText', localized: true },
  ],
}
