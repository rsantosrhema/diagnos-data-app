# Redundancy Judge1
> run: 2026-08-19-full
> model: deepseek-v4-flash:0731

## Counts summary

- REDUNDANT-CODE: 9 (C010, C011, C016, C017, C018, C019, C020, C021, C022)
- REDUNDANT-GENERAL: 0
- KEEP-POLICY: 249
- KEEP-CAVEAT: 2
- KEEP-ROUTING: 91
- KEEP-COMPRESSED: 0
- UNCLEAR: 2

Repo state used for rediscovery: scaffold-only. No `package.json`, no `tsconfig.json`, no `src/` (thus no `src/lib/report`, no API route, no PDF impl). `harness/**` code is present and self-documenting. Skills + `references/` present. `.env.example` present. `.agents/skills/workflow-tips/SKILL.md` does NOT exist. `docs/decisions/` (ADRs 001-006) present but README excluded by scope; ADR tree not treated as a discovery source for instruction content.

## Table

| ID | Cost | Class | Evidence | Confidence | Trim suggestion |
|----|------|-------|----------|------------|-----------------|
| C001 | 3 | KEEP-POLICY | Meta-statement about AGENTS.md being the system prompt; defines harness contract. Not derivable from code. | High | none |
| C002 | 3 | KEEP-POLICY | Product description (Next.js data maturity diagnostic). No package.json/src to rediscover from; repo is scaffold only. | High | none |
| C003 | 2 | KEEP-POLICY | Header introducing product flow. Not derivable from code. | Medium | none |
| C004 | 2 | KEEP-POLICY | Chatbot questionnaire, 8-12 questions, DAMA-DMBOK. Count/questions/design not derivable from `questionnaire.ts` alone. | Medium | none |
| C005 | 2 | KEEP-POLICY | Harness orchestrates LLM evaluation; needs reading pipeline across modules. | Medium | none |
| C006 | 2 | KEEP-POLICY | Ollama via HTTP; derivable only by reading client+pipeline. | Medium | none |
| C007 | 2 | KEEP-POLICY | PDF report flow; report is a placeholder stub, not fully implemented. | Medium | none |
| C008 | 2 | KEEP-POLICY | @react-pdf/design constraint (src/lib/report injection). src/lib/report does not exist; it is a policy. | High | none |
| C009 | 2 | KEEP-POLICY | Harness purity policy (no React/Next imports). Policy constraint, not in code. | High | none |
| C010 | 1 | REDUNDANT-CODE | `DiagnosticInput` type is declared verbatim in `harness/core/types.ts`; single-file header read reveals it. | Medium | Restate less; type lives in core/types.ts |
| C011 | 1 | REDUNDANT-CODE | `DiagnosticResult` shape (dimensions, overall, narrative, charts) present in `core/types.ts`. | Medium | Restate less; type lives in core/types.ts |
| C012 | 2 | KEEP-POLICY | Validate-via-Zod requires reading `pipeline.ts` + `schema.ts` across modules. | Medium | none |
| C013 | 2 | KEEP-POLICY | Evaluate step requires reading evaluator/pipeline across modules. | Medium | none |
| C014 | 2 | KEEP-POLICY | Report step requires reading report generator across modules. | Medium | none |
| C015 | 2 | KEEP-POLICY | DAMA-DMBOK mapping not derivable from `maturity-model.ts` alone (names only, not framework attribution). | Medium | none |
| C016 | 1 | REDUNDANT-CODE | Exact dimension list is `DIMENSIONS` in `harness/config/maturity-model.ts` (cost 1 file read). | High | Drop verbatim list; reference the file |
| C017 | 1 | REDUNDANT-CODE | Maturity levels 0-5 CMMI are `MATURITY_LEVELS` in `maturity-model.ts`. | High | Drop; reference the file |
| C018 | 1 | REDUNDANT-CODE | `1: "Initial / Ad hoc"` verbatim in `MATURITY_LEVELS`. | High | Drop; reference the file |
| C019 | 1 | REDUNDANT-CODE | Weighted aggregate is `weightedAggregate()` in `maturity-model.ts`. | High | Drop; reference the function |
| C020 | 1 | REDUNDANT-CODE | Question→dimension+weight mapping is `QUESTIONNAIRE` in `questionnaire.ts` (10 items); the "8-12" bound is extra but mapping is fully rediscoverable. | Low | Drop mapping restate; keep the 8-12 bound note |
| C021 | 1 | REDUNDANT-CODE | Provider client path `harness/providers/ollama/client.ts` exists and is self-evident from listing. | Medium | Reference path only |
| C022 | 1 | REDUNDANT-CODE | Env vars OLLAMA_* documented in `.env.example` (present). | Medium | Drop (already in .env.example) |
| C023 | 2 | KEEP-ROUTING | Sending system+user prompts requires reading `evaluator/evaluator.ts` + prompts/. | Medium | none |
| C024 | 2 | KEEP-POLICY | Structured JSON output (format:"json") in `ollama/client.ts`; needs module read. | Medium | none |
| C025 | 2 | KEEP-POLICY | Timeouts/retries/typed errors are implemented but the policy statement needs multi-module read. | Medium | none |
| C026 | 2 | KEEP-POLICY | Secrets/process.env policy. Code reads env, but the "never hardcode" rule is policy. | High | none |
| C027 | 2 | KEEP-POLICY | TS strict/no-any style rule. No tsconfig exists; policy only. | High | none |
| C028 | 2 | KEEP-POLICY | Comment convention rule; policy only. | High | none |
| C029 | 2 | KEEP-POLICY | Named-exports convention; policy only. | High | none |
| C030 | 2 | KEEP-POLICY | "Follow existing patterns" general style rule. | High | none |
| C031 | 2 | KEEP-POLICY | Harness purity: no src/React imports. Policy, not in code. | High | none |
| C032 | 2 | KEEP-POLICY | I/O inside harness modules boundary. Policy. | High | none |
| C033 | 2 | KEEP-POLICY | PDF generator lives in src/lib/report + ReportGenerator injection. Policy (that dir does not exist yet). | High | none |
| C034 | 2 | KEEP-POLICY | Zod validation convention; schema exists but the "use Zod" rule is policy. | High | none |
| C035 | 2 | KEEP-POLICY | Validate-at-boundary rule; policy. | High | none |
| C036 | 2 | KEEP-POLICY | Typed errors directive (ValidationError/ProviderError/ReportError); classes exist but "use these" is policy. | Medium | none |
| C037 | 2 | KEEP-POLICY | Map errors to HTTP codes in API route. src/ route does not exist; policy. | Medium | none |
| C038 | 2 | KEEP-POLICY | Unit-test expectation; no test files present. policy. | Medium | none |
| C039 | 2 | KEEP-POLICY | Mock-Ollama-in-tests rule; policy. | Medium | none |
| C040 | 2 | KEEP-POLICY | Test-runner-documentation rule; policy. | Medium | none |
| C041 | 2 | KEEP-POLICY | `npm run dev` command; no package.json to rediscover. Keep as documented command. | Medium | none |
| C042 | 2 | KEEP-POLICY | `npm run build`; no package.json. Keep. | Medium | none |
| C043 | 2 | KEEP-POLICY | `npm run lint`; no package.json. Keep. | Medium | none |
| C044 | 2 | KEEP-POLICY | `npm run test`; no package.json. Keep. | Medium | none |
| C045 | 1 | KEEP-ROUTING | Points to `.opencode/opencode.json` which exists; routing pointer to config file. | Medium | none (keep pointer) |
| C046 | 2 | KEEP-ROUTING | `/init` command doc; `init.md` exists, but instruction to run it is routing not derivable. | Medium | none |
| C047 | 2 | KEEP-POLICY | Restart-OpenCode-after-.opencode rule; process/policy. | High | none |
| C048 | 2 | KEEP-POLICY | "A task is done when" intro; process. | Medium | none |
| C049 | 2 | KEEP-POLICY | DoD: conventions §7; process checklist. | Medium | none |
| C050 | 2 | KEEP-POLICY | DoD: harness purity; process. | Medium | none |
| C051 | 2 | KEEP-POLICY | DoD: Zod validation; process. | Medium | none |
| C052 | 2 | KEEP-POLICY | DoD: typed errors/HTTP mapping; process. | Medium | none |
| C053 | 2 | KEEP-POLICY | DoD: tests pass; process. | Medium | none |
| C054 | 2 | KEEP-POLICY | DoD: lint+build pass; process. | Medium | none |
| C055 | 2 | KEEP-POLICY | DoD: no secrets + .env.example documented; process. | Medium | none |
| C056 | 2 | KEEP-ROUTING | create-adr skill trigger routing (do/do-not). Unique to skill. | High | none |
| C057 | 2 | KEEP-POLICY | ADR expert framing; unique to skill. | High | none |
| C058 | 2 | KEEP-ROUTING | "Use this skill when" intro; routing. | Medium | none |
| C059 | 2 | KEEP-ROUTING | User asks "write/create/add ADR" trigger. routing. | Medium | none |
| C060 | 2 | KEEP-ROUTING | "document why we chose X" trigger. routing. | Medium | none |
| C061 | 2 | KEEP-ROUTING | significant decision trigger. routing. | Medium | none |
| C062 | 2 | KEEP-ROUTING | preserve reasoning trigger. routing. | Medium | none |
| C063 | 2 | KEEP-ROUTING | "why did we choose X" trigger. routing. | Medium | none |
| C064 | 2 | KEEP-ROUTING | use create-rfc for undecided. routing. | Medium | none |
| C065 | 2 | KEEP-ROUTING | use technical-design-doc for implementation. routing. | Medium | none |
| C066 | 2 | KEEP-ROUTING | trivial decisions do-not. routing. | Medium | none |
| C067 | 2 | KEEP-ROUTING | meeting-notes do-not. routing. | Medium | none |
| C068 | 2 | KEEP-ROUTING | "decide whether to do X" → create-rfc. routing. | Medium | none |
| C069 | 2 | KEEP-ROUTING | "We decided to do X" → this skill. routing. | Medium | none |
| C070 | 2 | KEEP-POLICY | Language adaptation rule; policy unique to skill. | High | none |
| C071 | 2 | KEEP-POLICY | English technical terms; policy. | Medium | none |
| C072 | 2 | KEEP-POLICY | headers in user language; policy. | Medium | none |
| C073 | 2 | KEEP-POLICY | company names preserved; policy. | Medium | none |
| C074 | 2 | KEEP-ROUTING | format selection/ask; routing. | Medium | none |
| C075 | 2 | KEEP-POLICY | default MADR; policy. | Medium | none |
| C076 | 2 | KEEP-ROUTING | AskQuestion when minimal context; routing. | Medium | none |
| C077 | 2 | KEEP-POLICY | mandatory fields ask-if-missing; policy. | Medium | none |
| C078 | 2 | KEEP-POLICY | decision title field; policy. | Medium | none |
| C079 | 2 | KEEP-POLICY | date field; policy. | Medium | none |
| C080 | 2 | KEEP-POLICY | status field; policy. | Medium | none |
| C081 | 2 | KEEP-POLICY | context field; policy. | Medium | none |
| C082 | 2 | KEEP-POLICY | decision field; policy. | Medium | none |
| C083 | 2 | KEEP-POLICY | consequences field; policy. | Medium | none |
| C084 | 2 | KEEP-POLICY | recommended fields intro; policy. | Medium | none |
| C085 | 2 | KEEP-POLICY | decision drivers; policy. | Medium | none |
| C086 | 2 | KEEP-POLICY | options considered; policy. | Medium | none |
| C087 | 2 | KEEP-POLICY | pros/cons; policy. | Medium | none |
| C088 | 2 | KEEP-POLICY | rationale; policy. | Medium | none |
| C089 | 2 | KEEP-POLICY | links; policy. | Medium | none |
| C090 | 2 | KEEP-ROUTING | ask-in-user-language if missing; routing. | Medium | none |
| C091 | 2 | KEEP-ROUTING | scan ADR dir for next number; routing. | Medium | none |
| C092 | 2 | KEEP-ROUTING | check ADR directory exists; routing. | Medium | none |
| C093 | 2 | KEEP-ROUTING | find highest number; routing. | Medium | none |
| C094 | 2 | KEEP-ROUTING | assign next number; routing. | Medium | none |
| C095 | 2 | KEEP-ROUTING | if none, start ADR-001; routing. | Medium | none |
| C096 | 2 | KEEP-ROUTING | generate ADR per selected format; routing. | Medium | none |
| C097 | 2 | KEEP-ROUTING | ask where to save; routing. | Medium | none |
| C098 | 2 | KEEP-POLICY | verify before finalize; policy. | Medium | none |
| C099 | 2 | KEEP-POLICY | checklist title noun phrase; policy. | Medium | none |
| C100 | 2 | KEEP-POLICY | checklist date included; policy. | Medium | none |
| C101 | 2 | KEEP-POLICY | checklist status correct; policy. | Medium | none |
| C102 | 2 | KEEP-POLICY | checklist context = forces; policy. | Medium | none |
| C103 | 2 | KEEP-POLICY | checklist decision stated; policy. | Medium | none |
| C104 | 2 | KEEP-POLICY | checklist honest consequences; policy. | Medium | none |
| C105 | 2 | KEEP-POLICY | checklist ≥2 options; policy. | Medium | none |
| C106 | 2 | KEEP-POLICY | checklist supersedes links; policy. | Medium | none |
| C107 | 2 | KEEP-POLICY | checklist file naming; policy. | Medium | none |
| C108 | 2 | KEEP-POLICY | checklist sequential number; policy. | Medium | none |
| C109 | 2 | KEEP-POLICY | zero-padded numbers; rule (ADR tree excluded as discovery source). | Low | none |
| C110 | 2 | KEEP-POLICY | common ADR dirs list; generic knowledge. | Low | none |
| C111 | 2 | KEEP-POLICY | bad title example; teaching. | Medium | none |
| C112 | 2 | KEEP-POLICY | good title example; teaching. | Medium | none |
| C113 | 2 | KEEP-POLICY | title-records-decision guidance; teaching. | Medium | none |
| C114 | 2 | KEEP-POLICY | context-explains-forces guidance; teaching. | Medium | none |
| C115 | 2 | KEEP-POLICY | honest-trade-offs guidance; teaching. | Medium | none |
| C116 | 2 | KEEP-POLICY | bad: edit old ADR; teaching. | Medium | none |
| C117 | 2 | KEEP-POLICY | good: supersede; teaching. | Medium | none |
| C118 | 2 | KEEP-POLICY | ADR-historical rationale; teaching. | Medium | none |
| C119 | 2 | KEEP-POLICY | rationale=why this option; teaching. | Medium | none |
| C120 | 2 | KEEP-POLICY | ADRs immutable; policy. | High | none |
| C121 | 2 | KEEP-POLICY | short-better 200-500 words; policy. | Medium | none |
| C122 | 2 | KEEP-CAVEAT | context-ages/date caution; caveat. | Medium | none |
| C123 | 2 | KEEP-POLICY | honest consequences; policy. | Medium | none |
| C124 | 2 | KEEP-POLICY | link everything; policy. | Medium | none |
| C125 | 2 | KEEP-POLICY | language adaptation; policy (duplicate of C070 but within-skill, cost 2). | Low | consider de-dup with C070 |
| C126 | 2 | KEEP-POLICY | number sequentially; policy (near-duplicate C091). | Low | consider de-dup with C091 |
| C127 | 2 | KEEP-ROUTING | frontend-design skill trigger routing. | High | none |
| C128 | 2 | KEEP-POLICY | skill purpose/avoid AI-slop; policy. | High | none |
| C129 | 2 | KEEP-POLICY | bold aesthetic direction; policy. | Medium | none |
| C130 | 2 | KEEP-POLICY | purpose framing; teaching. | Medium | none |
| C131 | 2 | KEEP-POLICY | tone choices; teaching. | Medium | none |
| C132 | 2 | KEEP-POLICY | constraints; teaching. | Medium | none |
| C133 | 2 | KEEP-POLICY | differentiation; teaching. | Medium | none |
| C134 | 2 | KEEP-POLICY | intentionality-not-intensity; teaching. | Medium | none |
| C135 | 2 | KEEP-POLICY | implement working code; teaching. | Medium | none |
| C136 | 2 | KEEP-POLICY | production-grade; teaching. | Medium | none |
| C137 | 2 | KEEP-POLICY | visually striking; teaching. | Medium | none |
| C138 | 2 | KEEP-POLICY | cohesive viewpoint; teaching. | Medium | none |
| C139 | 2 | KEEP-POLICY | meticulously refined; teaching. | Medium | none |
| C140 | 1 | KEEP-ROUTING | → typography reference pointer; file exists. | High | none (keep pointer) |
| C141 | 2 | KEEP-POLICY | font pairing guidance; teaching. | Medium | none |
| C142 | 2 | KEEP-POLICY | modular type scale; teaching. | Medium | none |
| C143 | 2 | KEEP-POLICY | vary weights/sizes; teaching. | Medium | none |
| C144 | 2 | KEEP-POLICY | don't use overused fonts; teaching. | Medium | none |
| C145 | 2 | KEEP-POLICY | don't monospace-shorthand; teaching. | Medium | none |
| C146 | 2 | KEEP-POLICY | don't big-icons-above-headings; teaching. | Medium | none |
| C147 | 1 | KEEP-ROUTING | → color reference pointer; file exists. | High | none (keep pointer) |
| C148 | 2 | KEEP-POLICY | cohesive palette; teaching. | Medium | none |
| C149 | 2 | KEEP-POLICY | modern CSS color functions; teaching. | Medium | none |
| C150 | 2 | KEEP-POLICY | tint neutrals; teaching. | Medium | none |
| C151 | 2 | KEEP-POLICY | don't gray-on-colored; teaching. | Medium | none |
| C152 | 2 | KEEP-POLICY | don't pure black/white; teaching. | Medium | none |
| C153 | 2 | KEEP-POLICY | don't AI palette; teaching. | Medium | none |
| C154 | 2 | KEEP-POLICY | don't gradient text; teaching. | Medium | none |
| C155 | 2 | KEEP-POLICY | don't default dark-mode-glow; teaching. | Medium | none |
| C156 | 1 | KEEP-ROUTING | → spatial reference pointer; file exists. | High | none (keep pointer) |
| C157 | 2 | KEEP-POLICY | visual rhythm/spacing; teaching. | Medium | none |
| C158 | 2 | KEEP-POLICY | varied spacing DO; teaching. | Medium | none |
| C159 | 2 | KEEP-POLICY | clamp breathing DO; teaching. | Medium | none |
| C160 | 2 | KEEP-POLICY | asymmetry DO; teaching. | Medium | none |
| C161 | 2 | KEEP-POLICY | don't wrap everything in cards; teaching. | Medium | none |
| C162 | 2 | KEEP-POLICY | don't nest cards; teaching. | Medium | none |
| C163 | 2 | KEEP-POLICY | don't identical card grids; teaching. | Medium | none |
| C164 | 2 | KEEP-POLICY | don't hero metric template; teaching. | Medium | none |
| C165 | 2 | KEEP-POLICY | don't center everything; teaching. | Medium | none |
| C166 | 2 | KEEP-POLICY | don't same spacing; teaching. | Medium | none |
| C167 | 2 | KEEP-POLICY | intentional decorative elements; teaching. | Medium | none |
| C168 | 2 | KEEP-POLICY | don't glassmorphism everywhere; teaching. | Medium | none |
| C169 | 2 | KEEP-POLICY | don't rounded+thick border; teaching. | Medium | none |
| C170 | 2 | KEEP-POLICY | don't sparklines-as-decoration; teaching. | Medium | none |
| C171 | 2 | KEEP-POLICY | don't rounded-rect-drop-shadow; teaching. | Medium | none |
| C172 | 2 | KEEP-POLICY | don't modals; teaching. | Medium | none |
| C173 | 1 | KEEP-ROUTING | → motion reference pointer; file exists. | High | none (keep pointer) |
| C174 | 2 | KEEP-POLICY | high-impact moments; teaching. | Medium | none |
| C175 | 2 | KEEP-POLICY | motion-convey-state DO; teaching. | Medium | none |
| C176 | 2 | KEEP-POLICY | exponential easing DO; teaching. | Medium | none |
| C177 | 2 | KEEP-POLICY | grid-template-rows transitions DO; teaching. | Medium | none |
| C178 | 2 | KEEP-POLICY | don't animate layout props; teaching. | Medium | none |
| C179 | 2 | KEEP-POLICY | don't bounce/elastic; teaching. | Medium | none |
| C180 | 1 | KEEP-ROUTING | → interaction reference pointer; file. | High | none (keep pointer) |
| C181 | 2 | KEEP-POLICY | optimistic UI; teaching. | Medium | none |
| C182 | 2 | KEEP-POLICY | progressive disclosure DO; teaching. | Medium | none |
| C183 | 2 | KEEP-POLICY | empty-states-teach DO; teaching. | Medium | none |
| C184 | 2 | KEEP-POLICY | interactive surfaces intentional DO; teaching. | Medium | none |
| C185 | 2 | KEEP-POLICY | don't repeat info; teaching. | Medium | none |
| C186 | 2 | KEEP-POLICY | don't make every button primary; teaching. | Medium | none |
| C187 | 1 | KEEP-ROUTING | → responsive reference pointer; file. | High | none (keep pointer) |
| C188 | 2 | KEEP-POLICY | container queries DO; teaching. | Medium | none |
| C189 | 2 | KEEP-POLICY | adapt contexts DO; teaching. | Medium | none |
| C190 | 2 | KEEP-POLICY | don't hide critical mobile; teaching. | Medium | none |
| C191 | 1 | KEEP-ROUTING | → ux-writing reference pointer; file. | High | none (keep pointer) |
| C192 | 2 | KEEP-POLICY | every word earns place DO; teaching. | Medium | none |
| C193 | 2 | KEEP-POLICY | don't repeat visible info; teaching. | Medium | none |
| C194 | 2 | KEEP-POLICY | AI-tell quality check; teaching. | Medium | none |
| C195 | 2 | KEEP-POLICY | how-was-this-made; teaching. | Medium | none |
| C196 | 2 | KEEP-POLICY | review DON'T list (fingerprints); teaching. | Medium | none |
| C197 | 2 | KEEP-POLICY | match complexity to vision; teaching. | Medium | none |
| C198 | 2 | KEEP-POLICY | interpret creatively/don't converge; teaching. | Medium | none |
| C199 | 2 | KEEP-POLICY | encouragement/motivation; teaching. | Low | none |
| C200 | 2 | KEEP-ROUTING | harness-eval skill description+trigger. unique to skill. | High | none |
| C201 | 2 | KEEP-POLICY | report-only default; policy. | High | none |
| C202 | 2 | KEEP-POLICY | stop-and-ask gates; policy. | High | none |
| C203 | 2 | KEEP-ROUTING | Q ordering (Q1→Q2→Track A); routing. | High | none |
| C204 | 2 | KEEP-ROUTING | ask-before-Q2/TrackA if optional docs; routing. | Medium | none |
| C205 | 2 | KEEP-ROUTING | re-run inventory after answer; routing. | Medium | none |
| C206 | 2 | KEEP-ROUTING | ask before Track A budget; routing. | Medium | none |
| C207 | 2 | KEEP-ROUTING | fill claim count from claims.md; routing. | Medium | none |
| C208 | 2 | KEEP-ROUTING | A-only branch; routing. | Medium | none |
| C209 | 2 | KEEP-ROUTING | B branch; routing. | Medium | none |
| C210 | 2 | KEEP-ROUTING | C branch; routing. | Medium | none |
| C211 | 2 | KEEP-ROUTING | B+C branch; routing. | Medium | none |
| C212 | 2 | KEEP-ROUTING | pre-approval note; routing. | Medium | none |
| C213 | 2 | KEEP-ROUTING | self-contained SKILL_DIR resolution; routing. | High | none |
| C214 | 2 | KEEP-ROUTING | read PROTOCOL.md completely; routing. | Medium | none |
| C215 | 2 | KEEP-ROUTING | read judge-prompts.md; routing. | Medium | none |
| C216 | 2 | KEEP-ROUTING | glossary reference; routing. | Medium | none |
| C217 | 2 | KEEP-ROUTING | claims.schema.json for tooling; routing. | Medium | none |
| C218 | 2 | KEEP-ROUTING | run scripts via python3 $SKILL_DIR; routing. | High | none |
| C219 | 2 | KEEP-ROUTING | outputs go to .harness-eval/runs/<id>/; routing. | Medium | none |
| C220 | 2 | KEEP-POLICY | report-only by default; policy. | High | none |
| C221 | 2 | KEEP-POLICY | README out of scope; policy. | High | none |
| C222 | 2 | KEEP-POLICY | stack-agnostic, no hard-coded packages; policy. | High | none |
| C223 | 2 | KEEP-POLICY | doc scope (T2 skills trees, ADR excluded); policy. | High | none |
| C224 | 2 | KEEP-POLICY | Track A always runs, prefer false-negatives; policy. | High | none |
| C225 | 2 | KEEP-POLICY | B/C require approval; policy. | High | none |
| C226 | 2 | KEEP-POLICY | Track B dual judges+plants+Ship conditions; policy. | High | none |
| C227 | 2 | KEEP-POLICY | Track C dual judges+fan-in+Slim conditions; policy. | High | none |
| C228 | 2 | KEEP-POLICY | KEEP/KEEP-CORE plants not verbatim; policy. | High | none |
| C229 | 2 | KEEP-POLICY | subagents allowlisted non-fast model; policy. | High | none |
| C230 | 2 | KEEP-POLICY | do not equate tracks; policy. | High | none |
| C231 | 2 | KEEP-POLICY | slim apply/fan-in blocked; policy. | High | none |
| C232 | 2 | KEEP-POLICY | mixed/slim apply stays self-contained; policy. | High | none |
| C233 | 2 | KEEP-POLICY | mixed apply mechanical (11-mixed-apply KEEP/CUT); policy. | High | none |
| C234 | 2 | KEEP-ROUTING | set SKILL_DIR + verify (paths). | Medium | none |
| C235 | 1 | KEEP-ROUTING | `references/PROTOCOL.md` exists. | High | none |
| C236 | 1 | KEEP-ROUTING | `scripts/inventory_extract.py` exists. | High | none |
| C237 | 1 | KEEP-ROUTING | `scripts/track_a_correctness.py` exists. | High | none |
| C238 | 1 | KEEP-ROUTING | `scripts/merge_agreement.py` exists. | High | none |
| C239 | 1 | KEEP-ROUTING | `scripts/surfaces_extract.py` exists. | High | none |
| C240 | 1 | KEEP-ROUTING | `scripts/merge_usefulness.py` exists. | High | none |
| C241 | 1 | KEEP-ROUTING | `scripts/slim_fanin.py` exists. | High | none |
| C242 | 1 | KEEP-ROUTING | `scripts/doc_scope.py` exists. | High | none |
| C243 | 2 | KEEP-POLICY | if missing install broken - stop; policy. | High | none |
| C244 | 2 | KEEP-ROUTING | from target repo root; routing. | Medium | none |
| C245 | 2 | KEEP-ROUTING | expected run artifacts listing; routing. | Medium | none |
| C246 | 2 | KEEP-ROUTING | read optional-docs-candidates + Q1; routing. | Medium | none |
| C247 | 2 | KEEP-ROUTING | run Q2 before Track A; routing. | Medium | none |
| C248 | 2 | KEEP-ROUTING | expected 04-correctness.md + spot-check; routing. | Medium | none |
| C249 | 2 | KEEP-ROUTING | summarize Track A; routing. | Medium | none |
| C250 | 2 | KEEP-ROUTING | Track B Judge1 spawn (judge-prompts); routing. | Medium | none |
| C251 | 2 | KEEP-POLICY | Judge1 may read inventory, not trap-key; policy. | High | none |
| C252 | 2 | KEEP-ROUTING | Track B Judge2 spawn; routing. | Medium | none |
| C253 | 2 | KEEP-POLICY | Judge2 forbidden files; policy. | High | none |
| C254 | 2 | KEEP-ROUTING | prefer parallel steps 4&5; routing. | Medium | none |
| C255 | 2 | KEEP-POLICY | expected 07-agreement + trap-fail handling; policy. | High | none |
| C256 | 2 | KEEP-ROUTING | expected surfaces.md/.json + usefulness key; routing. | Medium | none |
| C257 | 2 | KEEP-ROUTING | Usefulness Judge1 spawn; routing. | Medium | none |
| C258 | 2 | KEEP-POLICY | must not read usefulness-trap-key; policy. | High | none |
| C259 | 2 | KEEP-ROUTING | Usefulness Judge2 spawn same model; routing. | Medium | none |
| C260 | 2 | KEEP-POLICY | Judge2 forbidden files for usefulness; policy. | High | none |
| C261 | 2 | KEEP-ROUTING | parallel steps 8&9; routing. | Medium | none |
| C262 | 2 | KEEP-POLICY | expected 10/11 artifacts + trap-fail no-Slim; policy. | High | none |
| C263 | 2 | KEEP-ROUTING | summarize from agreement reports; routing. | Medium | none |
| C264 | 2 | KEEP-ROUTING | Track A broken count → 04; routing. | Medium | none |
| C265 | 2 | KEEP-ROUTING | Track B trap+Ship → 07; routing. | Medium | none |
| C266 | 2 | KEEP-ROUTING | Track C → 10; routing. | Medium | none |
| C267 | 2 | KEEP-ROUTING | call out 11-mixed-apply; routing. | Medium | none |
| C268 | 2 | KEEP-ROUTING | call out model ids; routing. | Medium | none |
| C269 | 2 | KEEP-ROUTING | call out slim fan-in blocked; routing. | Medium | none |
| C270 | 2 | KEEP-POLICY | stop unless user asks apply; policy. | High | none |
| C271 | 2 | KEEP-POLICY | slim-only-paths rule; policy. | High | none |
| C272 | 2 | KEEP-POLICY | mixed open 11-mixed-apply only; policy. | High | none |
| C273 | 2 | KEEP-ROUTING | tlc-spec-driven skill description/trigger. | High | none |
| C274 | 2 | KEEP-POLICY | plan/implement precision; policy. | Medium | none |
| C275 | 2 | KEEP-ROUTING | load references via skill dir; routing. | High | none |
| C276 | 2 | KEEP-ROUTING | run scripts via skill-dir; routing. | High | none |
| C277 | 2 | KEEP-POLICY | execution contract non-negotiable; policy. | High | none |
| C278 | 2 | KEEP-POLICY | tests derive from AC, not impl; policy. | High | none |
| C279 | 2 | KEEP-POLICY | gate must pass; policy. | High | none |
| C280 | 2 | KEEP-POLICY | one atomic commit per task; policy. | High | none |
| C281 | 2 | KEEP-POLICY | Verifier always runs; policy. | High | none |
| C282 | 2 | KEEP-POLICY | blast radius (local-only); policy. | High | none |
| C283 | 2 | KEEP-POLICY | deterministic gates before review; policy. | High | none |
| C284 | 2 | KEEP-ROUTING | validate_spec.py before confirm; routing. | Medium | none |
| C285 | 2 | KEEP-ROUTING | validate_tasks.py before approval; routing. | Medium | none |
| C286 | 2 | KEEP-ROUTING | check_commit.py per commit; routing. | Medium | none |
| C287 | 2 | KEEP-ROUTING | validate_state.py before done; routing. | Medium | none |
| C288 | 2 | KEEP-POLICY | non-zero → stop; policy. | High | none |
| C289 | 2 | KEEP-ROUTING | before Execute read implement.md+validate_tasks; routing. | Medium | none |
| C290 | 2 | KEEP-POLICY | complexity-determines-depth; policy. | High | none |
| C291 | 2 | KEEP-POLICY | Specify+Execute always; policy. | High | none |
| C292 | 2 | KEEP-POLICY | Design skipped when straightforward; policy. | Medium | none |
| C293 | 2 | KEEP-POLICY | Tasks skipped when ≤3 steps; policy. | Medium | none |
| C294 | 2 | KEEP-POLICY | Discuss triggered in Specify for ambiguity; policy. | Medium | none |
| C295 | 2 | KEEP-POLICY | Interactive UAT trigger; policy. | Medium | none |
| C296 | 2 | KEEP-POLICY | safety valve → formal tasks.md; policy. | Medium | none |
| C297 | 2 | KEEP-POLICY | lazy artifacts (no empty scaffolding); policy. | High | none |
| C298 | 2 | KEEP-ROUTING | flow line Specify→(Design)→(Tasks)→Execute; routing. | Medium | none |
| C299 | 2 | KEEP-ROUTING | read .specs/STATE.md; routing. | Medium | none |
| C300 | 2 | KEEP-ROUTING | reconcile Handoff vs git/tasks; routing. | Medium | none |
| C301 | 2 | KEEP-ROUTING | propose reconciled next step; routing. | Medium | none |
| C302 | 2 | KEEP-ROUTING | on-demand load intro; routing. | Medium | none |
| C303 | 2 | KEEP-ROUTING | STATE.md load (Decisions/Handoff); routing. | Medium | none |
| C304 | 2 | KEEP-ROUTING | lessons.py load confirmed; routing. | Medium | none |
| C305 | 2 | KEEP-ROUTING | spec.md load; routing. | Medium | none |
| C306 | 2 | KEEP-ROUTING | context.md load; routing. | Medium | none |
| C307 | 2 | KEEP-ROUTING | design.md load; routing. | Medium | none |
| C308 | 2 | KEEP-ROUTING | tasks.md load; routing. | Medium | none |
| C309 | 2 | KEEP-POLICY | never load simultaneously intro; policy. | Medium | none |
| C310 | 2 | KEEP-POLICY | no multiple feature specs; policy. | Medium | none |
| C311 | 2 | KEEP-POLICY | no multiple architecture docs; policy. | Medium | none |
| C312 | 2 | KEEP-POLICY | target <40k tokens; policy. | Medium | none |
| C313 | 2 | KEEP-POLICY | reserve 160k+; policy. | Medium | none |
| C314 | 2 | KEEP-POLICY | monitoring display >40k; policy. | Medium | none |
| C315 | 2 | KEEP-ROUTING | task-count trigger; routing. | Medium | none |
| C316 | 2 | KEEP-POLICY | offer-then-confirm (never auto-spawn); policy. | High | none |
| C317 | 2 | KEEP-ROUTING | one worker per batch (~7 tasks); routing. | Medium | none |
| C318 | 2 | KEEP-POLICY | verifier always-on spec-anchored; policy. | High | none |
| C319 | 2 | KEEP-POLICY | model tier per role (portable rec); policy. | Medium | none |
| C320 | 2 | KEEP-ROUTING | standalone fallback validate.md; routing. | Medium | none |
| C321 | 2 | KEEP-ROUTING | full mechanics → sub-agents.md; routing. | Medium | none |
| C322 | 2 | KEEP-ROUTING | feature-level auto-sized; routing. | Medium | none |
| C323 | 2 | KEEP-POLICY | research chain in strict order; policy. | Medium | none |
| C324 | 2 | KEEP-POLICY | never skip to step 5; policy. | Medium | none |
| C325 | 2 | KEEP-POLICY | step 5 flagged uncertain; policy. | Medium | none |
| C326 | 2 | KEEP-POLICY | never assume/fabricate; policy. | High | none |
| C327 | 2 | KEEP-POLICY | do the work, not narrate; policy. | Medium | none |
| C328 | 2 | KEEP-POLICY | match effort to work; policy. | Medium | none |
| C329 | 2 | KEEP-POLICY | plain decided voice for artifacts; policy. | Medium | none |
| C330 | 2 | KEEP-POLICY | graceful degradation of tools; policy. | Medium | none |
| C331 | 1 | KEEP-ROUTING | on-demand load target; `opencode/command/init.md` exists. | High | none |
| C332 | 1 | KEEP-ROUTING | on-demand load target; `opencode.json` exists. | High | none |
| C333 | 1 | KEEP-ROUTING | on-demand load target; color-and-contrast.md exists. | High | none |
| C334 | 1 | KEEP-ROUTING | interaction-design.md exists. | High | none |
| C335 | 1 | KEEP-ROUTING | motion-design.md exists. | High | none |
| C336 | 1 | KEEP-ROUTING | responsive-design.md exists. | High | none |
| C337 | 1 | KEEP-ROUTING | spatial-design.md exists. | High | none |
| C338 | 1 | KEEP-ROUTING | typography.md exists. | High | none |
| C339 | 1 | KEEP-ROUTING | ux-writing.md exists. | High | none |
| C340 | 1 | KEEP-ROUTING | GLOSSARY.md exists. | High | none |
| C341 | 1 | KEEP-ROUTING | PROTOCOL.md exists. | High | none |
| C342 | 1 | KEEP-ROUTING | claims.schema.json exists. | High | none |
| C343 | 1 | KEEP-ROUTING | judge-prompts.md exists. | High | none |
| C344 | 1 | KEEP-ROUTING | code-analysis.md exists. | High | none |
| C345 | 1 | KEEP-ROUTING | coding-principles.md exists. | High | none |
| C346 | 1 | KEEP-ROUTING | context-limits.md exists. | High | none |
| C347 | 1 | KEEP-ROUTING | design.md exists. | High | none |
| C348 | 1 | KEEP-ROUTING | discuss.md exists. | High | none |
| C349 | 1 | KEEP-ROUTING | implement.md exists. | High | none |
| C350 | 1 | KEEP-ROUTING | lessons.md exists. | High | none |
| C351 | 1 | KEEP-ROUTING | memory.md exists. | High | none |
| C352 | 1 | KEEP-ROUTING | specify.md exists. | High | none |
| C353 | 1 | KEEP-ROUTING | sub-agents.md exists. | High | none |
| C354 | 1 | KEEP-ROUTING | tasks.md exists. | High | none |
| C355 | 1 | KEEP-ROUTING | validate.md exists. | High | none |
| P003 | 3 | UNCLEAR | Source `.agents/skills/workflow-tips/SKILL.md` does not exist in repo; content ("prefer clear variable names") is generic and not derivable from any present artifact. Cannot establish rediscovery. | Medium | none (unverifiable) |
| P004 | 3 | UNCLEAR | Same source `.agents/skills/workflow-tips/SKILL.md` absent; "keep layers thin/delegate" not derivable. | Medium | none (unverifiable) |
| P005 | 2 | KEEP-POLICY | AGENTS.md security policy (no secrets/env config). Not derivable from code; security policy. | High | none |
| P006 | 3 | KEEP-CAVEAT | CI/env caveat (local commands pass but CI may fail on missing env). Environment/process caveat. | High | none |
