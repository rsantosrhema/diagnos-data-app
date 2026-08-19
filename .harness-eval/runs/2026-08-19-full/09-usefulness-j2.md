# Usefulness Judge2 (blind)
> run: 2026-08-19-full
> model: deepseek-v4-flash:0731

## Counts summary (by Overall class)

| Overall | Count | IDs |
|---------|-------|-----|
| KEEP-CORE | 15 | S001 S004 S005 S006 S015 S016 S019 S022 S023 S024 S025 S026 S027 S028 S903 |
| MIXED | 6 | S002 S003 S014 S018 S020 S021 |
| SLIM | 10 | S007 S008 S009 S010 S011 S012 S013 S017 S901 S902 |
| ROUTING-ONLY | 0 | — |
| UNCLEAR | 0 | — |
| **Total** | **31** | |

Notes on repo facts used for evidence:
- `harness/**` (index.ts, core/{types,schema,pipeline,errors}, config/*, prompts/*, providers/ollama/*, evaluator/*, report/*) exist on disk and match AGENTS.md layout.
- `src/` (Next.js app) does **not** exist yet; no `package.json`; not a git repo. No README used as evidence.
- S901/S902/S903 exist only in the deck (`(deck)/S*.md`), no file on disk.

## Full table

| ID | Overall | Keep-core | Slim | Overlap cites | Evidence | Confidence |
|----|---------|-----------|------|---------------|----------|-----------|
| S001 | KEEP-CORE | BEHAVIOR-CHANGING: harness purity rule (`harness/**` no React/Next), typed errors (ValidationError/ProviderError/ReportError), Zod boundary validation, ollama env-var contract, pipeline stages validate→evaluate→report, file layout. | None | — | `harness/index.ts`, `harness/core/pipeline.ts`, `harness/core/errors.ts`, `harness/core/schema.ts`, `harness/providers/ollama/client.ts`, `harness/config/questionnaire.ts` | High |
| S002 | MIXED | BEHAVIOR-CHANGING: MADR/Nygard/Y-statement format templates, mandatory-field validation, sequential ADR numbering, supersede semantics. | Slim: CUT verbose "ADR vs RFC" prose, "Common Anti-Patterns" section, large AskQuestion context JSON, ADR-vs-format selection tables (general methodology THEORY). | — | General ADR methodology, no repo-specific delta (no repo ADR/format specifics cited). | Medium |
| S003 | MIXED | BEHAVIOR-CHANGING: "AI Slop Test" + Design Direction + the compressed DO/DON'T design rules that shape output. | keep; then CUT trimmed: the per-category "Consult references/…" pointers and the three narrative Examples (1/2/3) (THEORY/OVERLAP with its own references). | S007 S008 S009 S010 S011 S012 S013 (parent body duplicates condensed DO/DON'T for each category) | Generic design methodology; no repo UI artifact yet (src/ absent) to demonstrate. | Medium |
| S004 | KEEP-CORE | BEHAVIOR-CHANGING: entire Track A/B/C protocol, Q1/Q2 gates, dual-judge + plant gate rules, fan-in gate, mixed-apply KEEP/CUT, TRAP rules, scripts list. | None | — | `.opencode/skills/harness-eval/scripts/*.py` (inventory_extract, track_a_correctness, merge_agreement, surfaces_extract, merge_usefulness, slim_fanin, doc_scope) | High |
| S005 | KEEP-CORE | BEHAVIOR-CHANGING: auto-sizing core principle, execution contract (atomic commits, gate passes, Verifier never optional), deterministic validate scripts, .specs structure, context budgets, sub-agent triggers. | None | — | `.opencode/skills/tlc-spec-driven/scripts/{validate_spec,validate_tasks,check_commit,validate_state,lessons}.py` | High |
| S006 | KEEP-CORE | BEHAVIOR-CHANGING: bootstraps this exact harness/app tree (harness/**, src/app/**, api/evaluate route), env vars, 8-12 questions, purity constraint. | None | — | `harness/**` files enumerated in the command match the on-disk scaffold. | High |
| S007 | SLIM | — | THEORY: generic CSS/design (oklch, WCAG contrast, palette, dark mode). OVERLAP with S003 body which already states the condensed color/contrast DO-NON'T rules. No repo artifact. | S003 (`frontend-design/SKILL.md`) | `references/color-and-contrast.md`; no repo example (src/ absent). | Medium |
| S008 | SLIM | — | THEORY: generic interaction (focus rings, form labels, inert/dialog, roving tabindex). OVERLAP with S003 body interaction section. | S003 | `references/interaction-design.md`; no repo artifact. | Medium |
| S009 | SLIM | — | THEORY: generic motion timing/easing/reduced-motion. OVERLAP with S003 body motion section. | S003 | `references/motion-design.md`; no repo artifact. | Medium |
| S010 | SLIM | — | THEORY: generic responsive/mobile-first/container queries/srcset. OVERLAP with S003 responsive section. | S003 | `references/responsive-design.md`; no repo artifact. | Medium |
| S011 | SLIM | — | THEORY: generic spacing/grid/hierarchy/container-queries. OVERLAP with S003 layout & space section. | S003 | `references/spatial-design.md`; no repo artifact. | Medium |
| S012 | SLIM | — | THEORY: generic typography (vertical rhythm, pairing, fluid type). OVERLAP with S003 typography section. | S003 | `references/typography.md`; no repo artifact. | Medium |
| S013 | SLIM | — | THEORY: generic UX writing (button labels, error formula, empty states). OVERLAP with S003 UX writing section. | S003 | `references/ux-writing.md`; no repo artifact. | Medium |
| S014 | MIXED | BEHAVIOR-CHANGING: plain-language term→action definitions embedded in 04/07/10 reports (Track A/B/C bands, Ship vs Slim distinction, fan-in). | CUT: the "three tracks" certainty/token tables and shared-terms rows that duplicate PROTOCOL.md/SKILL.md. | `.opencode/skills/harness-eval/references/PROTOCOL.md`, `SKILL.md` | `references/GLOSSARY.md` | Medium |
| S015 | KEEP-CORE | BEHAVIOR-CHANGING: doc scope (ADRs excluded), agnostic constraints, Track A/B/C precision rules, plant templates + trap gate, fan-in gate, mixed/slim self-contained rules, operator flow. | None | — | `references/PROTOCOL.md`; governs `.harness-eval/runs/` protocol. | High |
| S016 | KEEP-CORE | BEHAVIOR-CHANGING: exact judge output headers/formats, blind constraints, allowed class values, evidence rules; consumed by merge scripts. | None | — | `references/judge-prompts.md` (defines 05/06/08/09 output contract). | High |
| S017 | SLIM | — | THEORY: generic tool fallback chain (ast-grep/ripgrep/grep) — stack-agnostic general knowledge, no repo delta. | — | `references/code-analysis.md`; no repo artifact. | High |
| S018 | MIXED | BEHAVIOR-CHANGING: test-integrity hard rules (never weaken/delete/skip tests), surgical-change rules, goal-driven discipline. | CUT: generic "Simplicity" bullets and "Writing Voice" prose (general SE/style THEORY). | — | `references/coding-principles.md`; generic software practice, no repo-specific example. | Medium |
| S019 | KEEP-CORE | BEHAVIOR-CHANGING: concrete token budgets (5k/8k/10k, <40k/160k) and monitor thresholds used by the skill. | None | — | `references/context-limits.md`; concrete numbers are the methodology. | High |
| S020 | MIXED | BEHAVIOR-CHANGING: process rules — mandatory STATE.md ## Decisions read, supersede-or-conform, Knowledge Verification Chain, concern flagging w/ mitigation, code-reuse. | CUT: the large `.specs/features/[feature]/design.md` template block + "Tips" list (THEORY/repeats process). | — | `references/design.md` | Medium |
| S021 | MIXED | BEHAVIOR-CHANGING: gray-area detection, pace selection (Quick/Guided/Detailed), scope guardrail (no scope creep), decline→assumption rule. | CUT: `context.md` template + long per-example prose + "Tips" (THEORY/repeat). | — | `references/discuss.md` | Medium |
| S022 | KEEP-CORE | BEHAVIOR-CHANGING: atomic-steps mandate, gate-check determinism, tiered gates, Test Adequacy Review (sufficient/necessary/non-shallow), evidence-or-zero, SPEC_DEVIATION marker, scope guardrail. | None | — | `references/implement.md` (loaded by SKILL.md Execute; drives gates). | High |
| S023 | KEEP-CORE | BEHAVIOR-CHANGING: lessons.py ownership split (agent judgment vs script mechanics), grounding gate (no signal→no lesson), add/penalize, confirmed-only loading, no-script fallback. | None | — | `references/lessons.md`, `scripts/lessons.py` | High |
| S024 | KEEP-CORE | BEHAVIOR-CHANGING: section-scoped write invariant (single correctness rule), AD-NNN supersede semantics, handoff reconcile-with-git procedure. | None | — | `references/memory.md` (STATE.md contract). | High |
| S025 | KEEP-CORE | BEHAVIOR-CHANGING: implicit-requirement dimensions sweep, EARS patterns, requirement closure gate, deterministic validate_spec.py. | None | — | `references/specify.md`, `scripts/validate_spec.py` | High |
| S026 | KEEP-CORE | BEHAVIOR-CHANGING: phase-batch vs verifier roles, author≠verifier, model tiering, offer-then-confirm, sequential batches. | None | — | `references/sub-agents.md` | High |
| S027 | KEEP-CORE | BEHAVIOR-CHANGING: atomic-task rules, Test Coverage Matrix, Gate Check Commands, pre-approval checks + validate_tasks.py, MCP/skill ask. | None | — | `references/tasks.md`, `scripts/validate_tasks.py` | High |
| S028 | KEEP-CORE | BEHAVIOR-CHANGING: spec-anchored outcome check, evidence-or-zero, discrimination sensor (scratch-only, forbidden git stash), code-quality checks, UAT, 3-iteration bound, validate_state.py closing gate. | None | — | `references/validate.md`, `scripts/validate_state.py` | High |
| S901 | SLIM | — | THEORY/product-fluff trap: generic clean-coding advice, no repo delta. | — | Deck-only `(deck)/S901.md` (no file on disk). | High |
| S902 | SLIM | — | THEORY/product-fluff trap: feature marketing copy, zero harness substance. | — | Deck-only `(deck)/S902.md` (no file on disk). | High |
| S903 | KEEP-CORE | BEHAVIOR-CHANGING trap: module-boundary / public-API policy — without it agents reach into private internals/do cross-module writes. | None | — | Deck-only `(deck)/S903.md` (no file on disk). | High |
