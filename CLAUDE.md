# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> Note: this is **Next.js 16** (App Router, Turbopack). `params` and `searchParams`
> are async (`Promise<…>`) and must be awaited. The bundled docs live in
> `node_modules/next/dist/docs/` — consult them when unsure.

## Commands

```bash
npm run dev            # local dev server (needs DATABASE_URL + a Postgres)
npm run build          # production build (Next standalone output)
npm run lint           # ESLint
npx tsc --noEmit       # typecheck
npx prisma generate    # regenerate client after editing prisma/schema.prisma
npx prisma migrate dev --name <x>   # create + apply a migration (needs a DB)
npx prisma studio      # browse the database

docker compose up --build   # full stack: db + one-shot migrate + web on :3000
```

There is no test suite yet.

## Architecture

A Next.js app that tells users whether a game will run on their saved Android
handheld, using live community data from **EmuReady** and deep links to
**GameNative**.

**Data flow.** EmuReady is the single live source. `src/lib/emuready.ts` is a
server-only client for EmuReady's public mobile **tRPC** API. Two non-obvious
quirks are encapsulated there and must be preserved:
- Input is superjson-wrapped: the request is `?input={"json": <actualInput>}`.
- Output is superjson-wrapped: unwrap `result.data.json`; errors are in `error.json`.
All EmuReady calls happen server-side (Server Components / server actions) and
rely on Next's `fetch` cache via `next: { revalidate }`. Never call EmuReady
from the browser. GameNative has **no API** — `src/lib/links.ts` only builds
outbound search links.

**The core domain logic** is `src/lib/compat.ts`: it maps EmuReady performance
ranks (ascending = worse: 1 Perfect … 8 Nothing) to UI tiers, and
`matchListingsToConsole()` splits a game's listings into exact-device /
same-chipset / other buckets. The game page derives its "will it run?" verdict
from the best available bucket. When changing verdict behavior, change it here,
not in the page.

**Persistence.** Prisma 7 with the **driver-adapter** model (no bundled query
engine): `src/lib/prisma.ts` constructs `PrismaClient` with a `PrismaPg`
adapter — the constructor *requires* an adapter. The generated client lives in
`src/generated/prisma/` (gitignored; import from `@/generated/prisma/client`).
Models: Auth.js tables + `ConsoleProfile` (mirrors an EmuReady device id plus a
cached chipset/GPU snapshot so we avoid refetching) and `SavedGame`.

**Auth.** Auth.js v5 (`src/auth.ts`), database sessions, Prisma adapter. OAuth
providers are added to the array only when their `AUTH_<PROVIDER>_*` env vars
are set, so the app boots with whatever is configured; `enabledProviders()`
drives the sign-in UI. A `session` callback copies the DB user id onto
`session.user.id` (relied on throughout `src/lib/user-data.ts` and `actions.ts`).

**Mutations** are server actions in `src/lib/actions.ts` (`addConsole`,
`removeConsole`, `setActiveConsole`, `toggleSavedGame`, `searchDevicesAction`);
reads for the current user are in `src/lib/user-data.ts`. There is exactly one
active console per user — `setActiveConsole` clears the others in a transaction.

**UI.** Wii-like light theme defined with Tailwind v4 `@theme` tokens in
`src/app/globals.css` (note the `.channel-tile` glossy card). `AppShell` is the
async server layout (header search, nav, console switcher, auth state). Pages:
`/` (featured), `/search`, `/games/[id]` (the core experience), `/consoles`,
`/dashboard` (library + recommendations), `/signin`. All routes render
dynamically because they read auth/cookies.

## Docker

Multi-stage `Dockerfile` with four targets: `deps`, `builder`, `migrator`
(one-shot `prisma migrate deploy`, keeps the Prisma CLI out of the app image),
and `runner` (Next standalone). `docker-compose.yml` wires `db` → `migrate`
(runs once, `service_completed_successfully`) → `web`. Migrations are committed
under `prisma/migrations/`; generate new ones with `prisma migrate dev` against
a real Postgres (or `prisma migrate diff --from-empty --to-schema … --script`
offline).
