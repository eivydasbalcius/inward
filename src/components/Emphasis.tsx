import { Fragment } from 'react'

/** Renders `*phrase*` in CMS text as an italic accent (used for the hero title). */
export function Emphasis({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g)
  return (
    <>
      {parts.map((part, i) => (i % 2 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>))}
    </>
  )
}
