@AGENTS.md

## Claude Code

- Follow the workflow in AGENTS.md section 13 and `docs/rules/git-workflow.md`: branch from `origin/main`, test locally with the Docker Supabase (`docs/local-development.md`), open PRs with `--base main`, never push directly to `main`.
- `.claude/settings.json` denies pushes to `main` and force-pushes, and asks before `gh pr merge` and Coolify deploy/rollback tools. Do not work around these.
- The Coolify MCP points at production. Read-only inspection is fine; any change to the prod app (`hfhyxim41i8zgcmbvppgri4q`) or prod Supabase service (`jtrdrv8ijdq003npm6cwteda`) needs explicit instruction. Never create new resources on that server.
