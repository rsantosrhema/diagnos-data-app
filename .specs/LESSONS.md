# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-002 - Test fixed-page-count layout requirements with content at the schema maximum, not only typical content, or cap the schema to what the layout fits
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `report-pdf` · harmful: 0
- features: arsenal-comercial
- evidence: ARS-27/ARS-37 report-generator.test.ts:496; /tmp/arsenal-fix/worst.pdf pages=9 (report-pdf)
- last seen: 2026-11-24T21:14:46Z

### L-003 - When a derived value combines several data files, test the mixed-state case, not only the all-same case
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `catalog` · harmful: 0
- features: arsenal-comercial
- evidence: M15 src/lib/comercial/catalog.ts:94 (catalog)
- last seen: 2026-11-24T21:14:46Z

### L-004 - Every spec edge case needs a test at the layer that could skip the behavior, not only at the leaf unit
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `services` · harmful: 0
- features: arsenal-comercial
- evidence: M20 src/lib/service/analysis-service.ts:128 (services)
- last seen: 2026-11-24T21:14:46Z

### L-005 - Assert measured durations with fake timers or specify a minimum, not expect.any(Number)
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `services` · harmful: 0
- features: arsenal-comercial
- evidence: ARS-19 analysis-service.test.ts:691 (services)
- last seen: 2026-11-24T21:14:46Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
