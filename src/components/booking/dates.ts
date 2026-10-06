// Calendar date helpers. Day keys are studio-local (Europe/Vilnius) "YYYY-MM-DD" strings.
export const TZ = 'Europe/Vilnius'

const pad = (n: number) => String(n).padStart(2, '0')

export function todayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now)
}

function utc(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

const keyOf = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`

export const addDays = (key: string, n: number) => {
  const d = utc(key)
  d.setUTCDate(d.getUTCDate() + n)
  return keyOf(d)
}

/** 0 = Monday … 6 = Sunday */
export const weekdayIndex = (key: string) => (utc(key).getUTCDay() + 6) % 7

export const mondayOf = (key: string) => addDays(key, -weekdayIndex(key))

export const monthOf = (key: string) => key.slice(0, 7)

export function addMonths(month: string, n: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

export function monthRange(month: string) {
  const from = `${month}-01`
  const to = addDays(`${addMonths(month, 1)}-01`, -1)
  return { from, to }
}

/** 6 weeks × 7 days starting on the Monday before the 1st (Google mini-month layout). */
export function monthGrid(month: string) {
  const start = mondayOf(`${month}-01`)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

/** Minutes since local midnight in the studio time zone. */
export function minutesOfDay(iso: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(iso))
  const h = Number(parts.find((p) => p.type === 'hour')?.value)
  const m = Number(parts.find((p) => p.type === 'minute')?.value)
  return h * 60 + m
}

/** Noon UTC of a day key – safe to format with timeZone UTC for weekday/day/month labels. */
export const labelDate = (key: string) => new Date(`${key}T12:00:00Z`)

export const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1)

/** Google Calendar "create event" link, pre-filled; the client saves it to their own calendar in one click. */
export function googleCalendarUrl(opts: { start: string; end: string; title: string; details?: string; location?: string }) {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${stamp(opts.start)}/${stamp(opts.end)}`,
    ctz: TZ,
  })
  if (opts.details) params.set('details', opts.details)
  if (opts.location) params.set('location', opts.location)
  return `https://calendar.google.com/calendar/render?${params}`
}
