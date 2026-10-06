import type { ArrayField } from 'payload'

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

const validateTime = (value: unknown) =>
  typeof value === 'string' && HHMM.test(value) ? true : 'Formatas HH:MM, pvz. 09:30'

export const timeRangesField = (name: string, label: Record<string, string>): ArrayField => ({
  name,
  label,
  type: 'array',
  labels: { singular: { lt: 'Laikas', en: 'Range' }, plural: { lt: 'Laikai', en: 'Ranges' } },
  validate: (rows: unknown) => {
    const list = (Array.isArray(rows) ? rows : []) as { from?: string; to?: string }[]
    for (const r of list) {
      if (r.from && r.to && r.from >= r.to) return 'Pabaiga turi būti vėliau nei pradžia'
    }
    return true
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'from', label: { lt: 'Nuo', en: 'From' }, type: 'text', required: true, validate: validateTime, admin: { placeholder: '10:00', width: '50%' } },
        { name: 'to', label: { lt: 'Iki', en: 'To' }, type: 'text', required: true, validate: validateTime, admin: { placeholder: '18:00', width: '50%' } },
      ],
    },
  ],
})
