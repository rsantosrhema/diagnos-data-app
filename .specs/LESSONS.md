# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Repository-layer SQL state transitions (queue read marks processando / attempts+1) have no JS unit test; cover RPC bodies or assert them via integration instead of relying on code review
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · harmful: 0
- features: report-observability
- evidence: validation.md
- last seen: 2026-08-31T15:54:20Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
