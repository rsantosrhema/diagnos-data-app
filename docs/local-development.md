# Local Development (Docker)

Local testing uses the Supabase CLI stack in Docker, pinned in `package.json` scripts. The app itself runs with `npm run dev`, or in Docker with `docker compose`.

## Prerequisites

- Docker Desktop running (the stack uses roughly 1.5 GB of RAM: Postgres 15, PostgREST, GoTrue, Kong, Studio).
- Node 22 and `npm install`.

## 1. Start the local Supabase

```bash
npm run db:start    # first run downloads images; applies supabase/migrations/* automatically
npm run db:status   # prints API URL and keys
```

Services (ports): API/Kong 54321, Postgres 54322, Studio http://127.0.0.1:54323, Mailpit http://127.0.0.1:54324. Storage, Realtime, Edge Functions and Analytics are disabled in `supabase/config.toml` because the app does not use them.

`npm run db:reset` drops the local database and re-applies every migration from scratch. Use it to validate new migrations. `npm run db:stop` stops the stack (data is kept in Docker volumes).

## 2. Configure `.env.local`

Copy `.env.example` to `.env.local` and take these values from `npm run db:status`:

| Variable | Local value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` (API URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key from `db:status` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret/service_role key from `db:status` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `INTERNAL_API_KEY` | any 32+ char random string (`openssl rand -hex 32`) |
| `MANAGER_EMAILS` | the email of the local admin user (step 3) |

`RESEND_API_KEY`, `LLM_*` and `EXA_API_KEY` are only needed to generate reports. They are real services: a report generated locally spends credits and emails `MANAGER_NOTIFICATION_EMAIL`. Point that variable at your own address while testing.

Never copy the production Supabase URL or keys into `.env.local`.

## 3. Create the local admin user

The `/admin` panel needs a Supabase Auth user whose email is in `MANAGER_EMAILS`. In Studio (http://127.0.0.1:54323) go to Authentication → Users → Add user, enter the email and a password, and tick "Auto Confirm User".

## 4. Run the app

```bash
npm run dev          # http://localhost:3000
```

The analysis queue is drained by the worker. Locally run it by hand when you click "Gerar relatório":

```bash
npm run worker:run   # one pass
npm run worker:watch # keep draining
```

### Running the app in Docker instead

Inside the container `127.0.0.1` is the container itself, so use the host alias. In `.env.local` set `NEXT_PUBLIC_SUPABASE_URL=http://host.docker.internal:54321`, then build with the `NEXT_PUBLIC_*` values as an env file (compose interpolation does not read `.env.local`):

```bash
grep '^NEXT_PUBLIC_' .env.local > /tmp/diagnos-public.env
docker compose --env-file /tmp/diagnos-public.env up -d --build
```

If `NEXT_PUBLIC_*` values are empty at build time, admin login returns "Erro interno".

## Troubleshooting

- `db:start` fails on ports: stop other local Postgres or Supabase stacks (`npm run db:stop`, or change ports in `supabase/config.toml`).
- A migration fails: run `npm run db:reset` and read the first error. Migrations must apply on an empty database.
- Changed `NEXT_PUBLIC_*`: restart `npm run dev`, or rebuild the container.
