'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * One observer for the whole site: elements with [data-reveal] fade/rise in once when scrolled into view;
 * children of [data-reveal-stagger] get an increasing delay. CSS only hides them under html.js,
 * and prefers-reduced-motion shows everything immediately.
 */
export function RevealObserver() {
  const pathname = usePathname()

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)'))
    document.querySelectorAll<HTMLElement>('[data-reveal-stagger]').forEach((parent) => {
      Array.from(parent.children).forEach((child, i) => (child as HTMLElement).style.setProperty('--i', String(i)))
    })
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [pathname])

  return null
}
