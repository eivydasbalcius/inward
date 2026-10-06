import { revalidatePath } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

// Public pages are statically generated; any content change refreshes the whole site (it is small).
// Outside a Next.js request (e.g. `pnpm seed`) revalidatePath throws, which is safe to ignore.
function revalidateSite() {
  try {
    revalidatePath('/', 'layout')
    revalidatePath('/sitemap.xml')
  } catch {
    // not running inside Next.js
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = ({ doc }) => {
  revalidateSite()
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidateSite()
  return doc
}

export const revalidateGlobal: GlobalAfterChangeHook = ({ doc }) => {
  revalidateSite()
  return doc
}
