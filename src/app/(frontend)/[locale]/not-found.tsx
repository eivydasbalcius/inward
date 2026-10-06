import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="section narrow not-found">
      <h1 className="drip-underline">404</h1>
      <p className="lead">Puslapis nerastas · Page not found</p>
      <Link href="/" className="btn btn-primary">
        Inward
      </Link>
    </section>
  )
}
