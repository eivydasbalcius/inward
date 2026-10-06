import type { CollectionConfig } from 'payload'

import { isAdmin } from './access'

// One document per watched Google calendar: sync token + push-notification channel state.
export const GoogleCalendars: CollectionConfig = {
  slug: 'google-calendars',
  labels: {
    singular: { lt: 'Google kalendorius', en: 'Google calendar' },
    plural: { lt: 'Google sinchronizacija', en: 'Google sync' },
  },
  admin: {
    group: { lt: 'Kalendorius', en: 'Calendar' },
    useAsTitle: 'calendarId',
    defaultColumns: ['calendarId', 'role', 'lastSyncedAt', 'channelExpiresAt', 'lastError'],
    description: {
      lt: 'Techninė sinchronizacijos būsena. Prijungimas ir mygtukai – skiltyje „Google kalendorius“.',
      en: 'Technical sync status. Connect and actions live under "Google Calendar".',
    },
  },
  access: { read: isAdmin, create: () => false, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'calendarId', type: 'text', required: true, unique: true, admin: { readOnly: true } },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: [
        { label: { lt: 'Registracijos (rašoma)', en: 'Bookings (write)' }, value: 'bookings' },
        { label: { lt: 'Užimtumas (skaitoma)', en: 'Busy (read)' }, value: 'busy' },
      ],
      admin: { readOnly: true },
    },
    { name: 'lastSyncedAt', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'lastFullSyncAt', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'channelExpiresAt', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'lastError', type: 'textarea', admin: { readOnly: true } },
    { name: 'syncToken', type: 'text', admin: { hidden: true } },
    { name: 'channelId', type: 'text', index: true, admin: { hidden: true } },
    { name: 'resourceId', type: 'text', admin: { hidden: true } },
  ],
}
