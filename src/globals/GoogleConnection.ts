import type { GlobalConfig } from 'payload'

export const GoogleConnection: GlobalConfig = {
  slug: 'google-connection',
  label: { lt: 'Google kalendorius', en: 'Google Calendar' },
  admin: {
    group: { lt: 'Kalendorius', en: 'Calendar' },
    description: {
      lt: 'Prijunkite studijos Google paskyrą: registracijos atsiras kalendoriuje „Inward sesijos“, o Jūsų pagrindinio kalendoriaus užimtumas automatiškai paslėps laikus svetainėje.',
      en: 'Connect the studio Google account: bookings appear in the "Inward sesijos" calendar and busy time in your main calendar hides those times on the website.',
    },
  },
  access: { read: ({ req }) => Boolean(req.user), update: () => false },
  fields: [
    { name: 'panel', type: 'ui', admin: { components: { Field: '/components/admin/GoogleConnect#GoogleConnect' } } },
    { name: 'email', type: 'text', admin: { hidden: true } },
    { name: 'status', type: 'select', defaultValue: 'disconnected', options: ['connected', 'disconnected', 'error'], admin: { hidden: true } },
    { name: 'connectedAt', type: 'date', admin: { hidden: true } },
    { name: 'lastError', type: 'text', admin: { hidden: true } },
    // AES-256-GCM encrypted; never sent to the browser
    { name: 'refreshTokenEnc', type: 'text', access: { read: () => false }, admin: { hidden: true } },
  ],
}
