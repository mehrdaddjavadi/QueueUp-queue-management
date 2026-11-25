# QueueUp

QueueUp lets service businesses replace physical waiting lines with public booking links, an owner queue dashboard, and a live ticket display.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/queueup run dev` — run the QueueUp web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string; `SESSION_SECRET` — signs owner sessions

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/queueup` — React web app and responsive QueueUp screens
- `artifacts/api-server` — shared Express API and QueueUp routes
- `lib/api-spec/openapi.yaml` — API source of truth; regenerate helpers with API codegen
- `lib/db/src/schema/queueup.ts` — PostgreSQL business and ticket tables

## Architecture decisions

- Customer booking is anonymous; a browser token prevents duplicate active tickets without collecting contact details.
- Owner access codes are salted and hashed; dashboard sessions are signed HTTP-only cookies.
- Queue numbers and owner queue changes use database transactions and a per-business row lock.
- Queue updates use three-second polling instead of a paid realtime service.

## Product

- Owners create a business queue, share booking and display links, manage tickets, pause bookings, and update settings.
- Customers join without creating an account and can follow their private ticket status and estimated wait.
- Public displays show the current and upcoming ticket numbers without customer names.

## User preferences

- Keep the MVP suitable for the Replit Starter (Free) plan: no paid integrations or external APIs.
- Keep the interface in English, with a restrained light SaaS presentation and indigo/blue accents.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
