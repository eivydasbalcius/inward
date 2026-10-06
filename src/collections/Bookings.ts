import { APIError, type CollectionConfig } from 'payload'

import { onBookingChange, onBookingDelete } from '../lib/google/bookingHooks'
import { isAdmin } from './access'

export const BOOKING_STATUSES = ['held', 'confirmed', 'cancelled', 'expired'] as const

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  labels: { singular: { lt: 'Registracija', en: 'Booking' }, plural: { lt: 'Registracijos', en: 'Bookings' } },
  admin: {
    group: { lt: 'Klientai', en: 'Clients' },
    useAsTitle: 'clientName',
    defaultColumns: ['start', 'clientName', 'service', 'status', 'source', 'googleSyncState'],
    listSearchableFields: ['clientName', 'clientEmail'],
  },
  defaultSort: '-start',
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'service', label: { lt: 'Paslauga', en: 'Service' }, type: 'relationship', relationTo: 'services', required: true },
        {
          name: 'status',
          label: { lt: 'Būsena', en: 'Status' },
          type: 'select',
          required: true,
          defaultValue: 'confirmed',
          index: true,
          options: [
            { label: { lt: 'Rezervuota (laukiama apmokėjimo)', en: 'Held (awaiting payment)' }, value: 'held' },
            { label: { lt: 'Patvirtinta', en: 'Confirmed' }, value: 'confirmed' },
            { label: { lt: 'Atšaukta', en: 'Cancelled' }, value: 'cancelled' },
            { label: { lt: 'Nebegalioja (neapmokėta)', en: 'Expired (unpaid)' }, value: 'expired' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'start',
          label: { lt: 'Pradžia', en: 'Start' },
          type: 'date',
          required: true,
          index: true,
          admin: { date: { pickerAppearance: 'dayAndTime', timeIntervals: 15, displayFormat: 'yyyy-MM-dd HH:mm' } },
        },
        {
          name: 'end',
          label: { lt: 'Pabaiga', en: 'End' },
          type: 'date',
          index: true,
          admin: {
            readOnly: true,
            description: { lt: 'Apskaičiuojama pagal paslaugos trukmę', en: 'Calculated from the service duration' },
            date: { pickerAppearance: 'dayAndTime', displayFormat: 'yyyy-MM-dd HH:mm' },
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'clientName', label: { lt: 'Kliento vardas', en: 'Client name' }, type: 'text', required: true },
        { name: 'clientEmail', label: { lt: 'El. paštas', en: 'Email' }, type: 'email', required: true, index: true },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'clientPhone', label: { lt: 'Telefonas', en: 'Phone' }, type: 'text' },
        {
          name: 'source',
          label: { lt: 'Šaltinis', en: 'Source' },
          type: 'select',
          defaultValue: 'admin',
          options: [
            { label: { lt: 'Svetainė', en: 'Website' }, value: 'website' },
            { label: { lt: 'Administratorius', en: 'Admin' }, value: 'admin' },
          ],
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: 'clientNote',
      label: { lt: 'Kliento žinutė', en: 'Message from client' },
      type: 'textarea',
      admin: { readOnly: true, condition: (d) => !!d?.clientNote },
    },
    { name: 'consentAt', type: 'date', admin: { position: 'sidebar', readOnly: true, condition: (d) => !!d?.consentAt, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'locale', type: 'text', admin: { position: 'sidebar', readOnly: true, condition: (d) => !!d?.locale } },
    {
      name: 'holdExpiresAt',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true, condition: (data) => data?.status === 'held' },
    },
    {
      name: 'googleSyncState',
      label: { lt: 'Google kalendorius', en: 'Google Calendar' },
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: { lt: 'Laukia', en: 'Pending' }, value: 'pending' },
        { label: { lt: 'Sinchronizuota', en: 'Synced' }, value: 'ok' },
        { label: { lt: 'Pakeista Google kalendoriuje!', en: 'Changed in Google!' }, value: 'changed-in-google' },
        { label: { lt: 'Ištrinta Google kalendoriuje!', en: 'Deleted in Google!' }, value: 'deleted-in-google' },
        { label: { lt: 'Klaida', en: 'Error' }, value: 'error' },
      ],
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: {
          lt: 'Jei įvykis buvo pakeistas ar ištrintas Google kalendoriuje, patikrinkite ir išsaugokite registraciją iš naujo.',
          en: 'If the event was changed or deleted in Google, review and save the booking again.',
        },
      },
    },
    { name: 'googleEventId', type: 'text', admin: { position: 'sidebar', readOnly: true } },
    { name: 'googleError', type: 'text', admin: { position: 'sidebar', readOnly: true, condition: (d) => !!d?.googleError } },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, originalDoc }) => {
        // end = start + service duration
        const serviceId = data.service ?? originalDoc?.service
        const start = data.start ?? originalDoc?.start
        if (serviceId && start) {
          const id = typeof serviceId === 'object' ? serviceId.id : serviceId
          const service = await req.payload.findByID({ collection: 'services', id, depth: 0, req })
          data.end = new Date(new Date(start).getTime() + service.durationMin * 60_000).toISOString()
        }
        // Friendly overlap check (the DB constraint bookings_no_overlap catches races)
        const status = data.status ?? originalDoc?.status
        if (data.end && (status === 'held' || status === 'confirmed')) {
          const clash = await req.payload.find({
            collection: 'bookings',
            where: {
              and: [
                { status: { in: ['held', 'confirmed'] } },
                { start: { less_than: data.end } },
                { end: { greater_than: new Date(start).toISOString() } },
                ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
              ],
            },
            limit: 1,
            depth: 0,
            req,
          })
          if (clash.docs[0]) {
            throw new APIError(`Šis laikas jau užimtas (registracija #${clash.docs[0].id}, ${clash.docs[0].clientName}).`, 409, null, true)
          }
        }
        // Saving in admin re-arms Google sync (e.g. after a "changed in Google" warning)
        if (!req.context?.fromGoogleSync) data.googleSyncState = 'pending'
        return data
      },
    ],
    afterChange: [onBookingChange],
    afterDelete: [onBookingDelete],
  },
}
