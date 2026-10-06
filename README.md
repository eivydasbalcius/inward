# Inward – kūrybinės terapijos studija

Website for the Inward art therapy studio (Vilnius): content pages in Lithuanian and English, online booking with a Google-Calendar-style picker, and two-way Google Calendar sync. Content and bookings are managed in the Payload admin.

Built with Next.js 16, Payload CMS 3 and PostgreSQL.

## Requirements

- Node.js 20+ and pnpm
- PostgreSQL (e.g. `brew install postgresql@17`)

## Setup

```bash
cp .env.example .env   # fill in DATABASE_URL and PAYLOAD_SECRET (Google values optional)
createdb inward
pnpm install
pnpm dev               # http://localhost:3000, admin at /admin
pnpm seed              # optional sample content (never overwrites edits)
```

Google Calendar: fill in the `GOOGLE_*` values in `.env`, then use **Admin → Kalendorius → Google kalendorius → Prisijungti prie Google**.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Develop / build / run |
| `pnpm lint` | ESLint |
| `pnpm generate:types` | Regenerate Payload types after schema changes |
| `pnpm exec vitest run --config ./vitest.config.mts` | Unit and integration tests (use the dev DB) |
| `PW_CHANNEL=chrome pnpm exec playwright test` | End-to-end tests |

## Documentation

How the project works (structure, data model, booking and Google sync logic, decisions, status): see [docs/KNOWLEDGE.md](docs/KNOWLEDGE.md).
