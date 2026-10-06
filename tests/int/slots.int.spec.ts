import { describe, expect, it } from 'vitest'

import { computeSlots, dayBounds, isSlotAvailable, wallClock, type SlotInput } from '@/lib/slots'

// Monday 2026-10-05 08:00 Vilnius (UTC+3)
const NOW = new Date('2026-10-05T05:00:00Z')
const allWeek = { from: '10:00', to: '13:00' }

const base = (over: Partial<SlotInput> = {}): SlotInput => ({
  schedule: {
    1: [allWeek],
    2: [allWeek],
    3: [allWeek],
    4: [allWeek],
    5: [allWeek],
    6: [allWeek],
    7: [allWeek],
  },
  exceptions: [],
  busy: [],
  bookings: [],
  durationMin: 50,
  bufferMin: 10,
  stepMin: 30,
  minNoticeHours: 0,
  horizonDays: 60,
  now: NOW,
  from: '2026-10-06',
  to: '2026-10-06',
  ...over,
})

const times = (iso: string[]) =>
  iso.map((s) =>
    new Date(s).toLocaleTimeString('lt-LT', {
      timeZone: 'Europe/Vilnius',
      hour: '2-digit',
      minute: '2-digit',
    }),
  )

describe('computeSlots', () => {
  it('generates slots inside weekly hours, ending before the range closes', () => {
    const [day] = computeSlots(base())
    // 10:00, 10:30, 11:00, 11:30, 12:00 – 12:30 + 50 min would end 13:20 > 13:00
    expect(times(day.slots)).toEqual(['10:00', '10:30', '11:00', '11:30', '12:00'])
  })

  it('skips weekdays without hours', () => {
    const [day] = computeSlots(base({ schedule: { 1: [allWeek] } })) // 2026-10-06 is Tuesday
    expect(day.slots).toEqual([])
  })

  it('supports several ranges per day', () => {
    const [day] = computeSlots(
      base({
        schedule: {
          2: [
            { from: '09:00', to: '10:00' },
            { from: '17:00', to: '18:00' },
          ],
        },
      }),
    )
    expect(times(day.slots)).toEqual(['09:00', '17:00'])
  })

  it('applies the buffer around confirmed bookings', () => {
    const booking = {
      start: wallClock('2026-10-06', '11:00'),
      end: wallClock('2026-10-06', '11:50'),
      status: 'confirmed' as const,
    }
    const [day] = computeSlots(base({ bookings: [booking] }))
    // 10:00 ends 10:50 (+10 buffer = 11:00, touching is fine); 10:30 overlaps; 12:00 starts exactly at 11:50+10
    expect(times(day.slots)).toEqual(['10:00', '12:00'])
  })

  it('ignores cancelled bookings and expired holds, respects live holds', () => {
    const at = (h: string) => ({
      start: wallClock('2026-10-06', h),
      end: wallClock('2026-10-06', '12:50'),
    })
    const expired = {
      ...at('12:00'),
      status: 'held' as const,
      holdExpiresAt: new Date(NOW.getTime() - 1000),
    }
    const cancelled = { ...at('12:00'), status: 'cancelled' as const }
    expect(times(computeSlots(base({ bookings: [expired, cancelled] }))[0].slots)).toContain(
      '12:00',
    )

    const live = {
      ...at('12:00'),
      status: 'held' as const,
      holdExpiresAt: new Date(NOW.getTime() + 600_000),
    }
    expect(times(computeSlots(base({ bookings: [live] }))[0].slots)).not.toContain('12:00')
  })

  it('blocks Google busy time, including all-day events', () => {
    const meeting = {
      start: wallClock('2026-10-06', '10:15'),
      end: wallClock('2026-10-06', '10:45'),
    }
    expect(times(computeSlots(base({ busy: [meeting] }))[0].slots)).toEqual([
      '11:00',
      '11:30',
      '12:00',
    ])

    const [day] = computeSlots(base({ busy: [dayBounds('2026-10-06')] }))
    expect(day.slots).toEqual([])
  })

  it('enforces minimum notice', () => {
    // now = Mon 08:00, 26h notice → earliest Tue 10:00
    const [day] = computeSlots(base({ minNoticeHours: 26 }))
    expect(times(day.slots)[0]).toBe('10:00')
    const [later] = computeSlots(base({ minNoticeHours: 27 }))
    expect(times(later.slots)[0]).toBe('11:00')
  })

  it('clamps to today and the booking horizon', () => {
    const days = computeSlots(base({ from: '2026-10-01', to: '2027-01-01', horizonDays: 3 }))
    expect(days.map((d) => d.date)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
    ])
  })

  it('handles blocked and custom-hours exceptions', () => {
    const days = computeSlots(
      base({
        from: '2026-10-06',
        to: '2026-10-08',
        exceptions: [
          { dateFrom: '2026-10-06', dateTo: '2026-10-07', type: 'blocked' },
          {
            dateFrom: '2026-10-08',
            dateTo: '2026-10-08',
            type: 'custom',
            ranges: [{ from: '15:00', to: '16:00' }],
          },
        ],
      }),
    )
    expect(days[0].slots).toEqual([])
    expect(days[1].slots).toEqual([])
    expect(times(days[2].slots)).toEqual(['15:00'])
  })

  it('keeps wall-clock hours across DST changes', () => {
    const autumn = computeSlots(base({ from: '2026-10-24', to: '2026-10-26', horizonDays: 90 }))
    expect(autumn[0].slots[0]).toBe('2026-10-24T07:00:00.000Z') // UTC+3
    expect(autumn[1].slots[0]).toBe('2026-10-25T08:00:00.000Z') // DST ends that night → UTC+2
    expect(autumn[2].slots[0]).toBe('2026-10-26T08:00:00.000Z')

    const spring = computeSlots(
      base({ now: new Date('2026-03-27T06:00:00Z'), from: '2026-03-28', to: '2026-03-29' }),
    )
    expect(spring[0].slots[0]).toBe('2026-03-28T08:00:00.000Z') // UTC+2
    expect(spring[1].slots[0]).toBe('2026-03-29T07:00:00.000Z') // UTC+3
  })

  it('isSlotAvailable re-checks a single start time', () => {
    const input = base()
    expect(isSlotAvailable(input, wallClock('2026-10-06', '10:30'))).toBe(true)
    expect(isSlotAvailable(input, wallClock('2026-10-06', '10:15'))).toBe(false) // off-grid
    expect(isSlotAvailable(input, wallClock('2026-10-06', '12:30'))).toBe(false) // runs past closing
  })
})
