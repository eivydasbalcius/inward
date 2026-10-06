import type { Media } from '@/payload-types'

export function asMedia(value: number | Media | null | undefined): Media | null {
  return value && typeof value === 'object' && value.url ? value : null
}
