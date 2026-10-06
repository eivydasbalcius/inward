import type { Testimonial } from '@/payload-types'

export function Testimonials({ items }: { items: Testimonial[] }) {
  return (
    <div className="testimonials" data-reveal-stagger>
      {items.map((x) => (
        <figure key={x.id} className="card testimonial" data-reveal>
          <blockquote>“{x.quote}”</blockquote>
          <figcaption>— {x.name}</figcaption>
        </figure>
      ))}
    </div>
  )
}
