import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'

export function RichText({ data }: { data?: SerializedEditorState | null }) {
  if (!data) return null
  return <LexicalRichText data={data} className="prose" />
}
