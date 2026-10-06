import type { ReactNode } from 'react'

import { BrushTitle } from './BrushTitle'

export function PageHeader({ title, lead, eyebrow }: { title: string; lead?: ReactNode; eyebrow?: string }) {
  return (
    <div className="page-header">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <BrushTitle as="h1" className="page-title">
        {title}
      </BrushTitle>
      {lead && <p className="lead">{lead}</p>}
    </div>
  )
}
