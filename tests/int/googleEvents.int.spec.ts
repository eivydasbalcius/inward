import { describe, expect, it } from 'vitest'

import { eventToBusy } from '@/lib/google/sync'

describe('eventToBusy', () => {
  it('maps timed events', () => {
    const b = eventToBusy({
      start: { dateTime: '2026-10-06T10:00:00+03:00' },
      end: { dateTime: '2026-10-06T11:00:00+03:00' },
    })
    expect(b).toEqual({
      start: new Date('2026-10-06T07:00:00Z'),
      end: new Date('2026-10-06T08:00:00Z'),
      allDay: false,
    })
  })

  it('maps all-day events to whole Vilnius days (end date exclusive)', () => {
    const b = eventToBusy({ start: { date: '2026-10-06' }, end: { date: '2026-10-08' } })
    expect(b).toEqual({
      start: new Date('2026-10-05T21:00:00Z'),
      end: new Date('2026-10-07T21:00:00Z'),
      allDay: true,
    })
  })

  it('ignores free, cancelled and declined events', () => {
    const t = {
      start: { dateTime: '2026-10-06T10:00:00Z' },
      end: { dateTime: '2026-10-06T11:00:00Z' },
    }
    expect(eventToBusy({ ...t, transparency: 'transparent' })).toBeNull()
    expect(eventToBusy({ ...t, status: 'cancelled' })).toBeNull()
    expect(
      eventToBusy({ ...t, attendees: [{ self: true, responseStatus: 'declined' }] }),
    ).toBeNull()
    expect(
      eventToBusy({ ...t, attendees: [{ self: true, responseStatus: 'accepted' }] }),
    ).not.toBeNull()
  })
})
