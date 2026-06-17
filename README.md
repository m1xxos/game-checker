# 🕹️ Game Checker

Pick a game and instantly see **whether it'll run on your Android handheld**
(Retroid, AYN Odin, AYANEO, and friends). Compatibility comes from the
community: live data from [EmuReady](https://www.emuready.com) plus deep links
to [GameNative](https://gamenative.app).

- **Save your console(s)** to an account — verdicts and recommendations are
  tuned to your exact device and chipset.
- **"Will it run?" verdict** per game, based on reports for your device (or the
  same chipset when there's no exact match).
- **Personalized library & recommendations** — games that run great on your
  console.
- Clean, bright, rounded **Wii-style** UI.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma 7 + PostgreSQL ·
Auth.js (NextAuth v5). EmuReady's public mobile tRPC API is proxied and cached
server-side (see `src/lib/emuready.ts`).

## Quick start (Docker)

Requires Docker with Compose.

```bash
cp .env.example .env          # then edit values (see below)
docker compose up --build
```

The app is at **http://localhost:3000**. Compose starts three things:

1. `db` — PostgreSQL (data persisted in the `pgdata` volume)
2. `migrate` — applies Prisma migrations once, then exits
3. `web` — the Next.js app (waits for `migrate` to finish)

### Required environment

Only `AUTH_SECRET` is required — **local email/password accounts work out of the
box** (create one from the sign-in page). OAuth is optional.

| Variable | Notes |
| --- | --- |
| `AUTH_SECRET` | **Required.** `npx auth secret` or `openssl rand -base64 33` |
| `AUTH_URL` | Public URL, e.g. `http://localhost:3000` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | Optional GitHub OAuth — callback `${AUTH_URL}/api/auth/callback/github` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional Google OAuth — callback `${AUTH_URL}/api/auth/callback/google` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Optional; default to `gamechecker` |

OAuth providers without credentials are simply hidden on the sign-in page.

## Local development

```bash
npm install
# Point DATABASE_URL at a local Postgres (or: docker compose up db -d)
npx prisma migrate deploy      # apply schema
npm run dev                    # http://localhost:3000
```

Useful scripts:

```bash
npm run build      # production build (Next standalone output)
npm run lint       # ESLint
npx prisma studio  # inspect the database
```

## How compatibility works

`src/lib/emuready.ts` wraps EmuReady's public tRPC endpoints (games, devices,
emulators, listings). Each saved console mirrors an EmuReady device plus a
cached chipset/GPU snapshot. For a given game we fetch its listings and split
them into **exact-device**, **same-chipset**, and **other** buckets
(`src/lib/compat.ts`), then derive a verdict from the best available match.
GameNative has no public API, so we deep-link to its compatibility search
prefilled with the game title (and GPU when known) — see `src/lib/links.ts`.

## Attribution

Compatibility data belongs to the **EmuReady** and **GameNative** communities.
This project is an unaffiliated client that links back to both.
