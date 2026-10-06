# Inward – project knowledge base

Single source of truth for what exists. **Update this file with every feature or relevant change** (and add a changelog line). Plans reference it instead of repeating it.

## 1. Product & decisions
- Inward – "Kūrybinės terapijos studija" (art therapy, Vilnius). Owner Google account: inwartherapy@gmail.com.
- Languages: LT (default) + EN. URLs `/lt/...`, `/en/...`; `/` redirects by Accept-Language (`src/proxy.ts`).
- Booking: clients pick a free time on `/book`, and the booking is **confirmed instantly, no payment**. `PAYMENTS_ENABLED=false`. **No payment wording anywhere** until Paysera is connected.
- Google Calendar: connected via **OAuth** (admin button), not a service account. Bookings are written to the "Inward sesijos" calendar. The main calendar's busy time hides slots. **Google shows only bookings** (no open-hours events).
- Client gets an **"Add to Google Calendar"** link on confirmation (no .ics, no Google invites).
- Future decisions (not built): Paysera prepay with a ~15 min hold; free cancel ≥24h before with a refund; reminders −32h and −9h; encrypted therapy notes; admin 2FA; EU hosting.
- Design: pastel sky blues + emerald accent; Instrument Serif (display) + Figtree (body); watercolour hero; scroll reveals; booking UI mimics Google Calendar's week view.

## 2. Stack & running
- Next.js 16 (App Router, Turbopack) + Payload CMS 3.90 (inside Next) + Postgres 17 (Homebrew, db `inward`). pnpm. Node 26.
- Read `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md). `params` and `searchParams` are Promises; `PageProps<'/[locale]/…'>` and `LayoutProps` are global types (`pnpm exec next typegen`).
- Commands:
  - `pnpm dev`; `pnpm build`; `pnpm lint`; `pnpm exec tsc --noEmit`
  - `pnpm generate:types` (after schema changes); `pnpm generate:importmap` (after adding admin components)
  - `pnpm seed`: only fills empty collections and globals, never overwrites edits.
  - Tests: `pnpm exec vitest run --config ./vitest.config.mts` (int; files run sequentially against the dev DB) and `PW_CHANNEL=chrome pnpm exec playwright test` (e2e uses system Chrome).
  - Stale Turbopack errors → `rm -rf .next` and restart.
- Dev DB schema: Payload `push` in dev. A destructive change (e.g. making a field localized) prompts interactively and hangs non-interactive scripts. Run them with `< /dev/null`.
- Env (`.env`, template `.env.example`):
  - Core: `DATABASE_URL`, `PAYLOAD_SECRET` (also the encryption key source), `NEXT_PUBLIC_SITE_URL`.
  - Feature switches: `BOOKING_ENABLED` (default on), `PAYMENTS_ENABLED`.
  - Google: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_BOOKINGS_CALENDAR_ID` (Inward sesijos), `GOOGLE_WEBHOOK_TOKEN`, `PUBLIC_URL` (https, needed for push).
  - Other: `TZ_STUDIO=Europe/Vilnius`, `DISABLE_JOBS_AUTORUN`.
- OAuth redirect URI: `<NEXT_PUBLIC_SITE_URL>/api/google/oauth/callback`. The Google Cloud project is `inward-website`, and the app must be "In production", otherwise tokens expire after 7 days.

## 3. Directory map
```
src/payload.config.ts        collections, globals, endpoints, jobs, i18n (lt/en admin), localization, onInit (overlap constraint)
src/proxy.ts                 locale redirect for non-admin/api paths
src/i18n/config.ts           locales, isLocale
src/i18n/dictionaries.ts     ALL UI strings (lt + en). Editorial text lives in Payload, not here.
src/app/(frontend)/[locale]/ public pages: page (home), about, services, services/[slug], prices, faq, blog, blog/[slug], contact, privacy, book, not-found; layout (fonts, header/footer, js-class script, RevealObserver)
src/app/(frontend)/actions.ts        submitInquiry (contact form server action, honeypot)
src/app/(frontend)/[locale]/book/actions.ts  bookSession server action (honeypot, per-IP throttle 5/10min) → createWebsiteBooking
src/app/(frontend)/styles.css        design tokens + all site styles (reveal, watercolour, brush titles)
src/app/sitemap.ts, robots.ts        sitemap with hreflang (incl. /book)
src/collections/             Services, Posts, Testimonials, Faqs, Media, Inquiries, Users, Bookings, AvailabilityExceptions, BusyBlocks, GoogleCalendars, access.ts (isAdmin/anyone/publishedOrAdmin)
src/globals/                 Home, About, SiteSettings, Availability (weekly hours), GoogleConnection
src/fields/                  slug (auto from title), timeRanges (HH:MM ranges array)
src/hooks/revalidate.ts      afterChange/afterDelete → revalidatePath('/', 'layout') (pages are static)
src/endpoints/index.ts       custom REST endpoints (below)
src/jobs/index.ts            Payload Jobs tasks + autoRun
src/lib/content.ts           cached Payload queries (getServices, getService, getPosts, getPost, getFaqs, getTestimonials, getHome, getAbout, getSettings), resolveLocale, formatPrice/Date, bookingEnabled, paymentsEnabled, bookHref, siteUrl
src/lib/slots.ts             PURE slot engine (computeSlots, isSlotAvailable, wallClock, dayBounds, toDateKey, activeBookings)
src/lib/availability.ts      loadSlotInput (DB → SlotInput), getSlots
src/lib/booking/create.ts    createWebsiteBooking (validation, per-day lock, re-check, per-email limit, deadlock retry)
src/lib/bookingGuard.ts      ensureBookingOverlapConstraint (Postgres EXCLUDE), isOverlapViolation
src/lib/crypto.ts            encrypt/decrypt (AES-256-GCM, key=scrypt(PAYLOAD_SECRET, purpose)), sign/verify (HMAC, expiring)
src/lib/google/              config, client, connection, calendars, sync, events, watch, bookingHooks (below)
src/lib/seo.ts               localeAlternates (canonical + hreflang)
src/lib/media.ts             asMedia
src/components/              Header, MobileMenu (<details>), Footer, PageHeader, BrushTitle, Reveal (RevealObserver), Watercolor, Emphasis (*word* → <em>), ServiceCard, ServiceMeta, FaqList, Testimonials, CtaBand, ContactForm, RichText, JsonLd
src/components/booking/      BookingCalendar (Google-style week grid), BookingDialog (event card / bottom sheet + form), dates.ts (TZ helpers, googleCalendarUrl), calendar.css
src/components/admin/        GoogleConnect (connect/sync/disconnect panel on the GoogleConnection global)
src/seed/index.ts            sample LT/EN content marked [PAVYZDYS]/[SAMPLE]
tests/int/                   slots, bookings, websiteBooking, googleEvents, crypto, api
tests/helpers/freeSlots.ts   onePerDay(): free slots from the CURRENT admin schedule (tests must not assume hours)
tests/e2e/frontend.e2e.spec.ts  pages, booking end-to-end, mobile, contact form, OAuth guards (cleans up via pg)
public/brand/                inward-logo.png/jpg, spiral.png; src/app/icon.png, apple-icon.png, favicon.ico (spiral)
```

## 4. Data model (Payload slugs)
- **services**: title, slug, summary, body, format (individual/group), mode[] (in-person/online), durationMin, priceEur, sessionsCount, groupSize, whoFor[], notFor[], supplies, image, order, published. Localized text.
- **posts**: title, slug, excerpt, cover, body, publishedAt, published.
- **testimonials**, **faqs** (showOnHome), **media** (alt localized, sizes card/hero), **inquiries** (contact form, `handled`).
- **bookings**:
  - Fields: service, status (`held` | `confirmed` | `cancelled` | `expired`), start, end (auto = start + service duration), clientName, clientEmail, clientPhone, clientNote, source (`website` | `admin`), consentAt, locale, holdExpiresAt, googleSyncState (`pending` | `ok` | `changed-in-google` | `deleted-in-google` | `error`), googleEventId, googleError.
  - Hooks: beforeChange computes `end`, gives a friendly overlap error (409), and resets googleSyncState to pending (unless `context.fromGoogleSync`). afterChange/afterDelete → `bookingHooks`.
  - DB constraint `bookings_no_overlap`: EXCLUDE gist on tstzrange(start, end) where status is held/confirmed.
- **availability-exceptions**: note, dateFrom, dateTo, type (`blocked` | `custom`), ranges.
- **busy-blocks**: calendarId, eventId, start, end, allDay. A read-only mirror of Google busy time; no titles are stored.
- **google-calendars**: calendarId (`<Inward sesijos id>` | `primary`), role (bookings/busy), syncToken, channelId, resourceId, channelExpiresAt, lastSyncedAt, lastFullSyncAt, lastError.
- Globals:
  - **availability**: mon…sun ranges, bufferMin 15, slotStepMin 30, minNoticeHours 24, horizonDays 60.
  - **google-connection**: email, status, connectedAt, lastError, refreshTokenEnc (encrypted, read-hidden; update only via overrideAccess).
  - **home** (heroTitle supports `*emphasis*`, steps[]), **about**, **site-settings** (contacts, socials, cancellationPolicy, privacyPolicy).

## 5. Key logic
- **Slot engine** (`computeSlots`):
  - For each day in [from, to] ∩ [today, today + horizon], the hours come from a custom exception, otherwise the weekly schedule.
  - Each range is stepped by `stepMin`. A slot needs start ≥ now + minNotice and no overlap with (busy ∪ active bookings) ± buffer.
  - Times are built with `TZDate` in Europe/Vilnius, so they're DST-safe. Expired holds are ignored.
- **Website booking** (`createWebsiteBooking`):
  1. Validate input and consent.
  2. Per-day in-process lock.
  3. Per-email limit: `MAX_ACTIVE_PER_EMAIL = 3` future active bookings.
  4. Re-check the slot with `isSlotAvailable`.
  5. `payload.create` as confirmed/website.
  6. On the overlap constraint or a 409 → `taken`. On deadlock or serialization failure → re-check, retry up to 2×.
  - Results: `ok` | `invalid` | `consent` | `taken` | `limit` | `rate` | `server`.
- **Google:**
  - **Client:** `getCalendar(payload)` builds an OAuth2Client from env plus the decrypted refresh token (cached per token). `markConnectionBroken` sets status=error on `invalid_grant`. `isGoogleConfigured(payload)` = OAuth env + bookings calendar id + a stored token.
  - **Connection:** `authUrl`, `completeConnection`, `disconnect`.
    - `completeConnection` exchanges the code, requires a refresh token and the calendar scope, encrypts and stores the token, and checks that the bookings calendar is visible.
    - It then deletes old google-calendars docs, ensures docs, does a full sync plus watch, and runs `retryPendingBookings`.
  - **Events:** `pushBookingToGoogle` (confirmed → events.update, or insert on 404, with deterministic id `booking<id>` and `extendedProperties.private.inwardBookingId`; else delete). `deleteBookingEvent`, `retryPendingBookings`. The result is written back with `context.fromGoogleSync`.
  - **bookingHooks:** the push is **deferred via setTimeout 250ms, outside the DB transaction**; the retry job is the safety net.
  - **Sync:** `syncCalendar` does an incremental events.list with syncToken; 410 → full. A full sync is mark-and-sweep (busy time never disappears mid-sync). One run per calendar at a time, plus a single rerun flag. Our own booking events (inwardBookingId) are never busy; if moved or deleted in Google, the booking is flagged changed/deleted-in-google (no auto refunds). Transparent, declined or cancelled events are not busy, and all-day events block whole Vilnius days. `eventToBusy` is exported and tested.
  - **Watch:** `ensureWatch` uses events.watch → `${PUBLIC_URL}/api/google/webhook` (https only), TTL 7 days, renewed when under 24h left. `stopChannel`.
- **Endpoints** (`/api/...`, Payload custom):
  - `GET /slots?service&from&to`: public, ≤31 days, returns `{service, stepMin, days}`, no-store.
  - `POST /google/webhook`: token header check; an unknown channel is stopped; triggers sync.
  - `POST /google/sync[?full=1]`, `POST /google/watch`: admin only.
  - `GET /google/oauth/start`: admin; signed state plus an httpOnly nonce cookie.
  - `GET /google/oauth/callback`: verifies, connects, then redirects to `/admin/globals/google-connection?connected=` or `?error=`.
  - `POST /google/disconnect`: admin.
- **Jobs** (Payload, autoRun every minute; on serverless call `/api/payload-jobs/run` from a cron):
  - `googleSync`: every 10 min (every 1 min in dev).
  - `googleFullSync`: 03:00.
  - `googleRenewWatches`: every 30 min.
  - `googleRetryBookings`: every 5 min.
  - `expireHolds`: every 1 min (held → expired).
- **Booking UI** (`BookingCalendar`):
  - Data: one `/api/slots` call per (service, month), cached in state with a `fetched` ref keyed by reload generation. Unfinished requests are cleared in the effect cleanup (React dev double-invoke).
  - Layout: 7 days, or 3 days under 640px (`useSyncExternalStore` matchMedia). Visible hours are computed from the week's slots, minimum 9–18. 60s poll. Swipe and arrow-key navigation.
  - Chips have height = step; on hover they grow to the full duration (`--h-step` / `--h-full`). Selecting a chip opens `BookingDialog` (native `<dialog>` showModal, anchored on desktop, bottom sheet on mobile).
- **Rendering:** public pages are SSG and revalidated by hooks; `/book` is `force-dynamic`. Reveal animations are gated by the `html.js` class and respect reduced motion.

## 6. Gotchas learned
- Lithuanian: Cormorant drew carons badly and Playfair was fine; we now use Instrument Serif + Figtree (verified). Always check š/ž/ę/į/ų in screenshots.
- `Intl` `day: 'numeric'` in lt-LT gives "05"; use `Number(key.slice(8))`.
- `Response.redirect()` has immutable headers; build `new Response(null, {status: 302, headers})`.
- Updating the same booking inside its afterChange needs `req` (same transaction), otherwise it deadlocks. Slow external calls belong outside the transaction.
- Concurrent inserts can deadlock on the EXCLUDE constraint, hence the per-day lock plus retry.
- Lint (react-hooks): no synchronous setState in effects, simple dependency arrays, copy refs before cleanup.
- Tests share the dev DB: use `tests/helpers/freeSlots.ts`, unique emails, and clean up in afterAll; never assume working hours.
- The admin user is `admin@admin.com` (the user's). Temporary admins for screenshots must be deleted afterwards.

## 7. Status & open items
- Done: scaffold, public pages, redesign, slot engine, live booking without payment, the Google OAuth code, Add to Google Calendar.
- **Waiting on the user:** the OAuth Web-client ID and secret in `.env`, then clicking Connect in admin. Booking #70 (the user's) is pending a push to Google. The user should delete the old service account `inward-calendar@…` (its key was exposed in chat) and `.secrets/google-service-account.json`.
- Not built yet:
  - confirmation and cancellation emails, plus the cancel link (24h rule)
  - Paysera
  - reminders at −32h and −9h (use Payload jobs with `waitUntil`)
  - client notes (encrypted, searchable), plus admin 2FA and an audit log
  - real content (all `[PAVYZDYS]` placeholders), a vector logo, deploy (EU), and webhooks over HTTPS
- The CMS cancellation policy and FAQ text mention an emailed cancel link and refunds that don't exist yet.

## 8. Changelog
- 2026-10-04: scaffold, public pages, SEO, contact form, seed.
- 2026-10-05: slot engine, availability, Google service-account sync (replaced later); live booking without payment; Google-Calendar-style picker; pastel redesign.
- 2026-10-06: OAuth connect replaces the service account; Add to Google Calendar; schedule-independent tests; created this knowledge base.
