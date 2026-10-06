// Signature hero background: pigment blooms bleeding into paper.
// Each bloom is a static filtered SVG on its own layer; only CSS transforms animate (no per-frame filter cost).
const BLOOMS = [
  { cls: 'bloom-a', color: 'var(--sky-200)', seed: 3 },
  { cls: 'bloom-b', color: 'var(--sky-400)', seed: 11 },
  { cls: 'bloom-c', color: 'var(--emerald-soft)', seed: 23 },
]

export function Watercolor() {
  return (
    <div className="watercolor" aria-hidden="true">
      {BLOOMS.map((b) => (
        <svg key={b.cls} className={`bloom ${b.cls}`} viewBox="0 0 400 400">
          <defs>
            <filter id={`bleed-${b.seed}`} x="-30%" y="-30%" width="160%" height="160%">
              <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="4" seed={b.seed} result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="95" xChannelSelector="R" yChannelSelector="G" result="shape" />
              <feGaussianBlur in="shape" stdDeviation="7" result="soft" />
              {/* pigment pools at the edge as watercolour dries: soft fill + darker rim */}
              <feMorphology in="shape" operator="erode" radius="10" result="inner" />
              <feGaussianBlur in="inner" stdDeviation="14" result="innerSoft" />
              <feComposite in="soft" in2="innerSoft" operator="out" result="rim" />
              <feComponentTransfer in="soft" result="wash">
                <feFuncA type="linear" slope="0.55" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="wash" />
                <feMergeNode in="rim" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="200" cy="200" r="130" fill={b.color} filter={`url(#bleed-${b.seed})`} />
        </svg>
      ))}
      <div className="paper-grain" />
    </div>
  )
}
