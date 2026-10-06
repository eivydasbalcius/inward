import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

/**
 * Database-level double-booking guard: no two held/confirmed bookings may overlap in time.
 * The app checks too (friendly error); this constraint catches races between simultaneous requests.
 */
export async function ensureBookingOverlapConstraint(payload: Payload) {
  const db = payload.db as unknown as { drizzle?: { execute: (q: unknown) => Promise<unknown> } }
  if (!db.drizzle) return
  try {
    await db.drizzle.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap') THEN
          ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
            EXCLUDE USING gist (tstzrange("start", "end", '[)') WITH &&)
            WHERE (status IN ('held', 'confirmed') AND "end" IS NOT NULL);
        END IF;
      END $$;
    `)
  } catch (err) {
    payload.logger.error({ err }, 'Could not create bookings_no_overlap constraint')
  }
}

export const isOverlapViolation = (err: unknown) =>
  String((err as { message?: string })?.message ?? err).includes('bookings_no_overlap') ||
  (err as { code?: string; cause?: { code?: string } })?.code === '23P01' ||
  (err as { cause?: { code?: string } })?.cause?.code === '23P01'
