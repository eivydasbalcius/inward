import type { ElementType, ReactNode } from 'react'

/** Heading with a hand-painted stroke underneath that paints itself in when scrolled into view. */
export function BrushTitle({
  as: Tag = 'h2',
  className = 'section-title',
  children,
}: {
  as?: ElementType
  className?: string
  children: ReactNode
}) {
  return (
    <Tag className={`brush-title ${className}`} data-reveal>
      <span>{children}</span>
      <svg className="brush" viewBox="0 0 220 18" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M4 11 C 40 4, 80 14, 118 8 S 190 5, 216 10"
          pathLength={1}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </svg>
    </Tag>
  )
}
