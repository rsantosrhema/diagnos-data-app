# Blind scores Judge2
> run: 2026-08-19-full
> model: deepseek-v4-flash:0731

## Counts summary

| Class | Count |
|-------|-------|
| REDUNDANT-CODE | 0 |
| REDUNDANT-GENERAL | 26 |
| KEEP-POLICY | 200 |
| KEEP-CAVEAT | 12 |
| KEEP-ROUTING | 55 |
| KEEP-COMPRESSED | 64 |
| UNCLEAR | 2 |
| **Total** | **359** |

## Scoring notes

- Verified every claim against the live repo (AGENTS.md, `.opencode/` skill trees, `harness/`, `docs/`, presence of `.agents/`). README never used as evidence.
- `AGENTS.md` (T0) and the four skill files (T1) are themselves the harness surfaces; nearly all their statements describe contracts/process/policy that are NOT cheaply re-discoverable from repo code (cost ≥ 2), so they are KEEP-*.
- The 25 T2 rows (C331–C355) are one identical boilerplate template ("…is an on-demand load target when linked from always-on rules or skills"). The referenced files exist and are already linked from their SKILL.md; the rows add no instruction beyond what a directory listing + SKILL.md link already conveys → REDUNDANT-GENERAL (cost 1).
- C033 is a near-verbatim restatement of C008 within the same file → REDUNDANT-GENERAL (cost 0).
- P003/P004 source (`.agents/skills/workflow-tips/SKILL.md`) does not exist in the repo; generic guidance, cannot confirm anchor → UNCLEAR.
- P005 (secrets policy) is a legitimate security policy → KEEP-POLICY. P006 (local-pass/CI-fail caveat) is an environment-specific caveat → KEEP-CAVEAT.

## Full table

| ID | Cost | Class | Evidence | Confidence | Trim suggestion |
|----|------|-------|----------|------------|-----------------|
| C001 | 0 | KEEP-POLICY | Exact string at AGENTS.md:3; entrypoint/role instruction | High | Keep |
| C002 | 2 | KEEP-COMPRESSED | Product overview; requires reading code+purpose to rediscover | Med | Keep (compress prose) |
| C003 | 0 | KEEP-COMPRESSED | Filler heading; low value | High | Compress/merge with following flow items |
| C004 | 2 | KEEP-POLICY | Constraint (8–12 questions, DAMA-DMBOK) from questionnaire.ts; rediscovery cost 2 | High | Keep |
| C005 | 2 | KEEP-COMPRESSED | Descriptive flow step; narrative | Med | Keep (compress) |
| C006 | 2 | KEEP-COMPRESSED | Descriptive flow step; tech-stack narrative | Med | Keep (compress) |
| C007 | 2 | KEEP-COMPRESSED | Descriptive flow step; report narrative | Med | Keep (compress) |
| C008 | 2 | KEEP-POLICY | Architecture note: PDF purity, ReportGenerator injection, src/lib/report | High | Keep (primary statement) |
| C009 | 2 | KEEP-POLICY | Framework-agnostic + public-API routing | High | Keep |
| C010 | 2 | KEEP-COMPRESSED | Type doc; in core/types.ts | Med | Keep (compress) |
| C011 | 2 | KEEP-COMPRESSED | Type doc; in core/types.ts | Med | Keep (compress) |
| C012 | 1 | KEEP-POLICY | Mirrors pipeline.ts (validate→evaluate→report) | Med | Keep |
| C013 | 1 | KEEP-POLICY | Mirrors pipeline.ts evaluate stage | Med | Keep |
| C014 | 1 | KEEP-POLICY | Mirrors pipeline.ts report stage | Med | Keep |
| C015 | 1 | KEEP-ROUTING | File path present: harness/config/maturity-model.ts | High | Keep |
| C016 | 1 | KEEP-POLICY | Dimensions match maturity-model.ts DIMENSIONS | High | Keep |
| C017 | 0 | KEEP-COMPRESSED | Header; domain model intro | Med | Keep (compress) |
| C018 | 0 | KEEP-COMPRESSED | Level list item; also in maturity-model.ts | Med | Keep (compress) |
| C019 | 1 | KEEP-POLICY | Weighted aggregate matches weightedAggregate() | High | Keep |
| C020 | 2 | KEEP-ROUTING | Questionnaire maps dimension+weight; in questionnaire.ts | Med | Keep |
| C021 | 1 | KEEP-ROUTING | File present: harness/providers/ollama/client.ts | High | Keep |
| C022 | 1 | KEEP-CAVEAT | Env-driven config (OLLAMA_BASE_URL/MODEL) in client.ts | High | Keep |
| C023 | 1 | KEEP-ROUTING | Prompts dir present; routing | High | Keep |
| C024 | 1 | KEEP-POLICY | Structured JSON (format:"json") in client.ts | High | Keep |
| C025 | 2 | KEEP-CAVEAT | Timeout/retry/non-2xx typed errors verified in client.ts | High | Keep |
| C026 | 1 | KEEP-POLICY | Secrets from process.env (loadOllamaConfig) | High | Keep |
| C027 | 1 | KEEP-POLICY | TS strict/no-any convention | High | Keep |
| C028 | 1 | KEEP-POLICY | Comment policy | High | Keep |
| C029 | 1 | KEEP-POLICY | Named-exports convention | High | Keep |
| C030 | 1 | KEEP-POLICY | General convention | High | Keep |
| C031 | 1 | KEEP-POLICY | Harness purity enforcement rule | High | Keep |
| C032 | 1 | KEEP-POLICY | I/O boundaries rule | High | Keep |
| C033 | 0 | REDUNDANT-GENERAL | Near-verbatim duplicate of C008 within same file | Med | Drop (C008 carries it) |
| C034 | 1 | KEEP-POLICY | Zod validation rule | High | Keep |
| C035 | 1 | KEEP-POLICY | Boundary-validation rule | High | Keep |
| C036 | 1 | KEEP-POLICY | Typed errors in core/errors.ts (verified names) | High | Keep |
| C037 | 1 | KEEP-POLICY | Error→HTTP mapping rule | High | Keep |
| C038 | 1 | KEEP-POLICY | Harness-core tests rule | High | Keep |
| C039 | 1 | KEEP-CAVEAT | Mock Ollama, never real API | High | Keep |
| C040 | 1 | KEEP-CAVEAT | Use test runner | Med | Keep |
| C041 | 1 | KEEP-ROUTING | npm run dev command | High | Keep |
| C042 | 1 | KEEP-ROUTING | npm run build command | High | Keep |
| C043 | 1 | KEEP-ROUTING | npm run lint command | High | Keep |
| C044 | 1 | KEEP-ROUTING | npm run test command | High | Keep |
| C045 | 1 | KEEP-ROUTING | Points to .opencode/opencode.json (exists) | High | Keep |
| C046 | 1 | KEEP-ROUTING | Points to .opencode/command/init.md (exists) | High | Keep |
| C047 | 1 | KEEP-CAVEAT | Restart-after-editing note | Med | Keep |
| C048 | 0 | KEEP-COMPRESSED | Section header; low value prose | Low | Keep (compress) |
| C049 | 1 | KEEP-POLICY | DoD item: conventions | High | Keep |
| C050 | 1 | KEEP-POLICY | DoD item: purity | High | Keep |
| C051 | 1 | KEEP-POLICY | DoD item: Zod validation | High | Keep |
| C052 | 1 | KEEP-POLICY | DoD item: typed errors | High | Keep |
| C053 | 1 | KEEP-POLICY | DoD item: tests | High | Keep |
| C054 | 1 | KEEP-POLICY | DoD item: lint+build | High | Keep |
| C055 | 1 | KEEP-POLICY | DoD item: no secrets/env | High | Keep |
| C056 | 2 | KEEP-ROUTING | Trigger/description of create-adr skill | Med | Keep |
| C057 | 2 | KEEP-COMPRESSED | Role prose | Med | Keep (compress) |
| C058 | 2 | KEEP-COMPRESSED | Section header | Low | Keep (compress) |
| C059 | 2 | KEEP-ROUTING | Trigger: write ADR | Med | Keep |
| C060 | 2 | KEEP-ROUTING | Trigger: document why | Med | Keep |
| C061 | 2 | KEEP-ROUTING | Trigger: decision made | Med | Keep |
| C062 | 2 | KEEP-ROUTING | Trigger: preserve reasoning | Med | Keep |
| C063 | 2 | KEEP-ROUTING | Trigger: why did we choose | Med | Keep |
| C064 | 2 | KEEP-CAVEAT | Do-not-use: create-rfc | Med | Keep |
| C065 | 2 | KEEP-CAVEAT | Do-not-use: technical-design-doc-creator | Med | Keep |
| C066 | 2 | KEEP-CAVEAT | Do-not-use: trivial decisions | Med | Keep |
| C067 | 2 | KEEP-CAVEAT | Do-not-use: meeting notes | Med | Keep |
| C068 | 2 | KEEP-POLICY | ADR vs RFC decision rule | Med | Keep |
| C069 | 2 | KEEP-POLICY | ADR vs RFC decision rule | Med | Keep |
| C070 | 2 | KEEP-POLICY | Language adaptation (critical) | Med | Keep |
| C071 | 2 | KEEP-POLICY | Technical terms in English | Low | Keep |
| C072 | 2 | KEEP-POLICY | Content in user's language | Med | Keep |
| C073 | 2 | KEEP-POLICY | Names unchanged | Low | Keep |
| C074 | 2 | KEEP-ROUTING | Format selection | Med | Keep |
| C075 | 2 | KEEP-POLICY | Default MADR | Med | Keep |
| C076 | 2 | KEEP-POLICY | AskQuestion when minimal context | Med | Keep |
| C077 | 2 | KEEP-POLICY | Mandatory fields | Med | Keep |
| C078 | 2 | KEEP-POLICY | Decision title field | Med | Keep |
| C079 | 2 | KEEP-POLICY | Date field | Med | Keep |
| C080 | 2 | KEEP-POLICY | Status field | Med | Keep |
| C081 | 2 | KEEP-POLICY | Context field | Med | Keep |
| C082 | 2 | KEEP-POLICY | Decision field | Med | Keep |
| C083 | 2 | KEEP-POLICY | Consequences field | Med | Keep |
| C084 | 2 | KEEP-POLICY | Recommended fields | Med | Keep |
| C085 | 2 | KEEP-POLICY | Decision drivers | Med | Keep |
| C086 | 2 | KEEP-POLICY | Options considered | Med | Keep |
| C087 | 2 | KEEP-POLICY | Pros/cons per option | Med | Keep |
| C088 | 2 | KEEP-POLICY | Decision outcome rationale | Med | Keep |
| C089 | 2 | KEEP-POLICY | Links | Med | Keep |
| C090 | 2 | KEEP-POLICY | Ask in user's language | Med | Keep |
| C091 | 2 | KEEP-ROUTING | Scan ADR dir for next number | Med | Keep |
| C092 | 2 | KEEP-ROUTING | Check ADR directory exists | Med | Keep |
| C093 | 2 | KEEP-ROUTING | Find highest number | Med | Keep |
| C094 | 2 | KEEP-ROUTING | Assign next number | Med | Keep |
| C095 | 2 | KEEP-ROUTING | Start at 001 | Med | Keep |
| C096 | 2 | KEEP-POLICY | Generate ADR per format | Med | Keep |
| C097 | 2 | KEEP-ROUTING | Offer file placement | Med | Keep |
| C098 | 2 | KEEP-POLICY | Verify before finalizing | Med | Keep |
| C099 | 2 | KEEP-POLICY | Checklist: title noun phrase | Med | Keep |
| C100 | 2 | KEEP-POLICY | Checklist: date | Med | Keep |
| C101 | 2 | KEEP-POLICY | Checklist: status | Med | Keep |
| C102 | 2 | KEEP-POLICY | Checklist: context forces | Med | Keep |
| C103 | 2 | KEEP-POLICY | Checklist: decision stated | Med | Keep |
| C104 | 2 | KEEP-POLICY | Checklist: consequences trade-offs | Med | Keep |
| C105 | 2 | KEEP-POLICY | Checklist: options ≥2 | Med | Keep |
| C106 | 2 | KEEP-POLICY | Checklist: supersedes links | Med | Keep |
| C107 | 2 | KEEP-POLICY | Checklist: naming convention | Med | Keep |
| C108 | 2 | KEEP-POLICY | Checklist: sequential number | Med | Keep |
| C109 | 2 | KEEP-POLICY | Zero-padded numbers | Med | Keep |
| C110 | 2 | KEEP-ROUTING | Common ADR directories | Med | Keep |
| C111 | 2 | KEEP-POLICY | Bad title example | Med | Keep |
| C112 | 2 | KEEP-POLICY | Good title example | Med | Keep |
| C113 | 2 | KEEP-POLICY | Title guidance | Med | Keep |
| C114 | 2 | KEEP-POLICY | Context forces guidance | Med | Keep |
| C115 | 2 | KEEP-POLICY | Honest trade-offs value | Med | Keep |
| C116 | 2 | KEEP-POLICY | Bad: editing old ADR | Med | Keep |
| C117 | 2 | KEEP-POLICY | Good: supersede | Med | Keep |
| C118 | 2 | KEEP-POLICY | ADRs historical records | Med | Keep |
| C119 | 2 | KEEP-POLICY | Rationale why-not | Med | Keep |
| C120 | 2 | KEEP-POLICY | ADRs immutable | Med | Keep |
| C121 | 2 | KEEP-POLICY | Short is better | Med | Keep |
| C122 | 2 | KEEP-POLICY | Context ages | Med | Keep |
| C123 | 2 | KEEP-POLICY | Honest consequences | Med | Keep |
| C124 | 2 | KEEP-POLICY | Link everything | Med | Keep |
| C125 | 2 | KEEP-COMPRESSED | Repeats C070 (language adaptation note) | Low | Keep (note-list; acceptable) |
| C126 | 2 | KEEP-POLICY | Number sequentially | Med | Keep |
| C127 | 2 | KEEP-ROUTING | frontend-design description/trigger | Med | Keep |
| C128 | 2 | KEEP-COMPRESSED | Duplicates C127 purpose | Low | Keep (compress) |
| C129 | 2 | KEEP-POLICY | Commit to bold aesthetic direction | Med | Keep |
| C130 | 2 | KEEP-COMPRESSED | Purpose/audience | Med | Keep (compress) |
| C131 | 2 | KEEP-POLICY | Tone options | Med | Keep |
| C132 | 2 | KEEP-POLICY | Constraints | Med | Keep |
| C133 | 2 | KEEP-POLICY | Differentiation | Med | Keep |
| C134 | 2 | KEEP-POLICY | CRITICAL conceptual direction | Med | Keep |
| C135 | 2 | KEEP-POLICY | Implement working code | Med | Keep |
| C136 | 2 | KEEP-POLICY | Production-grade | Med | Keep |
| C137 | 2 | KEEP-POLICY | Visually striking | Med | Keep |
| C138 | 2 | KEEP-POLICY | Cohesive point-of-view | Med | Keep |
| C139 | 2 | KEEP-POLICY | Meticulously refined | Med | Keep |
| C140 | 2 | KEEP-ROUTING | Consult typography reference | Med | Keep |
| C141 | 2 | KEEP-POLICY | Pair display+body font | Med | Keep |
| C142 | 2 | KEEP-POLICY | DO modular scale | Med | Keep |
| C143 | 2 | KEEP-POLICY | DO vary weights | Med | Keep |
| C144 | 2 | KEEP-POLICY | DON'T overused fonts | Med | Keep |
| C145 | 2 | KEEP-POLICY | DON'T lazy monospace | Med | Keep |
| C146 | 2 | KEEP-POLICY | DON'T icons+rounded headings | Med | Keep |
| C147 | 2 | KEEP-ROUTING | Consult color reference | Med | Keep |
| C148 | 2 | KEEP-POLICY | Cohesive palette | Med | Keep |
| C149 | 2 | KEEP-POLICY | DO modern CSS color | Med | Keep |
| C150 | 2 | KEEP-POLICY | DO tint neutrals | Med | Keep |
| C151 | 2 | KEEP-POLICY | DON'T gray on colored bg | Med | Keep |
| C152 | 2 | KEEP-POLICY | DON'T pure black/white | Med | Keep |
| C153 | 2 | KEEP-POLICY | DON'T AI palette | Med | Keep |
| C154 | 2 | KEEP-POLICY | DON'T gradient text | Med | Keep |
| C155 | 2 | KEEP-POLICY | DON'T default dark mode | Med | Keep |
| C156 | 2 | KEEP-ROUTING | Consult spatial reference | Med | Keep |
| C157 | 2 | KEEP-POLICY | Visual rhythm varied spacing | Med | Keep |
| C158 | 2 | KEEP-POLICY | DO rhythm tight/generous | Med | Keep |
| C159 | 2 | KEEP-POLICY | DO fluid spacing | Med | Keep |
| C160 | 2 | KEEP-POLICY | DO asymmetry | Med | Keep |
| C161 | 2 | KEEP-POLICY | DON'T wrap everything in cards | Med | Keep |
| C162 | 2 | KEEP-POLICY | DON'T nest cards | Med | Keep |
| C163 | 2 | KEEP-POLICY | DON'T identical card grids | Med | Keep |
| C164 | 2 | KEEP-POLICY | DON'T hero metric template | Med | Keep |
| C165 | 2 | KEEP-POLICY | DON'T center everything | Med | Keep |
| C166 | 2 | KEEP-POLICY | DON'T same spacing everywhere | Med | Keep |
| C167 | 2 | KEEP-POLICY | DO purposeful decorative elements | Med | Keep |
| C168 | 2 | KEEP-POLICY | DON'T glassmorphism everywhere | Med | Keep |
| C169 | 2 | KEEP-POLICY | DON'T rounded+thick border | Med | Keep |
| C170 | 2 | KEEP-POLICY | DON'T sparklines as decoration | Med | Keep |
| C171 | 2 | KEEP-POLICY | DON'T rounded+drop shadows | Med | Keep |
| C172 | 2 | KEEP-POLICY | DON'T modals lazily | Med | Keep |
| C173 | 2 | KEEP-ROUTING | Consult motion reference | Med | Keep |
| C174 | 2 | KEEP-POLICY | High-impact motion moments | Med | Keep |
| C175 | 2 | KEEP-POLICY | DO motion for state | Med | Keep |
| C176 | 2 | KEEP-POLICY | DO exponential easing | Med | Keep |
| C177 | 2 | KEEP-POLICY | DO grid-template-rows height anim | Med | Keep |
| C178 | 2 | KEEP-POLICY | DON'T animate layout props | Med | Keep |
| C179 | 2 | KEEP-POLICY | DON'T bounce/elastic easing | Med | Keep |
| C180 | 2 | KEEP-ROUTING | Consult interaction reference | Med | Keep |
| C181 | 2 | KEEP-POLICY | Optimistic UI | Med | Keep |
| C182 | 2 | KEEP-POLICY | DO progressive disclosure | Med | Keep |
| C183 | 2 | KEEP-POLICY | DO empty states teach | Med | Keep |
| C184 | 2 | KEEP-POLICY | DO intentional interactive surfaces | Med | Keep |
| C185 | 2 | KEEP-POLICY | DON'T repeat information | Med | Keep |
| C186 | 2 | KEEP-POLICY | DON'T all buttons primary | Med | Keep |
| C187 | 2 | KEEP-ROUTING | Consult responsive reference | Med | Keep |
| C188 | 2 | KEEP-POLICY | DO container queries | Med | Keep |
| C189 | 2 | KEEP-POLICY | DO adapt context | Med | Keep |
| C190 | 2 | KEEP-POLICY | DON'T hide critical on mobile | Med | Keep |
| C191 | 2 | KEEP-ROUTING | Consult ux-writing reference | Med | Keep |
| C192 | 2 | KEEP-POLICY | DO make words earn place | Med | Keep |
| C193 | 2 | KEEP-POLICY | DON'T repeat visible info | Med | Keep |
| C194 | 2 | KEEP-POLICY | Critical AI-slop test | Med | Keep |
| C195 | 2 | KEEP-POLICY | Distinctive-interpretation test | Med | Keep |
| C196 | 2 | KEEP-POLICY | DON'T fingerprints 2024-25 | Med | Keep |
| C197 | 2 | KEEP-POLICY | Match complexity to vision | Med | Keep |
| C198 | 2 | KEEP-POLICY | Interpret creatively/never converge | Med | Keep |
| C199 | 2 | KEEP-POLICY | Remember: extraordinary work | Med | Keep |
| C200 | 2 | KEEP-ROUTING | harness-eval description/trigger | Med | Keep |
| C201 | 2 | KEEP-POLICY | Report-only default | Med | Keep |
| C202 | 2 | KEEP-POLICY | Stop and ask gates | Med | Keep |
| C203 | 2 | KEEP-POLICY | Order Q1→Q2→Track A | Med | Keep |
| C204 | 2 | KEEP-ROUTING | Q1 optional docs | Med | Keep |
| C205 | 2 | KEEP-ROUTING | Re-run inventory flags | Med | Keep |
| C206 | 2 | KEEP-POLICY | Ask before Track A budget | Med | Keep |
| C207 | 2 | KEEP-POLICY | Fill claim count | Med | Keep |
| C208 | 2 | KEEP-ROUTING | A only path | Med | Keep |
| C209 | 2 | KEEP-ROUTING | B path | Med | Keep |
| C210 | 2 | KEEP-ROUTING | C path | Med | Keep |
| C211 | 2 | KEEP-ROUTING | B+C path | Med | Keep |
| C212 | 2 | KEEP-POLICY | Treat pre-approval as approval | Med | Keep |
| C213 | 2 | KEEP-CAVEAT | Self-contained skill/SKILL_DIR | Med | Keep |
| C214 | 2 | KEEP-ROUTING | Read PROTOCOL.md completely | Med | Keep |
| C215 | 2 | KEEP-ROUTING | Read judge-prompts for judges | Med | Keep |
| C216 | 2 | KEEP-ROUTING | GLOSSARY.md location | Med | Keep |
| C217 | 2 | KEEP-ROUTING | claims.schema.json | Med | Keep |
| C218 | 2 | KEEP-ROUTING | Run scripts via SKILL_DIR | Med | Keep |
| C219 | 2 | KEEP-ROUTING | Outputs to .harness-eval/runs | Med | Keep |
| C220 | 2 | KEEP-POLICY | Report-only | Med | Keep |
| C221 | 2 | KEEP-CAVEAT | README out of scope | Med | Keep |
| C222 | 2 | KEEP-POLICY | Stack-agnostic | Med | Keep |
| C223 | 2 | KEEP-POLICY | Doc scope/T2 | Med | Keep |
| C224 | 2 | KEEP-POLICY | Track A always runs | Med | Keep |
| C225 | 2 | KEEP-POLICY | B/C require approval | Med | Keep |
| C226 | 2 | KEEP-POLICY | Track B dual judges+plants | Med | Keep |
| C227 | 2 | KEEP-POLICY | Track C dual judges+plants | Med | Keep |
| C228 | 2 | KEEP-CAVEAT | KEEP plants not verbatim copies | Med | Keep |
| C229 | 2 | KEEP-POLICY | Subagent model allowlist | Med | Keep |
| C230 | 2 | KEEP-POLICY | Don't equate tracks | Med | Keep |
| C231 | 2 | KEEP-POLICY | Slim apply/fan-in | Med | Keep |
| C232 | 2 | KEEP-POLICY | Mixed/Slim self-contained | Med | Keep |
| C233 | 2 | KEEP-POLICY | Mixed apply mechanical | Med | Keep |
| C234 | 2 | KEEP-ROUTING | Set/verify SKILL_DIR | Med | Keep |
| C235 | 2 | KEEP-ROUTING | PROTOCOL.md path | Med | Keep |
| C236 | 2 | KEEP-ROUTING | inventory_extract.py path | Med | Keep |
| C237 | 2 | KEEP-ROUTING | track_a_correctness.py path | Med | Keep |
| C238 | 2 | KEEP-ROUTING | merge_agreement.py path | Med | Keep |
| C239 | 2 | KEEP-ROUTING | surfaces_extract.py path | Med | Keep |
| C240 | 2 | KEEP-ROUTING | merge_usefulness.py path | Med | Keep |
| C241 | 2 | KEEP-ROUTING | slim_fanin.py path | Med | Keep |
| C242 | 2 | KEEP-ROUTING | doc_scope.py path | Med | Keep |
| C243 | 2 | KEEP-POLICY | If missing, stop | Med | Keep |
| C244 | 2 | KEEP-ROUTING | From target repo root | Med | Keep |
| C245 | 2 | KEEP-ROUTING | Expected run dir files | Med | Keep |
| C246 | 2 | KEEP-ROUTING | Read optional-docs-candidates.md | Med | Keep |
| C247 | 2 | KEEP-POLICY | Run Q2 before Track A | Med | Keep |
| C248 | 2 | KEEP-ROUTING | Expected 04-correctness.md | Med | Keep |
| C249 | 2 | KEEP-POLICY | Summarize Track A | Med | Keep |
| C250 | 2 | KEEP-ROUTING | Track B Judge1 spawn | Med | Keep |
| C251 | 2 | KEEP-CAVEAT | Judge1 may read inventory, not trap-key | Med | Keep |
| C252 | 2 | KEEP-ROUTING | Track B Judge2 spawn | Med | Keep |
| C253 | 2 | KEEP-CAVEAT | Judge2 forbidden files | Med | Keep |
| C254 | 2 | KEEP-POLICY | Run steps 4+5 in parallel | Med | Keep |
| C255 | 2 | KEEP-POLICY | Merge 07-agreement; trap handling | Med | Keep |
| C256 | 2 | KEEP-ROUTING | Expected surfaces files | Med | Keep |
| C257 | 2 | KEEP-ROUTING | Usefulness Judge1 | Med | Keep |
| C258 | 2 | KEEP-CAVEAT | Judge1 not usefulness-trap-key | Med | Keep |
| C259 | 2 | KEEP-ROUTING | Usefulness Judge2 same model | Med | Keep |
| C260 | 2 | KEEP-CAVEAT | Judge2 forbidden files | Med | Keep |
| C261 | 2 | KEEP-POLICY | Run steps 8+9 in parallel | Med | Keep |
| C262 | 2 | KEEP-POLICY | Expected 10/11 + slim-fanin | Med | Keep |
| C263 | 2 | KEEP-POLICY | Summarize from agreement reports | Med | Keep |
| C264 | 2 | KEEP-POLICY | Track A broken count | Med | Keep |
| C265 | 2 | KEEP-POLICY | Track B trap+verdict | Med | Keep |
| C266 | 2 | KEEP-POLICY | Track C trap+fan-in | Med | Keep |
| C267 | 2 | KEEP-POLICY | Call out 11-mixed-apply | Med | Keep |
| C268 | 2 | KEEP-POLICY | Call out model ids/Slim sensitivity | Med | Keep |
| C269 | 2 | KEEP-POLICY | Call out slim-fanin blocked | Med | Keep |
| C270 | 2 | KEEP-POLICY | Stop unless apply requested | Med | Keep |
| C271 | 2 | KEEP-POLICY | Slim: only fan-in PASS | Med | Keep |
| C272 | 2 | KEEP-POLICY | Mixed: execute KEEP/CUT | Med | Keep |
| C273 | 2 | KEEP-ROUTING | tlc-spec-driven description/trigger | Med | Keep |
| C274 | 2 | KEEP-POLICY | Precise plan/implement | Med | Keep |
| C275 | 2 | KEEP-CAVEAT | Load refs relative to skill dir | Med | Keep |
| C276 | 2 | KEEP-POLICY | Run scripts via skill-dir | Med | Keep |
| C277 | 2 | KEEP-POLICY | Execution contract, non-negotiable | Med | Keep |
| C278 | 2 | KEEP-POLICY | Tests from AC, not impl | Med | Keep |
| C279 | 2 | KEEP-POLICY | Gate must pass | Med | Keep |
| C280 | 2 | KEEP-POLICY | One atomic commit per task | Med | Keep |
| C281 | 2 | KEEP-POLICY | Verifier always runs | Med | Keep |
| C282 | 2 | KEEP-CAVEAT | Blast radius | Med | Keep |
| C283 | 2 | KEEP-POLICY | Deterministic gates not memory | Med | Keep |
| C284 | 2 | KEEP-POLICY | validate_spec.py gate | Med | Keep |
| C285 | 2 | KEEP-POLICY | validate_tasks.py gate | Med | Keep |
| C286 | 2 | KEEP-POLICY | check_commit.py gate | Med | Keep |
| C287 | 2 | KEEP-POLICY | validate_state.py gate | Med | Keep |
| C288 | 2 | KEEP-POLICY | Non-zero exit stop | Med | Keep |
| C289 | 2 | KEEP-POLICY | Before Execute read implement.md | Med | Keep |
| C290 | 2 | KEEP-POLICY | Complexity determines depth | Med | Keep |
| C291 | 2 | KEEP-POLICY | Specify+Execute always required | Med | Keep |
| C292 | 2 | KEEP-POLICY | Design skipped when straightforward | Med | Keep |
| C293 | 2 | KEEP-POLICY | Tasks skipped ≤3 steps | Med | Keep |
| C294 | 2 | KEEP-POLICY | Discuss triggered in Specify | Med | Keep |
| C295 | 2 | KEEP-POLICY | Interactive UAT within Execute | Med | Keep |
| C296 | 2 | KEEP-POLICY | Safety valve | Med | Keep |
| C297 | 2 | KEEP-POLICY | Create artifacts lazily | Med | Keep |
| C298 | 2 | KEEP-POLICY | Specify→Design→Tasks→Execute | Med | Keep |
| C299 | 2 | KEEP-ROUTING | Read .specs/STATE.md | Med | Keep |
| C300 | 2 | KEEP-POLICY | Reconcile Handoff vs git | Med | Keep |
| C301 | 2 | KEEP-POLICY | Propose next step before coding | Med | Keep |
| C302 | 2 | KEEP-POLICY | On-demand load only | Med | Keep |
| C303 | 2 | KEEP-ROUTING | STATE.md sections | Med | Keep |
| C304 | 2 | KEEP-ROUTING | lessons.py confirmed only | Med | Keep |
| C305 | 2 | KEEP-ROUTING | spec.md load | Med | Keep |
| C306 | 2 | KEEP-ROUTING | context.md load | Med | Keep |
| C307 | 2 | KEEP-ROUTING | design.md load | Med | Keep |
| C308 | 2 | KEEP-ROUTING | tasks.md load | Med | Keep |
| C309 | 2 | KEEP-CAVEAT | Never load simultaneously | Med | Keep |
| C310 | 2 | KEEP-CAVEAT | Multiple feature specs | Med | Keep |
| C311 | 2 | KEEP-CAVEAT | Multiple architecture docs | Med | Keep |
| C312 | 2 | KEEP-POLICY | Context budget <40k | Med | Keep |
| C313 | 2 | KEEP-POLICY | Reserve 160k+ | Med | Keep |
| C314 | 2 | KEEP-POLICY | Monitoring at >40k | Med | Keep |
| C315 | 2 | KEEP-ROUTING | Sub-agent trigger | Med | Keep |
| C316 | 2 | KEEP-POLICY | Offer-then-confirm | Med | Keep |
| C317 | 2 | KEEP-POLICY | One worker per batch | Med | Keep |
| C318 | 2 | KEEP-POLICY | Verifier always-on | Med | Keep |
| C319 | 2 | KEEP-POLICY | Model tier per role | Med | Keep |
| C320 | 2 | KEEP-POLICY | Standalone fallback | Med | Keep |
| C321 | 2 | KEEP-ROUTING | Full mechanics sub-agents.md | Med | Keep |
| C322 | 2 | KEEP-COMPRESSED | Feature-level auto-sized header | Low | Keep (compress) |
| C323 | 2 | KEEP-POLICY | Knowledge verification chain | Med | Keep |
| C324 | 2 | KEEP-POLICY | Never skip to Step 5 | Med | Keep |
| C325 | 2 | KEEP-POLICY | Step 5 flagged uncertain | Med | Keep |
| C326 | 2 | KEEP-POLICY | NEVER assume/fabricate | Med | Keep |
| C327 | 2 | KEEP-POLICY | Do work, don't narrate | Med | Keep |
| C328 | 2 | KEEP-POLICY | Match effort to work | Med | Keep |
| C329 | 2 | KEEP-POLICY | Plain, decided voice | Med | Keep |
| C330 | 2 | KEEP-POLICY | Use tools, graceful degradation | Med | Keep |
| C331 | 1 | REDUNDANT-GENERAL | Boilerplate T2 template; init.md exists+linked | Medium | Drop boilerplate T2 rows |
| C332 | 1 | REDUNDANT-GENERAL | Boilerplate; opencode.json exists+linked | Medium | Drop |
| C333 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C334 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C335 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C336 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C337 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C338 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C339 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C340 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C341 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C342 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C343 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C344 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C345 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C346 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C347 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C348 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C349 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C350 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C351 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C352 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C353 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C354 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| C355 | 1 | REDUNDANT-GENERAL | Boilerplate; reference exists+linked | Medium | Drop |
| P003 | 2 | UNCLEAR | Source `.agents/skills/workflow-tips/` absent; generic guidance, cannot anchor | Low | Hold |
| P004 | 2 | UNCLEAR | Source absent; generic layering guidance | Low | Hold |
| P005 | 1 | KEEP-POLICY | Legitimate security policy (never commit secrets/env); near-paraphrase of AGENTS.md secrets rule | Medium | Keep |
| P006 | 3 | KEEP-CAVEAT | Environment/CI caveat (commands pass locally, fail in CI) | Medium | Keep |
