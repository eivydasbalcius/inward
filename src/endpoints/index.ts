import type { Endpoint } from 'payload'

import { loadSlotInput } from '../lib/availability'
import { computeSlots } from '../lib/slots'
import { randomBytes } from 'node:crypto'

import { sign, verify } from '../lib/crypto'
import { ensureCalendarDocs } from '../lib/google/calendars'
import { bookingsCalendarId, hasOAuthClient, isGoogleConfigured, siteOrigin, webhookToken } from '../lib/google/config'
import { authUrl, completeConnection, disconnect } from '../lib/google/connection'
import { syncCalendar } from '../lib/google/sync'
import { ensureWatch, stopChannel } from '../lib/google/watch'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** GET /api/slots?service=<slug>&from=YYYY-MM-DD&to=YYYY-MM-DD – public, free slots only. */
const slots: Endpoint = {
  path: '/slots',
  method: 'get',
  handler: async (req) => {
    const q = req.searchParams
    const slug = q.get('service') ?? ''
    const from = q.get('from') ?? ''
    const to = q.get('to') ?? from
    if (!slug || !DATE.test(from) || !DATE.test(to) || to < from) return json({ error: 'bad request' }, 400)
    if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > 31) return json({ error: 'max 31 days' }, 400)

    const { docs } = await req.payload.find({
      collection: 'services',
      where: { and: [{ slug: { equals: slug } }, { published: { equals: true } }] },
      limit: 1,
      depth: 0,
    })
    const service = docs[0]
    if (!service) return json({ error: 'service not found' }, 404)

    const input = await loadSlotInput(req.payload, { durationMin: service.durationMin, from, to })
    return json({
      service: { slug: service.slug, durationMin: service.durationMin },
      stepMin: input.stepMin,
      days: computeSlots(input),
    })
  },
}

/** POST /api/google/webhook – Google push notification (headers only, empty body). */
const googleWebhook: Endpoint = {
  path: '/google/webhook',
  method: 'post',
  handler: async (req) => {
    const h = req.headers
    const channelId = h.get('x-goog-channel-id') ?? ''
    const resourceId = h.get('x-goog-resource-id') ?? ''
    const state = h.get('x-goog-resource-state')
    if (!webhookToken() || h.get('x-goog-channel-token') !== webhookToken()) return new Response(null, { status: 403 })

    const { docs } = await req.payload.find({
      collection: 'google-calendars',
      where: { channelId: { equals: channelId } },
      limit: 1,
    })
    const cal = docs[0]
    if (!cal) {
      // stale channel from an earlier registration – tell Google to stop sending
      if (channelId && resourceId) await stopChannel(req.payload, channelId, resourceId).catch(() => {})
      return new Response(null, { status: 200 })
    }
    if (state !== 'sync') await syncCalendar(req.payload, cal)
    return new Response(null, { status: 200 })
  },
}

/** POST /api/google/sync?full=1 and /api/google/watch – admin buttons. */
const adminOnly =
  (fn: Endpoint['handler']): Endpoint['handler'] =>
  async (req) => {
    if (!req.user) return json({ error: 'unauthorized' }, 401)
    if (!(await isGoogleConfigured(req.payload))) return json({ error: 'Google kalendorius neprijungtas.' }, 400)
    return fn(req)
  }

const googleSyncNow: Endpoint = {
  path: '/google/sync',
  method: 'post',
  handler: adminOnly(async (req) => {
    const full = req.searchParams.get('full') === '1'
    const cals = await ensureCalendarDocs(req.payload)
    await Promise.all(cals.map((c) => syncCalendar(req.payload, c, { full })))
    const fresh = await req.payload.find({ collection: 'google-calendars', limit: 20 })
    return json({ ok: true, calendars: fresh.docs.map((c) => ({ calendarId: c.calendarId, lastError: c.lastError })) })
  }),
}

const googleWatchNow: Endpoint = {
  path: '/google/watch',
  method: 'post',
  handler: adminOnly(async (req) => {
    const cals = await ensureCalendarDocs(req.payload)
    const results = []
    for (const c of cals) results.push({ calendarId: c.calendarId, ...(await ensureWatch(req.payload, c, { force: true })) })
    return json({ results })
  }),
}

// ---- OAuth: "Prisijungti prie Google" -----------------------------------------------------------
const STATE_COOKIE = 'inward_google_oauth'
const ADMIN_PAGE = '/admin/globals/google-connection'
const back = (query: string, setCookie?: string) =>
  new Response(null, {
    status: 302,
    headers: { Location: `${siteOrigin()}${ADMIN_PAGE}?${query}`, ...(setCookie ? { 'Set-Cookie': setCookie } : {}) },
  })

const oauthStart: Endpoint = {
  path: '/google/oauth/start',
  method: 'get',
  handler: async (req) => {
    if (!req.user) return json({ error: 'unauthorized' }, 401)
    if (!hasOAuthClient() || !bookingsCalendarId()) {
      return back(`error=${encodeURIComponent('Serveryje nenustatyti GOOGLE_OAUTH_CLIENT_ID / SECRET arba kalendoriaus ID (.env).')}`)
    }
    const nonce = randomBytes(16).toString('base64url')
    const state = sign({ uid: req.user.id, nonce }, 'google-oauth-state', 10 * 60_000)
    const secure = siteOrigin().startsWith('https://') ? '; Secure' : ''
    return new Response(null, {
      status: 302,
      headers: {
        Location: authUrl(state),
        'Set-Cookie': `${STATE_COOKIE}=${nonce}; Path=/api/google/oauth; HttpOnly; SameSite=Lax; Max-Age=600${secure}`,
      },
    })
  },
}

const oauthCallback: Endpoint = {
  path: '/google/oauth/callback',
  method: 'get',
  handler: async (req) => {
    const q = req.searchParams
    const clear = `${STATE_COOKIE}=; Path=/api/google/oauth; Max-Age=0`
    const cookieNonce = req.headers.get('cookie')?.match(new RegExp(`${STATE_COOKIE}=([^;]+)`))?.[1]
    const state = verify<{ uid: number; nonce: string }>(q.get('state') ?? '', 'google-oauth-state')
    const fail = (msg: string) => back(`error=${encodeURIComponent(msg)}`, clear)
    if (q.get('error')) return fail(q.get('error') === 'access_denied' ? 'Prisijungimas atšauktas.' : `Google: ${q.get('error')}`)
    if (!state || !cookieNonce || state.nonce !== cookieNonce) return fail('Prisijungimo sesija nebegalioja. Bandykite dar kartą.')
    const code = q.get('code')
    if (!code) return fail('Google negrąžino prisijungimo kodo.')
    try {
      const email = await completeConnection(req.payload, code)
      return back(`connected=${encodeURIComponent(email ?? '')}`, clear)
    } catch (err) {
      req.payload.logger.error({ err }, 'Google: OAuth callback failed')
      return fail((err as Error).message)
    }
  },
}

const googleDisconnect: Endpoint = {
  path: '/google/disconnect',
  method: 'post',
  handler: async (req) => {
    if (!req.user) return json({ error: 'unauthorized' }, 401)
    await disconnect(req.payload)
    return json({ ok: true })
  },
}

export const endpoints: Endpoint[] = [
  slots,
  googleWebhook,
  googleSyncNow,
  googleWatchNow,
  oauthStart,
  oauthCallback,
  googleDisconnect,
]
