import type { Dictionary } from '@/i18n/dictionaries'
import type { Service } from '@/payload-types'

export function ServiceMeta({ service, t }: { service: Service; t: Dictionary }) {
  const items = [
    `${service.durationMin} ${t.service.minutes}`,
    ...(service.mode ?? []).map((m) => t.service.mode[m]),
  ]
  if (service.sessionsCount && service.sessionsCount > 1) items.push(`${service.sessionsCount} ${t.service.sessions}`)
  if (service.groupSize) items.push(`${t.service.groupSize} ${service.groupSize} ${t.service.people}`)
  return (
    <ul className="meta">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  )
}
