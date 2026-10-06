import type { GlobalConfig } from 'payload'

import { timeRangesField } from '../fields/timeRanges'

export const WEEKDAYS = [
  { key: 'mon', iso: 1, lt: 'Pirmadienis', en: 'Monday' },
  { key: 'tue', iso: 2, lt: 'Antradienis', en: 'Tuesday' },
  { key: 'wed', iso: 3, lt: 'Trečiadienis', en: 'Wednesday' },
  { key: 'thu', iso: 4, lt: 'Ketvirtadienis', en: 'Thursday' },
  { key: 'fri', iso: 5, lt: 'Penktadienis', en: 'Friday' },
  { key: 'sat', iso: 6, lt: 'Šeštadienis', en: 'Saturday' },
  { key: 'sun', iso: 7, lt: 'Sekmadienis', en: 'Sunday' },
] as const

export const Availability: GlobalConfig = {
  slug: 'availability',
  label: { lt: 'Darbo laikas', en: 'Working hours' },
  admin: {
    group: { lt: 'Kalendorius', en: 'Calendar' },
    description: {
      lt: 'Laikai, kuriais klientai gali registruotis (Vilniaus laiku). Užimtumas iš Google kalendoriaus ir esamos registracijos atimamos automatiškai.',
      en: 'Hours clients can book (Vilnius time). Busy time from Google Calendar and existing bookings is subtracted automatically.',
    },
  },
  access: { read: ({ req }) => Boolean(req.user) },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: { lt: 'Savaitės grafikas', en: 'Weekly schedule' },
          fields: WEEKDAYS.map((d) => timeRangesField(d.key, { lt: d.lt, en: d.en })),
        },
        {
          label: { lt: 'Nustatymai', en: 'Settings' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'bufferMin',
                  label: { lt: 'Pertrauka tarp sesijų (min.)', en: 'Buffer between sessions (min)' },
                  type: 'number',
                  required: true,
                  min: 0,
                  defaultValue: 15,
                },
                {
                  name: 'slotStepMin',
                  label: { lt: 'Laikų žingsnis (min.)', en: 'Slot step (min)' },
                  type: 'number',
                  required: true,
                  min: 5,
                  defaultValue: 30,
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'minNoticeHours',
                  label: { lt: 'Registracija ne vėliau nei prieš (val.)', en: 'Minimum notice (hours)' },
                  type: 'number',
                  required: true,
                  min: 0,
                  defaultValue: 24,
                },
                {
                  name: 'horizonDays',
                  label: { lt: 'Kiek dienų į priekį rodyti', en: 'Booking horizon (days)' },
                  type: 'number',
                  required: true,
                  min: 1,
                  max: 365,
                  defaultValue: 60,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
