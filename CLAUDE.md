@AGENTS.md

## Claude Code

- Follow the dev-first workflow in AGENTS.md section 13 and `docs/rules/git-workflow.md`: branch from `origin/dev`, open PRs with `--base dev`, never push or merge to `main`.
- `.claude/settings.json` denies pushes to `main` and force-pushes, and asks before `gh pr merge` and Coolify deploy/rollback tools. Do not work around these.
- When using the Coolify MCP, act on the dev app (`w3fh1crzxtmzioaxsvp16rpz`) and dev Supabase service (`sjex5gn3mewrk9gw0sfadaak`). Touch prod only on explicit instruction.
