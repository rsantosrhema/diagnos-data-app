# Optional docs (not in eval unless approved)

Non-agent documents cited by T0/T1. **ADRs / RFCs are always excluded.**
Agent skill-tree files (`.agents/skills`, `.cursor/skills`, `.claude/skills`) are always in scope.

## Ask the user

Present the doc **types** below and ask which (if any) to include in this run.
Then re-run inventory with `--include-doc-type <type>` and/or `--include-doc <path>`.

## Always excluded (decision records)

_None discovered in one-hop cites._

## Optional types (default: omitted)

| Type | Count | Example paths |
|------|------:|---------------|
| `.opencode` | 25 | `.opencode/command/init.md`, `.opencode/opencode.json`, `.opencode/skills/frontend-design/references/color-and-contrast.md` (+22) |

### Re-run examples

```bash
python3 "$SKILL_DIR/scripts/inventory_extract.py" --root . --run-id "$RUN_ID" \
  --include-doc-type docs
python3 "$SKILL_DIR/scripts/inventory_extract.py" --root . --run-id "$RUN_ID" \
  --include-doc docs/context.md --include-doc docs/infrastructure.md
```

## Included optional docs this run

- `.opencode/command/init.md`
- `.opencode/opencode.json`
- `.opencode/skills/frontend-design/references/color-and-contrast.md`
- `.opencode/skills/frontend-design/references/interaction-design.md`
- `.opencode/skills/frontend-design/references/motion-design.md`
- `.opencode/skills/frontend-design/references/responsive-design.md`
- `.opencode/skills/frontend-design/references/spatial-design.md`
- `.opencode/skills/frontend-design/references/typography.md`
- `.opencode/skills/frontend-design/references/ux-writing.md`
- `.opencode/skills/harness-eval/references/GLOSSARY.md`
- `.opencode/skills/harness-eval/references/PROTOCOL.md`
- `.opencode/skills/harness-eval/references/claims.schema.json`
- `.opencode/skills/harness-eval/references/judge-prompts.md`
- `.opencode/skills/tlc-spec-driven/references/code-analysis.md`
- `.opencode/skills/tlc-spec-driven/references/coding-principles.md`
- `.opencode/skills/tlc-spec-driven/references/context-limits.md`
- `.opencode/skills/tlc-spec-driven/references/design.md`
- `.opencode/skills/tlc-spec-driven/references/discuss.md`
- `.opencode/skills/tlc-spec-driven/references/implement.md`
- `.opencode/skills/tlc-spec-driven/references/lessons.md`
- `.opencode/skills/tlc-spec-driven/references/memory.md`
- `.opencode/skills/tlc-spec-driven/references/specify.md`
- `.opencode/skills/tlc-spec-driven/references/sub-agents.md`
- `.opencode/skills/tlc-spec-driven/references/tasks.md`
- `.opencode/skills/tlc-spec-driven/references/validate.md`

