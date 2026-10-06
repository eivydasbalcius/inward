import type { JobsConfig, TaskConfig } from 'payload'

import { ensureCalendarDocs } from '../lib/google/calendars'
import { isGoogleConfigured } from '../lib/google/config'
import { retryPendingBookings } from '../lib/google/events'
import { syncCalendar } from '../lib/google/sync'
import { ensureWatch } from '../lib/google/watch'

const dev = process.env.NODE_ENV !== 'production'

const task = (slug: string, cron: string, handler: TaskConfig['handler']): TaskConfig =>
  ({ slug, retries: 0, schedule: [{ cron, queue: 'default' }], handler }) as TaskConfig

export const jobs: JobsConfig = {
  deleteJobOnComplete: true,
  tasks: [
    // Safety net for missed webhooks (and the only sync locally without a tunnel)
    task('googleSync', dev ? '* * * * *' : '*/10 * * * *', async ({ req }) => {
      if (!(await isGoogleConfigured(req.payload))) return { output: {} }
      for (const cal of await ensureCalendarDocs(req.payload)) await syncCalendar(req.payload, cal)
      return { output: {} }
    }),
    // Nightly full resync also picks up far-future recurring instances
    task('googleFullSync', '0 3 * * *', async ({ req }) => {
      if (!(await isGoogleConfigured(req.payload))) return { output: {} }
      for (const cal of await ensureCalendarDocs(req.payload)) await syncCalendar(req.payload, cal, { full: true })
      return { output: {} }
    }),
    task('googleRenewWatches', '*/30 * * * *', async ({ req }) => {
      if (!(await isGoogleConfigured(req.payload))) return { output: {} }
      for (const cal of await ensureCalendarDocs(req.payload)) await ensureWatch(req.payload, cal)
      return { output: {} }
    }),
    task('googleRetryBookings', '*/5 * * * *', async ({ req }) => {
      if (!(await isGoogleConfigured(req.payload))) return { output: {} }
      await retryPendingBookings(req.payload)
      return { output: {} }
    }),
    // Unpaid holds free their slot (Phase 4 creates holds)
    task('expireHolds', '* * * * *', async ({ req }) => {
      await req.payload.update({
        collection: 'bookings',
        where: {
          and: [{ status: { equals: 'held' } }, { holdExpiresAt: { less_than: new Date().toISOString() } }],
        },
        data: { status: 'expired' },
        context: { fromGoogleSync: true },
      })
      return { output: {} }
    }),
  ],
  // Runs scheduled jobs inside the long-running server. On serverless, call /api/payload-jobs/run from a cron instead.
  autoRun: process.env.DISABLE_JOBS_AUTORUN === 'true' ? [] : [{ cron: '* * * * *', queue: 'default', limit: 20 }],
  shouldAutoRun: async () => process.env.NEXT_PHASE !== 'phase-production-build',
}
