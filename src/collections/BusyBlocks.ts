import type { CollectionConfig } from 'payload'

import { isAdmin } from './access'

// Local mirror of busy time from Google Calendar, maintained by src/lib/google/sync.ts.
// No titles or descriptions are stored – only when the admin is busy.
export const BusyBlocks: CollectionConfig = {
  slug: 'busy-blocks',
  labels: { singular: { lt: 'Užimtas laikas', en: 'Busy block' }, plural: { lt: 'Užimtumas (Google)', en: 'Busy (Google)' } },
  admin: {
    group: { lt: 'Kalendorius', en: 'Calendar' },
    description: {
      lt: 'Automatiškai sinchronizuojama iš Google kalendoriaus (tik laikas, be pavadinimų). Redaguoti nereikia.',
      en: 'Synced automatically from Google Calendar (times only, no titles). Read-only.',
    },
    defaultColumns: ['start', 'end', 'allDay', 'calendarId'],
    useAsTitle: 'eventId',
  },
  defaultSort: 'start',
  access: { read: isAdmin, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'calendarId', type: 'text', required: true, index: true },
    { name: 'eventId', type: 'text', required: true, index: true },
    { name: 'start', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'end', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'allDay', type: 'checkbox', defaultValue: false },
  ],
}
