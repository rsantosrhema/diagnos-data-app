# Usefulness Judge1
> run: 2026-08-19-full
> model: deepseek-v4-flash:0731

## Counts by Overall class

| Overall | Count |
|---------|-------|
| KEEP-CORE | 26 |
| MIXED | 3 |
| SLIM | 2 |
| ROUTING-ONLY | 0 |
| UNCLEAR | 0 |

## Full table

| ID | Overall | Keep-core | Slim | Overlap cites | Evidence | Confidence |
|----|---------|-----------|------|---------------|----------|------------|
| S001 | KEEP-CORE | KEEP: full contract (harness purity rule §7, DAMA-DMBOK dims §5, Ollama env vars §6, DoD §9). BEHAVIOR-CHANGING — wrong file placement / purity gate skipped without it. | | | AGENTS.md §4.2 names `harness/core/pipeline.ts`, §4.1 `harness/index.ts` — both exist on disk; purity rule §7 is enforced by `harness/**` layout | High |
| S002 | MIXED | KEEP: ADR format templates (MADR/Nygard/Y-Statement) + Step 1-5 workflow + Step 3 number assignment + file-naming convention. BEHAVIOR-CHANGING for ADR authoring. | CUT: "Common Anti-Patterns", "ADR Quality Checklist", "Language Adaptation", prose of `When to Use`/`ADR vs RFC` tables. THEORY — general ADR knowledge. | | Repo uses `docs/decisions/` per AGENTS.md §3; skill is the on-demand ADR authoring surface | Medium |
| S003 | MIXED | KEEP: Frontend Aesthetics DO/DON'T guidelines (Typography, Color, Layout, Motion, Interaction, Responsive, UX Writing) + "AI Slop Test" + the 7 `references/*.md` load pointers. BEHAVIOR-CHANGING for UI work. | CUT: "Design Direction" narrative, the three "Examples" vignettes, "Implementation Principles" prose. THEORY / REPO-demonstrated (src/components + src/app/page.tsx). | | Skill points to `src/` UI surface; DO/DON'T lists are the concrete behavioral delta | Medium |
| S004 | KEEP-CORE | KEEP: full skill — Q1/Q2 questionnaires, Critical rules (13, 14, fan-in), Step 1-11 protocol, Step 3 track_a script. BEHAVIOR-CHANGING — this is the audit harness. | | | references/PROTOCOL.md, references/judge-prompts.md, scripts/*.py all exist; AGENTS.md does not load it (it is the evaluator, not the subject) | High |
| S005 | KEEP-CORE | KEEP: full skill — Auto-Sizing table, Critical Rules / execution contract, deterministic gates (validate_spec/tasks/state), sub-agent + Verifier, .specs structure. BEHAVIOR-CHANGING. | | | references/implement.md, tasks.md, specify.md, validate.md, memory.md all exist and are loaded | High |
| S006 | KEEP-CORE | KEEP: the concrete scaffold file list + verify commands + `harness/**` purity constraint. BEHAVIOR-CHANGING for bootstrap. | | | AGENTS.md §8 references `.opencode/command/init.md` as the /init command; file lists mirror real `harness/` files (index.ts, pipeline.ts, types.ts) | Medium |
| S007 | KEEP-CORE | KEEP: OKLCH color model, tinted-neutrals rule, WCAG contrast table, dark-mode tokens. BEHAVIOR-CHANGING as loaded color reference. | | frontend-design.md ("Consult [color reference]") | frontend-design/SKILL.md:42 loads `references/color-and-contrast.md` | Medium |
| S008 | KEEP-CORE | KEEP: eight interactive states, focus-visible, form validation-on-blur, undo-over-confirm. BEHAVIOR-CHANGING interaction spec. | | frontend-design.md | frontend-design/SKILL.md:89 loads `references/interaction-design.md` | Medium |
| S009 | KEEP-CORE | KEEP: 100/300/500 durations, transform+opacity-only rule, prefers-reduced-motion. BEHAVIOR-CHANGING motion guidance. | | frontend-design.md | frontend-design/SKILL.md:78 loads `references/motion-design.md` | Medium |
| S010 | KEEP-CORE | KEEP: pointer/hover queries, safe-area env(), srcset/picture, container-query responsive. BEHAVIOR-CHANGING. | | frontend-design.md | frontend-design/SKILL.md:100 loads `references/responsive-design.md` | Medium |
| S011 | KEEP-CORE | KEEP: 4pt base, semantic tokens, auto-fit grid, container queries, depth/elevation. BEHAVIOR-CHANGING spatial spec. | | frontend-design.md | frontend-design/SKILL.md:55 loads `references/spatial-design.md` | Medium |
| S012 | KEEP-CORE | KEEP: vertical rhythm, 5-size scale, ch-measure, font-pairing rules, fluid clamp. BEHAVIOR-CHANGING. | | frontend-design.md | frontend-design/SKILL.md:31 loads `references/typography.md` | Medium |
| S013 | KEEP-CORE | KEEP: verb+object button labels, error-message formula, empty-state, terminology consistency. BEHAVIOR-CHANGING. | | frontend-design.md | frontend-design/SKILL.md:107 loads `references/ux-writing.md` | Medium |
| S014 | KEEP-CORE | KEEP: the three-tracks plain-language table + T0/T1/T2 + Trap/Hold + Ship≠Slim. BEHAVIOR-CHANGING — embedded in reports. | | | harness-eval/references/PROTOCOL.md embeds it; referenced by harness-eval.md "loads GLOSSARY" | Medium |
| S015 | KEEP-CORE | KEEP: full protocol — inventory tiers, doc-scope policy, Track A/B/C rules, fan-in gate, model-sensitivity. BEHAVIOR-CHANGING — protocol is loaded completely by harness-eval.md. | | harness-eval.md | harness-eval/SKILL.md Step 1 mandates `references/PROTOCOL.md` "read completely"; scripts named exist | High |
| S016 | KEEP-CORE | KEEP: judge spawn prompts + exact score-table headers + blind constraints. BEHAVIOR-CHANGING — this run's controller. | | | harness-eval.md Step 8/9 load judge-prompts.md; merge_usefulness.py parses the stated header | High |
| S017 | MIXED | KEEP: graceful-degradation priority (ast-grep→rg→grep) + search-scope exclusions contract. BEHAVIOR-CHANGING for tool fallback. | CUT: the repeated "Usage Examples" fences and the per-tool fallback blocks. THEORY — generic tooling knowledge. | | tlc-spec-driven SKILL.md:184 soft-references `references/code-analysis.md`; content is stack-agnostic search | Medium |
| S018 | KEEP-CORE | KEEP: Test Integrity rules (never weaken/delete/skip), Simplicity, Surgical Changes, Writing Voice. BEHAVIOR-CHANGING — hard-mandated read before implement. | | | tlc-spec-driven SKILL.md + implement.md MANDATORY read of `references/coding-principles.md` | High |
| S019 | KEEP-CORE | KEEP: file-size token limits, context zones (<40k target, >60k critical), monitoring footer format. BEHAVIOR-CHANGING — budget gate. | | | tlc-spec-driven SKILL.md:117 monitors per `references/context-limits.md`; small settings content | Medium |
| S020 | KEEP-CORE | KEEP: mandatory STATE.md Decisions read, code-reuse/component definitions, Risks&Concerns, template. BEHAVIOR-CHANGING. | | | tlc-spec-driven SKILL.md:142 loads `references/design.md`; ties to `.specs/STATE.md` | High |
| S021 | KEEP-CORE | KEEP: discuss trigger + pace choice + scope guardrail + context.md write. BEHAVIOR-CHANGING. | | | tlc-spec-driven SKILL.md:141 loads `references/discuss.md` | Medium |
| S022 | KEEP-CORE | KEEP: full Execute cycle — MANDATORY pre-reqs, tests-from-spec, gate check, atomic commit, feature-level validation, scope guardrail. BEHAVIOR-CHANGING. | | | tlc-spec-driven SKILL.md mandates reading implement.md "completely" before Execute | High |
| S023 | KEEP-CORE | KEEP: lessons grounding gate (no signal→no write), phrasing rules, script.py ownership, READ invocation. BEHAVIOR-CHANGING. | | | tlc-spec-driven SKILL.md loads `references/lessons.md`; lessons.py script exists | Medium |
| S024 | KEEP-CORE | KEEP: STATE.md section-scoped write rule (correctness invariant), AD-NNN supersession, Pause/Resume procedure. BEHAVIOR-CHANGING. | | | tlc-spec-driven SKILL.md:96 loads `references/memory.md` | Medium |
| S025 | KEEP-CORE | KEEP: EARS notation patterns, implicit-requirement dimensions, Requirement Closure Gate, deterministic validate_spec. BEHAVIOR-CHANGING. | | | tlc-spec-driven SKILL.md:140 loads `references/specify.md`; validate_spec.py exists | High |
| S026 | KEEP-CORE | KEEP: phase-batch algorithm, Verifier author≠verifier contract, model-tier table, no-nesting. BEHAVIOR-CHANGING. | | | tlc-spec-driven SKILL.md:129 loads `references/sub-agents.md` | Medium |
| S027 | KEEP-CORE | KEEP: Test Coverage Matrix + Gate Check Commands contract, atomic-task rules, co-location validation, validate_tasks.py. BEHAVIOR-CHANGING. | | | tlc-spec-driven SKILL.md:143 loads `references/tasks.md`; validate_tasks.py exists | High |
| S028 | KEEP-CORE | KEEP: full Verifier process — spec-anchored check, discrimination sensor, evidence-or-zero, validate_state.py. BEHAVIOR-CHANGING. | | | tlc-spec-driven SKILL.md:145 loads `references/validate.md`; validate_state.py exists | High |
| S901 | SLIM | | CUT: whole body. THEORY / generic clean-code fluff; path not on disk (deck-only, no consumer). | | Path `(deck)/S901.md` does not exist on disk; no harness file loads it | High |
| S902 | SLIM | | CUT: whole body. THEORY / product fluff; no repo signal, no consumer. | | Path `(deck)/S902.md` does not exist on disk; no harness file loads it | High |
| S903 | KEEP-CORE | KEEP: full module-boundary policy (private-storage, public-API, transaction/unit-of-work, no internal imports). BEHAVIOR-CHANGING — boundary enforcement. | | | Mirrors AGENTS.md §7 "harness/** must not import from src/**"; policy text is the enforcement gate | High |

Note on S903: scored on the fenced body (path `(deck)/S903.md` is deck-only, no disk file). The boundary/policy content maps to the repo's harness-purity rule (AGENTS.md §7) and is the kind of cross-module policy this audit's rubric keeps.
