# SyncRoom

Realtime collaborative room app — presence + synced pomodoro timer, room-based, no login. Full product spec, architecture rationale, and scope live in [`CLAUDE.md`](./CLAUDE.md); this doc covers what's actually been built so far and how to run it.

## Status

Infrastructure and monorepo scaffold are in place. No product UI/logic beyond the socket bootstrap yet.

| Area | Status |
|---|---|
| Local infra (Postgres + Redis via Docker) | Done |
| Monorepo structure (pnpm workspaces) | Done |
| `apps/web` (Next.js) | Scaffold only — default `create-next-app` page, not yet wired to sockets |
| `apps/realtime-server` | Bootstrap done — Express + Socket.io + Redis adapter, presence + pomodoro handlers |
| `packages/shared-types` | Done — event contract types shared by both apps |
| Room create/join UI, `PresenceList`, `PomodoroTimer` components | Not started |
| `apps/web/app/api/rooms/route.ts` (room create/validate) | Not started |
| `useSocket` / `useRoomPresence` hooks | Not started |
| Postgres persistence wiring (snapshot save/restore) | Schema + client exist, not called anywhere yet |
| Docker prod compose, Nginx, GitHub Actions CI | Not started |

## Repo structure

```
sync-room/
├── apps/
│   ├── web/                        # Next.js 16, App Router
│   │   ├── app/                    # currently just the default create-next-app page
│   │   ├── package.json
│   │   └── .env.example
│   └── realtime-server/            # Node + Express + Socket.io
│       ├── src/
│       │   ├── index.ts            # bootstrap: http server, socket.io, redis adapter attach
│       │   ├── redis-adapter.ts    # builds the @socket.io/redis-adapter pub/sub pair
│       │   ├── rooms/
│       │   │   ├── room.manager.ts     # in-memory room/participant/timer state
│       │   │   ├── presence.handler.ts # room:join / room:leave / disconnect
│       │   │   └── pomodoro.handler.ts # server-authoritative timer start/pause/reset
│       │   ├── db/
│       │   │   ├── schema.ts       # drizzle schema: rooms, room_snapshots
│       │   │   └── client.ts       # postgres.js + drizzle client
│       │   └── types/socket.ts     # typed Server/Socket aliases using shared-types
│       ├── drizzle.config.ts
│       ├── Dockerfile
│       └── .env.example
├── packages/
│   └── shared-types/
│       └── src/events.ts           # ClientToServerEvents / ServerToClientEvents contract
├── infra/
│   ├── docker-compose.yml          # local Postgres 16 + Redis 7
│   └── .env.example                # optional Postgres user/pass/db overrides
├── package.json                    # workspace root, orchestration scripts only
├── pnpm-workspace.yaml
└── CLAUDE.md                       # full project spec (source of truth)
```

`infra/docker-compose.prod.yml` and `infra/nginx/` from the original plan don't exist yet — they're deployment-phase work, not local dev.

## Local development

### 1. Start infra (Postgres + Redis)

```bash
docker compose -f infra/docker-compose.yml up -d
```

Defaults (override via `infra/.env`, see `infra/.env.example`):
- Postgres: `localhost:5432`, db/user/pass all `syncroom`
- Redis: `localhost:6379`

Check both are healthy:
```bash
docker compose -f infra/docker-compose.yml ps
```

### 2. Install dependencies

```bash
pnpm install
```

This installs all workspaces (`apps/web`, `apps/realtime-server`, `packages/shared-types`) from the root lockfile.

### 3. Environment variables

Each app has a `.env.example` — copy it to `.env` in the same directory. Already done as part of setup, values point at the containers above:

```
# apps/web/.env
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

# apps/realtime-server/.env
PORT=4000
DATABASE_URL=postgresql://syncroom:syncroom@localhost:5432/syncroom
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000
```

### 4. Run the apps

```bash
pnpm --filter web dev              # Next.js on :3000
pnpm --filter realtime-server dev  # Socket.io server on :4000 (tsx watch, auto-reload)
```

Or from root: `pnpm dev:web`, `pnpm dev:server` — same thing, defined in the root `package.json`.

Verify the realtime server is actually up:
```bash
curl http://localhost:4000/health
# {"status":"ok"}
```

### Other root scripts

```bash
pnpm build       # pnpm -r build — builds every workspace
pnpm lint        # pnpm -r lint
pnpm typecheck   # pnpm -r typecheck
```

## What the realtime-server bootstrap actually does

- `src/index.ts` boots Express (just a `/health` route) + an HTTP server + Socket.io on top of it, attaches the Redis adapter so events fan out across instances, and registers presence + pomodoro handlers per connection.
- `presence.handler.ts` — on `room:join`, generates a `userId` (nanoid), joins the Socket.io room, adds the participant to `room.manager`'s in-memory state, acks the `userId` back to the client, sends `room:state` to the joiner, and broadcasts `presence:update` to everyone in the room. Same broadcast happens on `room:leave` and `disconnect`.
- `pomodoro.handler.ts` — server-authoritative timer. `pomodoro:start` sets state to `running`, schedules a `setTimeout` for the phase completion, and broadcasts `pomodoro:sync`. `pomodoro:pause` computes actual remaining time from the recorded start timestamp (not just a naive countdown) and broadcasts the paused state. `pomodoro:reset` clears everything back to idle/focus. Per CLAUDE.md, the server never ticks every second — it only broadcasts on state changes; clients extrapolate the countdown locally from `remainingSeconds`.
- `room.manager.ts` — plain in-memory `Map`, not persisted. Postgres snapshot save/restore (`room_snapshots` table) is schema-ready but not wired into the handlers yet — that's the next real feature to build, not just scaffold.

## Event contract

Defined once in `packages/shared-types/src/events.ts` and imported by both apps (`shared-types` workspace package) — `ClientToServerEvents` and `ServerToClientEvents`, matching the table in CLAUDE.md §7. Change the contract in one place; both sides get the updated types.

## Gitignore note

The original `create-next-app` `.gitignore` used `/node_modules` (root-anchored), which would have missed `node_modules` inside `apps/*` and `packages/*` after the monorepo split. Patterns were changed to unanchored (`node_modules`, `.next/`, `dist`, etc.) so every workspace is covered.

## AI assistant constraints

Per CLAUDE.md §0: no AI-driven `git commit`/`push`/PR/branch/repo-settings changes, ever. All git and GitHub actions in this repo are done manually by Renal. This document and all code above were written by Claude Code but not committed — that's a manual step.
