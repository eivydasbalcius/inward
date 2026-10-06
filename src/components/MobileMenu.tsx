'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'

// <details>-based menu: works without JS; the effect just closes it after navigation.
export function MobileMenu({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null)
  const pathname = usePathname()
  useEffect(() => {
    if (ref.current) ref.current.open = false
  }, [pathname])

  return (
    <details ref={ref} className="mobile-menu">
      <summary aria-label={label}>
        <span className="burger" aria-hidden="true" />
        {label}
      </summary>
      <nav aria-label="Mobile">{children}</nav>
    </details>
  )
}
