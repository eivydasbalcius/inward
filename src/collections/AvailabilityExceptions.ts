import type { CollectionConfig } from 'payload'

import { timeRangesField } from '../fields/timeRanges'
import { isAdmin } from './access'

const dateOnly = { date: { pickerAppearance: 'dayOnly' as const, displayFormat: 'yyyy-MM-dd' } }

export const AvailabilityExceptions: CollectionConfig = {
  slug: 'availability-exceptions',
  labels: {
    singular: { lt: 'Išimtis', en: 'Exception' },
    plural: { lt: 'Atostogos ir išimtys', en: 'Days off & exceptions' },
  },
  admin: {
    group: { lt: 'Kalendorius', en: 'Calendar' },
    useAsTitle: 'note',
    defaultColumns: ['note', 'dateFrom', 'dateTo', 'type'],
    description: {
      lt: 'Laisvos dienos, atostogos arba kitokios darbo valandos konkrečiomis dienomis.',
      en: 'Days off, holidays or different hours on specific dates.',
    },
  },
  defaultSort: '-dateFrom',
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'note', label: { lt: 'Pavadinimas', en: 'Label' }, type: 'text', required: true, admin: { placeholder: 'Atostogos' } },
    {
      type: 'row',
      fields: [
        { name: 'dateFrom', label: { lt: 'Nuo', en: 'From' }, type: 'date', required: true, admin: dateOnly },
        { name: 'dateTo', label: { lt: 'Iki (imtinai)', en: 'To (inclusive)' }, type: 'date', required: true, admin: dateOnly },
      ],
    },
    {
      name: 'type',
      label: { lt: 'Tipas', en: 'Type' },
      type: 'radio',
      required: true,
      defaultValue: 'blocked',
      options: [
        { label: { lt: 'Nedirbu (visa diena)', en: 'Closed (whole day)' }, value: 'blocked' },
        { label: { lt: 'Kitokios valandos', en: 'Different hours' }, value: 'custom' },
      ],
    },
    {
      ...timeRangesField('ranges', { lt: 'Valandos', en: 'Hours' }),
      admin: { condition: (_, sibling) => sibling?.type === 'custom' },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.dateFrom && data?.dateTo && data.dateTo < data.dateFrom) {
          throw new Error('„Iki“ data negali būti ankstesnė nei „Nuo“')
        }
        return data
      },
    ],
  },
}
