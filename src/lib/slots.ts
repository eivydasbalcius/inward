import { TZDate } from '@date-fns/tz'

export const STUDIO_TZ = process.env.TZ_STUDIO || 'Europe/Vilnius'

/** "HH:MM" wall-clock range in the studio time zone. */
export type TimeRange = { from: string; to: string }

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type WeeklySchedule = Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, TimeRange[]>>

export type AvailabilityException = {
  dateFrom: string // YYYY-MM-DD, inclusive
  dateTo: string // YYYY-MM-DD, inclusive
  type: 'blocked' | 'custom'
  ranges?: TimeRange[]
}

export type Interval = { start: Date; end: Date }

export type BookingLike = Interval & {
  status: 'held' | 'confirmed' | 'cancelled'
  holdExpiresAt?: Date | null
}

export type SlotInput = {
  schedule: WeeklySchedule
  exceptions: AvailabilityException[]
  /** Busy time mirrored from Google (all-day events already expanded to whole days). */
  busy: Interval[]
  bookings: BookingLike[]
  durationMin: number
  bufferMin: number
  stepMin: number
  minNoticeHours: number
  horizonDays: number
  now: Date
  /** Requested window, YYYY-MM-DD inclusive; clamped to [today, today + horizonDays]. */
  from: string
  to: string
  tz?: string
}

export type DaySlots = { date: string; slots: string[] }

const MIN = 60_000

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(date: Date, tz = STUDIO_TZ): string {
  const d = new TZDate(date, tz)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseDateKey(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number)
  return [y, m, d]
}

function addDays(key: string, days: number): string {
  const [y, m, d] = parseDateKey(key)
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`
}

/** Absolute instant for a wall-clock time on a given studio-local date (DST-safe). */
export function wallClock(dateKey: string, hhmm: string, tz = STUDIO_TZ): Date {
  const [y, m, d] = parseDateKey(dateKey)
  const [hh, mm] = hhmm.split(':').map(Number)
  return new Date(new TZDate(y, m - 1, d, hh, mm, tz).getTime())
}

/** Start and end (exclusive) of a studio-local day, e.g. for all-day Google events. */
export function dayBounds(dateKey: string, tz = STUDIO_TZ): Interval {
  return { start: wallClock(dateKey, '00:00', tz), end: wallClock(addDays(dateKey, 1), '00:00', tz) }
}

function isoWeekday(dateKey: string, tz: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const day = new TZDate(wallClock(dateKey, '12:00', tz), tz).getDay() // 0 = Sunday
  return (day === 0 ? 7 : day) as 1 | 2 | 3 | 4 | 5 | 6 | 7
}

function rangesFor(dateKey: string, input: SlotInput, tz: string): TimeRange[] {
  // Later exceptions win when several cover the same date.
  const exception = [...input.exceptions]
    .reverse()
    .find((e) => e.dateFrom <= dateKey && dateKey <= e.dateTo)
  if (exception) return exception.type === 'blocked' ? [] : (exception.ranges ?? [])
  return input.schedule[isoWeekday(dateKey, tz)] ?? []
}

export function activeBookings(bookings: BookingLike[], now: Date): Interval[] {
  return bookings.filter(
    (b) => b.status === 'confirmed' || (b.status === 'held' && !!b.holdExpiresAt && b.holdExpiresAt > now),
  )
}

export function computeSlots(input: SlotInput): DaySlots[] {
  const tz = input.tz ?? STUDIO_TZ
  const { now, durationMin, bufferMin } = input
  const step = Math.max(5, input.stepMin) * MIN
  const duration = durationMin * MIN
  const buffer = bufferMin * MIN
  const earliest = now.getTime() + input.minNoticeHours * 60 * MIN

  const today = toDateKey(now, tz)
  const lastDay = addDays(today, input.horizonDays)
  const from = input.from > today ? input.from : today
  const to = input.to < lastDay ? input.to : lastDay

  const blockers = [...input.busy, ...activeBookings(input.bookings, now)].map((b) => ({
    start: b.start.getTime() - buffer,
    end: b.end.getTime() + buffer,
  }))

  const days: DaySlots[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const slots: string[] = []
    for (const range of rangesFor(date, input, tz)) {
      const rangeEnd = wallClock(date, range.to, tz).getTime()
      for (let t = wallClock(date, range.from, tz).getTime(); t + duration <= rangeEnd; t += step) {
        if (t < earliest) continue
        const end = t + duration
        if (blockers.some((b) => t < b.end && end > b.start)) continue
        slots.push(new Date(t).toISOString())
      }
    }
    days.push({ date, slots: [...new Set(slots)].sort() })
  }
  return days
}

/** True when [start, start+duration) is still a valid slot – used to re-check right before holding it. */
export function isSlotAvailable(input: Omit<SlotInput, 'from' | 'to'>, start: Date): boolean {
  const date = toDateKey(start, input.tz ?? STUDIO_TZ)
  const day = computeSlots({ ...input, from: date, to: date })[0]
  return !!day?.slots.includes(start.toISOString())
}
