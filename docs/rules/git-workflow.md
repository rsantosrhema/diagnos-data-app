# Git Workflow & Local Testing — Diagnos Data App

Every change is built and tested **on the developer's machine** (Docker) and reaches production only through a pull request into `main`. Referenced by AGENTS.md section 13.

---

## 1. Environments

| | **local** (testing) | **prod** |
|---|---|---|
| Git branch | `feat/<slug>` / `fix/<slug>` from `origin/main` | `main` |
| App | `npm run dev` (or `docker compose`) on the developer's machine | Coolify app `diagnosdata-app` (`hfhyxim41i8zgcmbvppgri4q`), https://diagnosdata.rhemadata.com |
| Supabase | Local stack in Docker via `npm run db:start` (see `docs/local-development.md`) | Coolify service `supabase-diagnosdata` (`jtrdrv8ijdq003npm6cwteda`) |
| Deploy | none | Manual, triggered by the owner in Coolify |

- There is **no shared dev/staging environment**. The single Coolify server does not have enough RAM for a second Supabase stack or parallel builds: on 2026-11-24 a dev stack took production down for about 30 minutes. Do not propose or create one on that server.
- Local and prod have **separate databases and queues**. The local env must never point at the prod Supabase (the prod worker would pick up local jobs).

## 2. Flow for any change

```
origin/main ──► feat/<slug> or fix/<slug> ──► test locally ──► PR into main ──► owner merges ──► owner deploys in Coolify
```

1. Sync: `git fetch origin && git switch -c feat/<slug> origin/main`.
2. Start the local stack (`npm run db:start`) and work against it.
3. Before opening the PR run `npm run lint && npm run typecheck && npm run test`, and exercise the change manually in the local app. For schema changes also run `npm run db:reset` to prove the migrations apply on an empty database.
4. Commit (Conventional Commits, section 6), push the branch and open a PR with base `main` (`gh pr create --base main`). Describe what was tested locally.
5. The owner reviews and merges. Deploying to production is a separate, manual action by the owner.

Fixes follow the same path, including urgent ones.

## 3. Hard rules for agents (Claude Code, OpenCode, Orca workers)

- Never commit directly to `main`, and never push, merge or force-push to it. Open a PR instead.
- Never run `git push --force` / `-f` on shared branches.
- Never trigger a deploy, restart, rollback or env change on the prod Coolify app or prod Supabase service, and never run SQL or migrations against the prod database, without explicit instruction in the current conversation.
- Never point `.env.local` at the prod Supabase.
- Never create extra resources (Supabase stacks, apps, builds) on the prod Coolify server.
- Do not put secrets, tokens or passwords in tracked files. `.opencode/opencode.json` is local-only and must stay untracked.

## 4. Database migrations

- Migrations in `supabase/migrations/` must apply on an **empty database** from `0001` onward. When you change an existing function's return type, `DROP FUNCTION IF EXISTS` first (`CREATE OR REPLACE` cannot change it).
- Test every new migration locally with `npm run db:reset` before opening the PR.
- Applying a migration to the prod database is done by the owner, after the PR is merged and only when the owner asks.

## 5. Environment variables

- A new variable must be added to `.env.example`, documented in `docs/local-development.md` if it matters locally, and set by the owner in the prod Coolify app.
- `NEXT_PUBLIC_*` values are build-time: after changing them, rebuild the app.
- Local development uses `.env.local`, which points at the local Supabase.

## 6. Commits and PRs

- Conventional Commits in Portuguese or English, matching the existing history (`feat(scope): ...`, `fix(scope): ...`).
- One logical change per PR. The PR description says what was verified locally and any migration or env var the owner must apply in prod.

## 7. Tooling

- **Claude Code:** `CLAUDE.md` imports AGENTS.md; `.claude/settings.json` denies pushes to `main` and force-pushes.
- **OpenCode:** `.opencode/opencode.json` is local-only (not versioned, it holds MCP tokens). It loads AGENTS.md and should deny pushes to `main` and force-pushes.
- **Orca:** the repo's default base ref is `origin/main` (`orca repo set-base-ref --repo name:diagnos-data-app --ref origin/main`). New worktrees branch from it.
