'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import type { Locale } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import { BookingDialog, type Selection } from './BookingDialog'
import {
  addDays,
  addMonths,
  capitalize,
  labelDate,
  minutesOfDay,
  mondayOf,
  monthGrid,
  monthOf,
  monthRange,
  todayKey,
} from './dates'
import './calendar.css'

export type ServiceOption = { slug: string; title: string; durationMin: number; price: string }
type Day = { date: string; slots: string[] }
type MonthData = { days: Day[]; stepMin: number; durationMin: number }

const HOUR_PX = 48
// Google-calendar-like colour per service (calendar list squares + event chips)
const COLORS = ['#0e7c61', '#3b73b9', '#138a9c', '#6b5fb5', '#b5487a']

const MOBILE = '(max-width: 639px)'
const subscribe = (cb: () => void) => {
  const mq = matchMedia(MOBILE)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const useIsMobile = () =>
  useSyncExternalStore(
    subscribe,
    () => matchMedia(MOBILE).matches,
    () => false,
  )

export function BookingCalendar({
  locale,
  t,
  services,
  initialService,
  privacyHref,
  location,
}: {
  locale: Locale
  t: Dictionary['book']
  services: ServiceOption[]
  initialService?: string
  privacyHref: string
  location?: string
}) {
  const intl = locale === 'lt' ? 'lt-LT' : 'en-GB'
  const isMobile = useIsMobile()
  const visibleCount = isMobile ? 3 : 7

  const [service, setService] = useState(
    services.some((s) => s.slug === initialService) ? initialService! : (services[0]?.slug ?? ''),
  )
  const [anchor, setAnchor] = useState(() => todayKey())
  const [miniMonth, setMiniMonth] = useState(() => monthOf(todayKey()))
  const [data, setData] = useState<Record<string, MonthData | 'error'>>({})
  const [selection, setSelection] = useState<Selection | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [reload, setReload] = useState(0)
  const chipRefs = useRef(new Map<string, HTMLButtonElement>())

  const today = todayKey(now)
  const first = isMobile ? anchor : mondayOf(anchor)
  const visible = useMemo(() => Array.from({ length: visibleCount }, (_, i) => addDays(first, i)), [first, visibleCount])
  const neededMonths = useMemo(
    () => [...new Set([...visible.map(monthOf), miniMonth])],
    [visible, miniMonth],
  )
  const current = services.find((s) => s.slug === service)
  const colorIndex = Math.max(0, services.findIndex((s) => s.slug === service))
  const color = COLORS[colorIndex % COLORS.length]

  // ---- data: one /api/slots call per (service, month); cached ---------------------------------
  const monthsKey = neededMonths.join(',')
  const fetched = useRef(new Map<string, number>()) // cache key → reload generation it was fetched in
  useEffect(() => {
    const ctrl = new AbortController()
    const cache = fetched.current
    const pending = new Set<string>()
    for (const m of monthsKey.split(',')) {
      const key = `${service}|${m}`
      if (cache.get(key) === reload) continue
      cache.set(key, reload)
      pending.add(key)
      const { from, to } = monthRange(m)
      fetch(`/api/slots?service=${service}&from=${from}&to=${to}`, { signal: ctrl.signal, cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((body) => {
          pending.delete(key)
          setData((d) => ({
            ...d,
            [key]: { days: body.days, stepMin: body.stepMin ?? 30, durationMin: body.service.durationMin },
          }))
        })
        .catch((e) => {
          pending.delete(key)
          if (e?.name !== 'AbortError') setData((d) => ({ ...d, [key]: 'error' }))
        })
    }
    return () => {
      ctrl.abort()
      // unfinished requests must be fetched again by the next run (e.g. React's dev double-invoke)
      for (const key of pending) cache.delete(key)
    }
  }, [service, monthsKey, reload])

  // Keep free times fresh (new bookings, Google busy time) while the tab is visible
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date())
      if (document.visibilityState === 'visible' && !selection) setReload((n) => n + 1)
    }, 60_000)
    return () => clearInterval(id)
  }, [selection])

  const keyFor = (m: string) => `${service}|${m}`
  const dayMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const m of monthsKey.split(',')) {
      const md = data[`${service}|${m}`]
      if (md && md !== 'error') for (const d of md.days) map.set(d.date, d.slots)
    }
    return map
  }, [data, service, monthsKey])

  const meta = (() => {
    for (const m of neededMonths) {
      const md = data[keyFor(m)]
      if (md && md !== 'error') return md
    }
    return null
  })()
  const loading = visible.some((d) => !data[keyFor(monthOf(d))])
  const failed = neededMonths.some((m) => data[keyFor(m)] === 'error')
  const durationMin = meta?.durationMin ?? current?.durationMin ?? 50
  const stepMin = meta?.stepMin ?? 30

  // ---- grid geometry: show only the hours that matter this week --------------------------------
  const { startMin, endMin } = useMemo(() => {
    let lo = Infinity
    let hi = -Infinity
    for (const d of visible) {
      for (const s of dayMap.get(d) ?? []) {
        const m = minutesOfDay(s)
        lo = Math.min(lo, m)
        hi = Math.max(hi, m + durationMin)
      }
    }
    if (!Number.isFinite(lo)) return { startMin: 9 * 60, endMin: 18 * 60 }
    return { startMin: Math.min(Math.floor(lo / 60) * 60, 9 * 60), endMin: Math.max(Math.ceil(hi / 60) * 60, 18 * 60) }
  }, [visible, dayMap, durationMin])
  const hours = Array.from({ length: (endMin - startMin) / 60 }, (_, i) => startMin / 60 + i)
  const px = (min: number) => ((min - startMin) / 60) * HOUR_PX

  // ---- labels -------------------------------------------------------------------------------------
  const fmt = useMemo(
    () => ({
      weekday: new Intl.DateTimeFormat(intl, { timeZone: 'UTC', weekday: 'short' }),
      weekdayLong: new Intl.DateTimeFormat(intl, { timeZone: 'UTC', weekday: 'long' }),
      month: new Intl.DateTimeFormat(intl, { timeZone: 'UTC', month: 'long' }),
      dayMonth: new Intl.DateTimeFormat(intl, { timeZone: 'UTC', day: 'numeric', month: 'long' }),
      narrow: new Intl.DateTimeFormat(intl, { timeZone: 'UTC', weekday: 'narrow' }),
      time: new Intl.DateTimeFormat(intl, { timeZone: 'Europe/Vilnius', hour: '2-digit', minute: '2-digit' }),
    }),
    [intl],
  )
  const monthTitle = (keys: string[]) => {
    const a = keys[0]
    const b = keys[keys.length - 1]
    const ma = capitalize(fmt.month.format(labelDate(a)))
    const mb = capitalize(fmt.month.format(labelDate(b)))
    const ya = a.slice(0, 4)
    const yb = b.slice(0, 4)
    if (ma === mb && ya === yb) return `${ma} ${ya}`
    return ya === yb ? `${ma} – ${mb} ${ya}` : `${ma} ${ya} – ${mb} ${yb}`
  }
  const end = (iso: string) => new Date(new Date(iso).getTime() + durationMin * 60_000).toISOString()
  const range = (iso: string) => `${fmt.time.format(new Date(iso))} – ${fmt.time.format(new Date(end(iso)))}`

  // ---- navigation ---------------------------------------------------------------------------------
  const go = (days: number) => {
    const next = addDays(first, days)
    if (addDays(next, visibleCount - 1) < today) return
    setAnchor(next < today && isMobile ? today : next)
    setMiniMonth(monthOf(next < today ? today : next))
  }
  const jumpTo = (key: string) => {
    setAnchor(key)
    setMiniMonth(monthOf(key))
  }
  const canGoBack = first > (isMobile ? today : mondayOf(today))

  const nextFree = useMemo(() => {
    const last = visible[visible.length - 1]
    const keys = [...dayMap.keys()].filter((k) => k > last && (dayMap.get(k)?.length ?? 0) > 0).sort()
    return keys[0] ?? null
  }, [dayMap, visible])
  const weekEmpty = !loading && visible.every((d) => (dayMap.get(d)?.length ?? 0) === 0)

  // swipe on touch devices (Google mobile style)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? visibleCount : -visibleCount)
  }

  // arrow-key movement between free times
  const onGridKey = (e: React.KeyboardEvent) => {
    const el = e.target as HTMLElement
    if (!el.dataset.slot) return
    const all = [...chipRefs.current.entries()].filter(([, b]) => b.isConnected)
    const col = Number(el.dataset.col)
    const min = Number(el.dataset.min)
    let target: HTMLButtonElement | undefined
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const same = all.filter(([, b]) => Number(b.dataset.col) === col).map(([, b]) => b)
      const i = same.indexOf(el as HTMLButtonElement)
      target = same[i + (e.key === 'ArrowDown' ? 1 : -1)]
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const dir = e.key === 'ArrowRight' ? 1 : -1
      for (let c = col + dir; c >= 0 && c < visibleCount && !target; c += dir) {
        const opts = all.filter(([, b]) => Number(b.dataset.col) === c).map(([, b]) => b)
        target = opts.sort((a, b) => Math.abs(Number(a.dataset.min) - min) - Math.abs(Number(b.dataset.min) - min))[0]
      }
    }
    if (target) {
      e.preventDefault()
      target.focus()
    }
  }

  const pick = useCallback((slot: string, el: HTMLElement) => {
    setSelection({ start: slot, anchorRect: el.getBoundingClientRect() })
  }, [])

  const closeDialog = (booked: boolean) => {
    const slot = selection?.start
    setSelection(null)
    if (booked) setReload((n) => n + 1)
    else if (slot) chipRefs.current.get(slot)?.focus()
  }

  const nowMin = minutesOfDay(now.toISOString())
  const miniDays = monthGrid(miniMonth)
  const firstBookableMonth = monthOf(today)

  if (!services.length) return <p className="muted">{t.noSlots}</p>

  return (
    <div className="gcal" style={{ '--svc': color } as React.CSSProperties}>
      {/* ---------------- sidebar: mini month + calendar list ---------------- */}
      <aside className="gcal-side">
        <div className="mini">
          <div className="mini-head">
            <span>{monthTitle([`${miniMonth}-01`])}</span>
            <div>
              <button
                type="button"
                className="icon-btn"
                aria-label={t.prevMonth}
                disabled={miniMonth <= firstBookableMonth}
                onClick={() => setMiniMonth(addMonths(miniMonth, -1))}
              >
                <Chevron dir="left" />
              </button>
              <button type="button" className="icon-btn" aria-label={t.nextMonth} onClick={() => setMiniMonth(addMonths(miniMonth, 1))}>
                <Chevron dir="right" />
              </button>
            </div>
          </div>
          <div className="mini-grid" role="grid">
            {miniDays.slice(0, 7).map((d) => (
              <span key={`h${d}`} className="mini-dow" aria-hidden="true">
                {fmt.narrow.format(labelDate(d)).toLocaleUpperCase()}
              </span>
            ))}
            {miniDays.map((d) => {
              const has = (dayMap.get(d)?.length ?? 0) > 0
              const cls = [
                'mini-day',
                monthOf(d) !== miniMonth && 'out',
                d === today && 'today',
                visible.includes(d) && 'in-view',
                d < today && 'past',
                has && 'has',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={d}
                  type="button"
                  className={cls}
                  disabled={d < today}
                  onClick={() => jumpTo(d)}
                  aria-label={`${capitalize(fmt.weekdayLong.format(labelDate(d)))}, ${fmt.dayMonth.format(labelDate(d))}`}
                >
                  {Number(d.slice(8))}
                </button>
              )
            })}
          </div>
        </div>

        <fieldset className="cal-list">
          <legend>{t.services}</legend>
          {services.map((s, i) => (
            <label key={s.slug} className="cal-item" style={{ '--c': COLORS[i % COLORS.length] } as React.CSSProperties}>
              <input
                type="radio"
                name="service"
                value={s.slug}
                checked={s.slug === service}
                onChange={() => {
                  setService(s.slug)
                  setSelection(null)
                }}
              />
              <span className="cal-box" aria-hidden="true" />
              <span className="cal-name">
                {s.title}
                <small>
                  {s.durationMin} {t.minutes} · {s.price}
                </small>
              </span>
            </label>
          ))}
        </fieldset>
      </aside>

      {/* ---------------- main: toolbar + time grid ---------------- */}
      <section className="gcal-main" aria-label={t.title}>
        <div className="gcal-toolbar">
          <button type="button" className="today-btn" onClick={() => jumpTo(today)}>
            {t.today}
          </button>
          <button type="button" className="icon-btn" aria-label={t.prev} disabled={!canGoBack} onClick={() => go(-visibleCount)}>
            <Chevron dir="left" />
          </button>
          <button type="button" className="icon-btn" aria-label={t.next} onClick={() => go(visibleCount)}>
            <Chevron dir="right" />
          </button>
          <h2 className="gcal-title" aria-live="polite">
            {monthTitle(visible)}
          </h2>
          <label className="svc-select">
            <span className="sr-only">{t.service}</span>
            <select value={service} onChange={(e) => setService(e.target.value)}>
              {services.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.title} · {s.durationMin} {t.minutes}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="gcal-frame" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="gcal-head" style={{ '--cols': visibleCount } as React.CSSProperties}>
            <div className="tz">{t.timezone}</div>
            {visible.map((d) => (
              <div key={d} className={d === today ? 'dh today' : d < today ? 'dh past' : 'dh'}>
                <span className="dh-dow">{fmt.weekday.format(labelDate(d)).replace('.', '').toLocaleUpperCase()}</span>
                <span className="dh-num">{Number(d.slice(8))}</span>
              </div>
            ))}
          </div>

          <div
            className="gcal-body"
            style={{ '--cols': visibleCount, height: hours.length * HOUR_PX } as React.CSSProperties}
            onKeyDown={onGridKey}
          >
            <div className="gutter" aria-hidden="true">
              {hours.map((h, i) => (
                <span key={h} style={{ top: i * HOUR_PX }}>
                  {i === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
                </span>
              ))}
            </div>
            {visible.map((d, col) => {
              const slots = dayMap.get(d) ?? []
              return (
                <div key={d} className={d < today ? 'col past' : 'col'} role="group" aria-label={fmt.dayMonth.format(labelDate(d))}>
                  {hours.map((h, i) => (
                    <i key={h} className="hline" style={{ top: i * HOUR_PX }} />
                  ))}
                  {loading && <div className="col-skeleton" />}
                  {slots.map((s) => {
                    const top = px(minutesOfDay(s))
                    const chosen = selection?.start === s
                    return (
                      <button
                        key={s}
                        ref={(el) => {
                          if (el) chipRefs.current.set(s, el)
                          else chipRefs.current.delete(s)
                        }}
                        type="button"
                        data-slot
                        data-col={col}
                        data-min={minutesOfDay(s)}
                        className={chosen ? 'chip chosen' : 'chip'}
                        style={
                          {
                            top,
                            '--h-step': `${Math.max(18, (stepMin / 60) * HOUR_PX - 3)}px`,
                            '--h-full': `${(durationMin / 60) * HOUR_PX - 2}px`,
                          } as React.CSSProperties
                        }
                        aria-label={`${capitalize(fmt.weekdayLong.format(labelDate(d)))}, ${fmt.dayMonth.format(labelDate(d))}, ${range(s)}`}
                        aria-haspopup="dialog"
                        onClick={(e) => pick(s, e.currentTarget)}
                      >
                        {chosen ? (
                          <>
                            <strong>{t.yourSession}</strong>
                            <span>{range(s)}</span>
                          </>
                        ) : (
                          <>
                            <span className="c-start">{fmt.time.format(new Date(s))}</span>
                            <span className="c-range">{range(s)}</span>
                          </>
                        )}
                      </button>
                    )
                  })}
                  {d === today && nowMin >= startMin && nowMin <= endMin && (
                    <div className="now" style={{ top: px(nowMin) }} aria-hidden="true" />
                  )}
                </div>
              )
            })}

            {(weekEmpty || failed) && (
              <div className="gcal-empty">
                {failed ? (
                  <>
                    <p>{t.loadError}</p>
                    <button type="button" className="btn btn-ghost" onClick={() => {
                      fetched.current.clear()
                      setData({})
                      setReload((n) => n + 1)
                    }}>
                      {t.retry}
                    </button>
                  </>
                ) : (
                  <>
                    <p>{t.noSlots}</p>
                    {nextFree ? (
                      <button type="button" className="btn btn-primary" onClick={() => jumpTo(nextFree)}>
                        {t.nextFree}: {fmt.dayMonth.format(labelDate(nextFree))}
                      </button>
                    ) : (
                      <button type="button" className="btn btn-ghost" onClick={() => go(visibleCount)}>
                        {t.next} →
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {loading && <p className="sr-only" aria-live="polite">{t.loading}</p>}
      </section>

      {selection && current && (
        <BookingDialog
          key={selection.start}
          locale={locale}
          t={t}
          service={current}
          color={color}
          selection={selection}
          end={end(selection.start)}
          range={range(selection.start)}
          dateLabel={`${capitalize(fmt.weekdayLong.format(labelDate(todayKey(new Date(selection.start)))))}, ${fmt.dayMonth.format(labelDate(todayKey(new Date(selection.start))))}`}
          privacyHref={privacyHref}
          location={location}
          onClose={closeDialog}
          onTaken={() => {
            setSelection(null)
            setReload((n) => n + 1)
          }}
        />
      )}
    </div>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d={dir === 'left' ? 'M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z' : 'M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z'}
        fill="currentColor"
      />
    </svg>
  )
}
