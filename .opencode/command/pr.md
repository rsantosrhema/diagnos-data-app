---
description: Push the current branch and open a pull request into dev.
agent: build
---

Open a pull request for the current branch following AGENTS.md section 13 (dev-first).

1. Run `git branch --show-current`. If it is `main` or `dev`, stop and ask the user to create a `feat/<slug>` or `fix/<slug>` branch from `origin/dev` first.
2. Run `npm run lint`, `npm run typecheck` and `npm run test`. Stop and report if any fails.
3. Push the branch with `git push -u origin <branch>`.
4. Open the PR with `gh pr create --base dev`. Never use `--base main`.
5. In the PR body, summarize the change and list what to verify on the dev URL (http://w3fh1crzxtmzioaxsvp16rpz.187.127.55.238.sslip.io) after the auto deploy.

Do not merge the PR. The owner merges into `dev`, and promotes `dev` to `main` separately.
