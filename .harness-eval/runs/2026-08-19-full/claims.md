# Blind claim deck — run `2026-08-19-full`

> Score every row. Some rows may be synthetic calibration rows.
> Do NOT read trap-key.json, claims.jsonl, Judge1 scores, or prior agreement reports.
> README is out of harness scope — do not cite it as rediscovery evidence.

## Rubric

| Cost | Meaning |
|------|---------|
| 0 | Exact string in a discovered manifest/config |
| 1 | Obvious from one directory listing or one file header |
| 2 | Needs reading implementation across modules |
| 3 | Runtime failure, environment-specific, or process/policy |

Classes: REDUNDANT-CODE | REDUNDANT-GENERAL | KEEP-POLICY | KEEP-CAVEAT | KEEP-ROUTING | KEEP-COMPRESSED | UNCLEAR

**Hard rule:** cost ≥ 2 → never REDUNDANT-*. Default UNCLEAR/KEEP when unsure.

## Claims

| ID | Tier | Source | Quote |
|----|------|--------|-------|
| C001 | T0 | `AGENTS.md` | This file is the **system prompt** for any code agent (OpenCode, Claude Code, Cursor, etc.) working on this repository. Read it fully before making changes. It defines the product, the architecture, the harness contract, and the conventions every agent must follow. |
| C002 | T0 | `AGENTS.md` | **Diagnos Data App** is a Next.js web application that runs a **data maturity diagnostic** for companies. |
| C003 | T0 | `AGENTS.md` | The product flow is: |
| C004 | T0 | `AGENTS.md` | **Chatbot questionnaire** — The user answers **8 to 12 questions** presented as a conversational chat form. Questions assess data management & governance maturity, modeled on the **DAMA-DMBOK** framework and other leading data governance/management frameworks. |
| C005 | T0 | `AGENTS.md` | **Harness processing** — The answers are sent to a well-defined **agent harness** that orchestrates an LLM evaluation. |
| C006 | T0 | `AGENTS.md` | **LLM inference** — The harness calls **Ollama Cloud** via its HTTP API to run the evaluation. |
| C007 | T0 | `AGENTS.md` | **PDF report** — The harness produces a **PDF report** with diagnostic analysis, charts, metrics, and an overall data maturity assessment for the company. |
| C008 | T0 | `AGENTS.md` | **Note:** The PDF library (`@react-pdf/renderer`) is React-based. To preserve harness purity, the concrete PDF implementation lives in `src/lib/report/` and is injected into the pipeline via the `ReportGenerator` interface — `harness/**` never imports React/Next. See `docs/decisions/`. |
| C009 | T0 | `AGENTS.md` | The **harness** is the heart of the system. It is **framework-agnostic** (pure TypeScript, no React/Next imports) so it can be tested and reused independently. The Next.js app only calls the harness through its public API. |
| C010 | T0 | `AGENTS.md` | `DiagnosticInput` — validated questionnaire answers + company context. |
| C011 | T0 | `AGENTS.md` | `DiagnosticResult` — the full evaluation: per-dimension scores, overall maturity level, narrative analysis, and chart data. |
| C012 | T0 | `AGENTS.md` | **Validate** — validate `DiagnosticInput` against Zod schemas. |
| C013 | T0 | `AGENTS.md` | **Evaluate** — call the evaluator (LLM via Ollama) to score dimensions and produce narrative. |
| C014 | T0 | `AGENTS.md` | **Report** — generate the PDF report from the structured result. |
| C015 | T0 | `AGENTS.md` | Maturity is assessed across **DAMA-DMBOK knowledge areas** (dimensions). The model lives in `harness/config/maturity-model.ts`. |
| C016 | T0 | `AGENTS.md` | **Dimensions** (subset of DAMA-DMBOK knowledge areas): Data Governance, Data Architecture, Data Quality, Data Modeling & Design, Data Storage & Operations, Data Security, Data Integration & Interoperability, Data & Analytics, Metadata, Reference & Master Data. |
| C017 | T0 | `AGENTS.md` | **Maturity levels** (0–5, CMMI-style): |
| C018 | T0 | `AGENTS.md` | `1` Initial / Ad hoc |
| C019 | T0 | `AGENTS.md` | **Overall maturity** = weighted aggregate of dimension scores. |
| C020 | T0 | `AGENTS.md` | The questionnaire (`harness/config/questionnaire.ts`) maps each question to a dimension and a weight. Keep the question count between **8 and 12**. |
| C021 | T0 | `AGENTS.md` | Provider client: `harness/providers/ollama/client.ts`. |
| C022 | T0 | `AGENTS.md` | Base URL and model are configured via environment variables (see `.env.example`). |
| C023 | T0 | `AGENTS.md` | Send the system + user prompts (from `harness/prompts/`). |
| C024 | T0 | `AGENTS.md` | Request **structured JSON output** (the evaluator parses it). |
| C025 | T0 | `AGENTS.md` | Handle timeouts, retries, and non-2xx responses with typed errors. |
| C026 | T0 | `AGENTS.md` | **Never hardcode secrets.** Read them from `process.env`. |
| C027 | T0 | `AGENTS.md` | **TypeScript strict mode.** No `any` unless explicitly justified. |
| C028 | T0 | `AGENTS.md` | **No comments unless they explain *why*.** Prefer self-documenting code. |
| C029 | T0 | `AGENTS.md` | Use **named exports** for functions/types; default exports only for React pages/components. |
| C030 | T0 | `AGENTS.md` | Follow existing patterns in the file you are editing. |
| C031 | T0 | `AGENTS.md` | `harness/**` must **not** import from `src/**` or any React/Next module. |
| C032 | T0 | `AGENTS.md` | All I/O (HTTP, filesystem, PDF) happens inside the harness's own modules, behind clear boundaries. |
| C033 | T0 | `AGENTS.md` | The concrete PDF generator (`@react-pdf/renderer`) lives in `src/lib/report/` and is injected into the pipeline via the `ReportGenerator` interface (`PipelineDeps`). `harness/**` only defines the interface and contract. |
| C034 | T0 | `AGENTS.md` | Use **Zod** for all runtime validation (request bodies, LLM output, config). |
| C035 | T0 | `AGENTS.md` | Validate at the boundary: API route → harness input; LLM output → structured result. |
| C036 | T0 | `AGENTS.md` | Use the typed errors in `harness/core/errors.ts` (`ValidationError`, `ProviderError`, `ReportError`). |
| C037 | T0 | `AGENTS.md` | Map errors to proper HTTP status codes in the API route. |
| C038 | T0 | `AGENTS.md` | Unit tests for the harness core (pipeline, evaluator parsing, scoring). |
| C039 | T0 | `AGENTS.md` | Mock the Ollama client in tests — never hit the real API. |
| C040 | T0 | `AGENTS.md` | Run tests with the project's test runner (add one if not present; document it). |
| C041 | T0 | `AGENTS.md` | `npm run dev` — start Next.js dev server. |
| C042 | T0 | `AGENTS.md` | `npm run build` — production build. |
| C043 | T0 | `AGENTS.md` | `npm run lint` — lint (add ESLint config if missing). |
| C044 | T0 | `AGENTS.md` | `npm run test` — run tests (add a runner if missing). |
| C045 | T0 | `AGENTS.md` | OpenCode config lives in `.opencode/opencode.json`. |
| C046 | T0 | `AGENTS.md` | The `/init` command (`.opencode/command/init.md`) scaffolds the harness and bootstraps the project. Run it when starting fresh. |
| C047 | T0 | `AGENTS.md` | After editing any `.opencode/**` file, **restart OpenCode** for changes to take effect. |
| C048 | T0 | `AGENTS.md` | A task is done when: |
| C049 | T0 | `AGENTS.md` | [ ] Code follows the conventions in section 7. |
| C050 | T0 | `AGENTS.md` | [ ] Harness purity is preserved (`harness/**` has no app imports). |
| C051 | T0 | `AGENTS.md` | [ ] Inputs and LLM output are validated with Zod. |
| C052 | T0 | `AGENTS.md` | [ ] Errors are typed and mapped to HTTP status codes. |
| C053 | T0 | `AGENTS.md` | [ ] Tests pass (if tests exist for the touched area). |
| C054 | T0 | `AGENTS.md` | [ ] `npm run lint` and `npm run build` pass. |
| C055 | T0 | `AGENTS.md` | [ ] No secrets are committed; env vars are documented in `.env.example`. |
| C056 | T1 | `.opencode/skills/create-adr/SKILL.md` | Creates Architecture Decision Records (ADRs) to document significant architectural choices and their rationale for future team members. Use when the user says "write an ADR", "document this decision", "record why we chose X", "add an architecture decision record", "create an ADR for", or wants to capture the reasoning behind a technical choice so the team understands it later. Do NOT use when the decision hasn't been made yet (use create-rfc instead), for implementation planning (use technical-d |
| C057 | T1 | `.opencode/skills/create-adr/SKILL.md` | You are an expert in creating Architecture Decision Records (ADRs) — concise, durable documents that capture the context, decision, and consequences of significant architectural choices so future team members understand *why* things are the way they are. |
| C058 | T1 | `.opencode/skills/create-adr/SKILL.md` | Use this skill when: |
| C059 | T1 | `.opencode/skills/create-adr/SKILL.md` | User asks to "write an ADR", "create an ADR", "add an architecture decision record" |
| C060 | T1 | `.opencode/skills/create-adr/SKILL.md` | User wants to "document why we chose X", "record this decision", "capture this architectural choice" |
| C061 | T1 | `.opencode/skills/create-adr/SKILL.md` | A significant technical decision has been made (or is being finalized) and needs to be recorded |
| C062 | T1 | `.opencode/skills/create-adr/SKILL.md` | The team wants to preserve the reasoning behind a choice for future engineers |
| C063 | T1 | `.opencode/skills/create-adr/SKILL.md` | User asks "why did we choose X" and the answer should be written down permanently |
| C064 | T1 | `.opencode/skills/create-adr/SKILL.md` | Decisions not yet made — use `create-rfc` to drive the decision process first |
| C065 | T1 | `.opencode/skills/create-adr/SKILL.md` | Implementation planning after the decision — use `technical-design-doc-creator` |
| C066 | T1 | `.opencode/skills/create-adr/SKILL.md` | Simple configuration choices or trivial code decisions |
| C067 | T1 | `.opencode/skills/create-adr/SKILL.md` | Meeting notes or general documentation |
| C068 | T1 | `.opencode/skills/create-adr/SKILL.md` | If the user says "I need to decide whether to do X" → use `create-rfc`. |
| C069 | T1 | `.opencode/skills/create-adr/SKILL.md` | If the user says "We decided to do X, let me document it" → use this skill. |
| C070 | T1 | `.opencode/skills/create-adr/SKILL.md` | **CRITICAL**: Always generate the ADR in the **same language as the user's request**. Detect the language automatically. |
| C071 | T1 | `.opencode/skills/create-adr/SKILL.md` | Keep technical terms in English when appropriate (e.g., "ADR", "API", "microservices") |
| C072 | T1 | `.opencode/skills/create-adr/SKILL.md` | All section headers and content should be in the user's language |
| C073 | T1 | `.opencode/skills/create-adr/SKILL.md` | Company/product names remain in original form |
| C074 | T1 | `.opencode/skills/create-adr/SKILL.md` | Three formats are widely used. Detect the right one from context, or ask: |
| C075 | T1 | `.opencode/skills/create-adr/SKILL.md` | Default to **MADR** unless the user specifies otherwise or the decision is very simple. |
| C076 | T1 | `.opencode/skills/create-adr/SKILL.md` | If the user provides minimal context, use **AskQuestion** to collect essential information: |
| C077 | T1 | `.opencode/skills/create-adr/SKILL.md` | **MANDATORY fields — ask if missing**: |
| C078 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Decision title** (noun phrase, not a question — e.g., "Use Redis for session storage") |
| C079 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Date** of the decision (or today's date) |
| C080 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Status** (Accepted / Proposed / Deprecated / Superseded) |
| C081 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Context** — the forces, constraints, and situation that made this decision necessary |
| C082 | T1 | `.opencode/skills/create-adr/SKILL.md` | **The decision itself** — what was chosen and why |
| C083 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Consequences** — what becomes easier, harder, or different as a result |
| C084 | T1 | `.opencode/skills/create-adr/SKILL.md` | **RECOMMENDED fields**: |
| C085 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Decision drivers** — the key criteria or constraints |
| C086 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Options considered** — what alternatives were evaluated |
| C087 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Pros/cons per option** — honest trade-off assessment |
| C088 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Decision outcome rationale** — why this option over the others |
| C089 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Links** — related ADRs, RFCs, tickets, or documentation |
| C090 | T1 | `.opencode/skills/create-adr/SKILL.md` | If any mandatory fields are missing, ask IN THE USER'S LANGUAGE before generating the document. |
| C091 | T1 | `.opencode/skills/create-adr/SKILL.md` | Scan the existing ADR directory for the next sequential number: |
| C092 | T1 | `.opencode/skills/create-adr/SKILL.md` | Check if an ADR directory exists (`docs/adr/`, `docs/decisions/`, `.adr/`, or `adr/`) |
| C093 | T1 | `.opencode/skills/create-adr/SKILL.md` | Find the highest existing number |
| C094 | T1 | `.opencode/skills/create-adr/SKILL.md` | Assign the next number (e.g., if ADR-007 exists, this becomes ADR-008) |
| C095 | T1 | `.opencode/skills/create-adr/SKILL.md` | If no directory exists, start at ADR-001 and suggest creating the directory |
| C096 | T1 | `.opencode/skills/create-adr/SKILL.md` | Generate the ADR following the format selected in Step 1. |
| C097 | T1 | `.opencode/skills/create-adr/SKILL.md` | After generating, ask where to save it: |
| C098 | T1 | `.opencode/skills/create-adr/SKILL.md` | Before finalizing, verify: |
| C099 | T1 | `.opencode/skills/create-adr/SKILL.md` | [ ] **Title** is a noun phrase describing the decision (not a question, not a vague label) |
| C100 | T1 | `.opencode/skills/create-adr/SKILL.md` | [ ] **Date** is included (decisions without dates lose context quickly) |
| C101 | T1 | `.opencode/skills/create-adr/SKILL.md` | [ ] **Status** is set correctly — Accepted, Proposed, Deprecated, or Superseded |
| C102 | T1 | `.opencode/skills/create-adr/SKILL.md` | [ ] **Context** explains the *forces* that made this decision necessary, not just what was done |
| C103 | T1 | `.opencode/skills/create-adr/SKILL.md` | [ ] **Decision** is stated directly and tied to the context |
| C104 | T1 | `.opencode/skills/create-adr/SKILL.md` | [ ] **Consequences** include honest trade-offs — not just positives |
| C105 | T1 | `.opencode/skills/create-adr/SKILL.md` | [ ] **Options** (MADR format) include at least 2 alternatives actually considered |
| C106 | T1 | `.opencode/skills/create-adr/SKILL.md` | [ ] **Supersedes / superseded by** links are included when applicable |
| C107 | T1 | `.opencode/skills/create-adr/SKILL.md` | [ ] **File** follows naming convention: `NNN-kebab-case-title.md` |
| C108 | T1 | `.opencode/skills/create-adr/SKILL.md` | [ ] **Number** is sequential in the ADR directory |
| C109 | T1 | `.opencode/skills/create-adr/SKILL.md` | Zero-padded numbers: `001`, `002`, ... `099`, `100` |
| C110 | T1 | `.opencode/skills/create-adr/SKILL.md` | Common directories: `docs/adr/`, `docs/decisions/`, `adr/`, `.adr/` |
| C111 | T1 | `.opencode/skills/create-adr/SKILL.md` | **BAD**: `# ADR-001: Should we use PostgreSQL?` |
| C112 | T1 | `.opencode/skills/create-adr/SKILL.md` | **GOOD**: `# ADR-001: Use PostgreSQL for Primary Storage` |
| C113 | T1 | `.opencode/skills/create-adr/SKILL.md` | Titles should record the decision, not the question. Future readers need to know *what was decided*, not what was considered. |
| C114 | T1 | `.opencode/skills/create-adr/SKILL.md` | Context should explain the *forces* — why wasn't the alternative obviously better? |
| C115 | T1 | `.opencode/skills/create-adr/SKILL.md` | Honest trade-offs are what make ADRs valuable years later. |
| C116 | T1 | `.opencode/skills/create-adr/SKILL.md` | **BAD**: Editing an old ADR to change the decision after the fact. |
| C117 | T1 | `.opencode/skills/create-adr/SKILL.md` | **GOOD**: Creating a new ADR with `Status: Superseded by ADR-{NNN}` on the old one and linking back. |
| C118 | T1 | `.opencode/skills/create-adr/SKILL.md` | ADRs are historical records. The old decision was correct *given what was known at the time*. Superseding preserves that context. |
| C119 | T1 | `.opencode/skills/create-adr/SKILL.md` | The rationale is *why this option and not the others* — not just what was chosen. |
| C120 | T1 | `.opencode/skills/create-adr/SKILL.md` | **ADRs are immutable** — never edit the decision. Supersede with a new ADR. |
| C121 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Short is better** — 200–500 words is ideal. If it needs to be longer, move detail to a linked TDD or RFC. |
| C122 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Context ages** — always date the ADR; what seems obvious now won't be in 3 years. |
| C123 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Honest consequences** — a one-sided ADR loses credibility. Future engineers will hit the downsides regardless. |
| C124 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Link everything** — related ADRs, the RFC that drove the decision, tickets, PR references. |
| C125 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Language adaptation** — always write in the user's language. |
| C126 | T1 | `.opencode/skills/create-adr/SKILL.md` | **Number sequentially** — check the directory before assigning a number. |
| C127 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications. Generates creative, polished code that avoids generic AI aesthetics. Do NOT use for design review or audit (use web-design-guidelines or web-quality-audit). |
| C128 | T1 | `.opencode/skills/frontend-design/SKILL.md` | This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices. |
| C129 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Commit to a BOLD aesthetic direction: |
| C130 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **Purpose**: What problem does this interface solve? Who uses it? |
| C131 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction. |
| C132 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **Constraints**: Technical requirements (framework, performance, accessibility). |
| C133 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember? |
| C134 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work—the key is intentionality, not intensity. |
| C135 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Then implement working code that is: |
| C136 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Production-grade and functional |
| C137 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Visually striking and memorable |
| C138 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Cohesive with a clear aesthetic point-of-view |
| C139 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Meticulously refined in every detail |
| C140 | T1 | `.opencode/skills/frontend-design/SKILL.md` | → *Consult [typography reference](references/typography.md) for scales, pairing, and loading strategies.* |
| C141 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Choose fonts that are beautiful, unique, and interesting. Pair a distinctive display font with a refined body font. |
| C142 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Use a modular type scale with fluid sizing (clamp) |
| C143 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Vary font weights and sizes to create clear visual hierarchy |
| C144 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use overused fonts—Inter, Roboto, Arial, Open Sans, system defaults |
| C145 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use monospace typography as lazy shorthand for "technical/developer" vibes |
| C146 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Put large icons with rounded corners above every heading—they rarely add value and make sites look templated |
| C147 | T1 | `.opencode/skills/frontend-design/SKILL.md` | → *Consult [color reference](references/color-and-contrast.md) for OKLCH, palettes, and dark mode.* |
| C148 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Commit to a cohesive palette. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. |
| C149 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Use modern CSS color functions (oklch, color-mix, light-dark) for perceptually uniform, maintainable palettes |
| C150 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Tint your neutrals toward your brand hue—even a subtle hint creates subconscious cohesion |
| C151 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use gray text on colored backgrounds—it looks washed out; use a shade of the background color instead |
| C152 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use pure black (#000) or pure white (#fff)—always tint; pure black/white never appears in nature |
| C153 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use the AI color palette: cyan-on-dark, purple-to-blue gradients, neon accents on dark backgrounds |
| C154 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use gradient text for "impact"—especially on metrics or headings; it's decorative rather than meaningful |
| C155 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Default to dark mode with glowing accents—it looks "cool" without requiring actual design decisions |
| C156 | T1 | `.opencode/skills/frontend-design/SKILL.md` | → *Consult [spatial reference](references/spatial-design.md) for grids, rhythm, and container queries.* |
| C157 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Create visual rhythm through varied spacing—not the same padding everywhere. Embrace asymmetry and unexpected compositions. Break the grid intentionally for emphasis. |
| C158 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Create visual rhythm through varied spacing—tight groupings, generous separations |
| C159 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Use fluid spacing with clamp() that breathes on larger screens |
| C160 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Use asymmetry and unexpected compositions; break the grid intentionally for emphasis |
| C161 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Wrap everything in cards—not everything needs a container |
| C162 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Nest cards inside cards—visual noise, flatten the hierarchy |
| C163 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use identical card grids—same-sized cards with icon + heading + text, repeated endlessly |
| C164 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use the hero metric layout template—big number, small label, supporting stats, gradient accent |
| C165 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Center everything—left-aligned text with asymmetric layouts feels more designed |
| C166 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use the same spacing everywhere—without rhythm, layouts feel monotonous |
| C167 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Use intentional, purposeful decorative elements that reinforce brand |
| C168 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use glassmorphism everywhere—blur effects, glass cards, glow borders used decoratively rather than purposefully |
| C169 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use rounded elements with thick colored border on one side—a lazy accent that almost never looks intentional |
| C170 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use sparklines as decoration—tiny charts that look sophisticated but convey nothing meaningful |
| C171 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use rounded rectangles with generic drop shadows—safe, forgettable, could be any AI output |
| C172 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use modals unless there's truly no better alternative—modals are lazy |
| C173 | T1 | `.opencode/skills/frontend-design/SKILL.md` | → *Consult [motion reference](references/motion-design.md) for timing, easing, and reduced motion.* |
| C174 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions. |
| C175 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Use motion to convey state changes—entrances, exits, feedback |
| C176 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Use exponential easing (ease-out-quart/quint/expo) for natural deceleration |
| C177 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: For height animations, use grid-template-rows transitions instead of animating height directly |
| C178 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Animate layout properties (width, height, padding, margin)—use transform and opacity only |
| C179 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Use bounce or elastic easing—they feel dated and tacky; real objects decelerate smoothly |
| C180 | T1 | `.opencode/skills/frontend-design/SKILL.md` | → *Consult [interaction reference](references/interaction-design.md) for forms, focus, and loading patterns.* |
| C181 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Make interactions feel fast. Use optimistic UI—update immediately, sync later. |
| C182 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Use progressive disclosure—start simple, reveal sophistication through interaction (basic options first, advanced behind expandable sections; hover states that reveal secondary actions) |
| C183 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Design empty states that teach the interface, not just say "nothing here" |
| C184 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Make every interactive surface feel intentional and responsive |
| C185 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Repeat the same information—redundant headers, intros that restate the heading |
| C186 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Make every button primary—use ghost buttons, text links, secondary styles; hierarchy matters |
| C187 | T1 | `.opencode/skills/frontend-design/SKILL.md` | → *Consult [responsive reference](references/responsive-design.md) for mobile-first, fluid design, and container queries.* |
| C188 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Use container queries (@container) for component-level responsiveness |
| C189 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Adapt the interface for different contexts—don't just shrink it |
| C190 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Hide critical functionality on mobile—adapt the interface, don't amputate it |
| C191 | T1 | `.opencode/skills/frontend-design/SKILL.md` | → *Consult [ux-writing reference](references/ux-writing.md) for labels, errors, and empty states.* |
| C192 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DO**: Make every word earn its place |
| C193 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **DON'T**: Repeat information users can already see |
| C194 | T1 | `.opencode/skills/frontend-design/SKILL.md` | **Critical quality check**: If you showed this interface to someone and said "AI made this," would they believe you immediately? If yes, that's the problem. |
| C195 | T1 | `.opencode/skills/frontend-design/SKILL.md` | A distinctive interface should make someone ask "how was this made?" not "which AI made this?" |
| C196 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Review the DON'T guidelines above—they are the fingerprints of AI-generated work from 2024-2025. |
| C197 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. |
| C198 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices across generations. |
| C199 | T1 | `.opencode/skills/frontend-design/SKILL.md` | Remember: the AI is capable of extraordinary creative work. Don't hold back—show what can truly be created when thinking outside the box and committing fully to a distinctive vision. |
| C200 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Evaluate a repo agent harness (AGENTS.md, rules, skills, skill refs) for broken paths/commands, redundant instructions, and usefulness using a stack-agnostic dual-judge protocol with planted traps. HIGH PRIORITY questionnaires at top: Q1 optional docs, Q2 B/C budget before Track A (certainty/tokens). A always runs after Q2; B/C opt-in. ADRs/RFCs excluded from T2. Mixed apply uses 11-mixed-apply.md (KEEP/CUT). Use when the user says harness eval, harness-eval, harness debug, audit AGENTS.md, audi |
| C201 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Run a full, stack-agnostic harness evaluation and stop at reports. Do not auto-edit AGENTS.md or skills unless the user explicitly asks after reviewing Ship/Slim. |
| C202 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Stop and ask before continuing.** Do not skip these gates. Do not silently include optional docs or spawn B/C judges. |
| C203 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Order after inventory: **Q1 (if needed) → Q2 → then Track A** (A always runs) → B/C only if approved. |
| C204 | T1 | `.opencode/skills/harness-eval/SKILL.md` | When `optional-docs-candidates.md` lists optional types, ask before Q2 / Track A: |
| C205 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Re-run inventory with `--include-doc-type` / `--include-doc` only after the user answers. If no optional types, skip Q1. |
| C206 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Ask **before** Track A so the user sets spend up front. Track **A always runs** next (deterministic, ~0 model tokens). B/C run only if approved. |
| C207 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Fill claim count from `claims.md` when known; surface count ≈ T0+T1+T2 markdown after extract (or say “after surfaces_extract” if not run yet). |
| C208 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **`A only`:** run Track A; present `04`; stop (no B/C judges). |
| C209 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **`B`:** Track A, then Steps 4–6. |
| C210 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **`C`:** Track A, then Steps 7–10 (C does not need B). |
| C211 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **`B+C`:** Track A, then Steps 4–11. |
| C212 | T1 | `.opencode/skills/harness-eval/SKILL.md` | If the user already requested B/C/`full eval` in the triggering message, treat as approval — still show the Q2 table once so costs are visible. |
| C213 | T1 | `.opencode/skills/harness-eval/SKILL.md` | This skill is **self-contained**. Protocol, scripts, and judge prompts live under this skill directory (the folder that contains this `SKILL.md`). Resolve `SKILL_DIR` as that directory — never assume another install path. |
| C214 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Read [references/PROTOCOL.md](references/PROTOCOL.md) **completely** before the first run in a session (and again if scripts fail). |
| C215 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Read [references/judge-prompts.md](references/judge-prompts.md) when spawning Track B or Track C judges. |
| C216 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Plain-language terms: [references/GLOSSARY.md](references/GLOSSARY.md) (also embedded at the top of `04` / `07` / `10` reports). |
| C217 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Claim record shape: [references/claims.schema.json](references/claims.schema.json) (for tooling; agents do not need to load it every run). |
| C218 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Run scripts as `python3 "$SKILL_DIR/scripts/<name>.py" ...`. |
| C219 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Run **outputs** (not protocol) go to the target repo at `.harness-eval/runs/<run-id>/`. |
| C220 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Report-only by default.** Judgment ≠ remediation. |
| C221 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **README out of scope** as harness surface and as rediscovery/usefulness evidence. |
| C222 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Stack-agnostic.** Never hard-code package managers, DBs, frameworks, or folder layouts in prompts or plants. Discover manifests that exist (JS, Python, Make/Task, Rust, Go, PHP, Ruby/Rails, Java/Gradle/Maven, plus `bin/*`). |
| C223 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Doc scope.** T2 always includes agent skill-tree refs (`.agents/skills`, `.cursor/skills`, `.claude/skills`). **ADRs / RFCs (decision-record trees) are always excluded** from T2 surfaces. Other cited project docs are **optional** — default omit; ask via **Q1** at the top of this skill, then re-run with `--include-doc-type` / `--include-doc`. |
| C224 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Track A always runs** after inventory (deterministic, high-precision). Prefer false negatives over false BROKEN. Placeholders (`SPEC_FOLDER`, `{x}`, `[feature]`) are never BROKEN. Never normalize paths with `str.lstrip('./')`. |
| C225 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Tracks B and C require user approval via Q2 before Track A.** Do not spawn B/C judges until the user opts in. User may approve B only, C only, both, or A only. |
| C226 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Track B needs dual judges + plants.** Judge2 is blind (must not read Judge1 scores or `trap-key.json`). Ship only if trap gate PASS and dual REDUNDANT with Judge2 cost ≤ 1. |
| C227 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Track C needs dual judges + plants.** Blind Judge2 must not read `08-usefulness-j1.md` or `usefulness-trap-key.json`. Slim only if trap PASS, dual SLIM/ROUTING-ONLY, **and fan-in PASS** (no other harness surface hard-loads the path as SoT — merge enforces this on the full skill tree, not just `--seed`). **Usefulness is model-sensitive** — record `model: <id>` in both score files; prefer same model within a run; re-judge on a second model before large Slim deletes. |
| C228 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **KEEP / KEEP-CORE plants must not be verbatim copies** of claims/surfaces already in the deck. |
| C229 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Subagents:** use an allowlisted non-fast model (prefer the same family as the parent when policy allows). Do not use `*-fast` models. |
| C230 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Do not equate tracks.** Track B Ship ≠ Track C Slim. Rediscoverable ≠ useless; useful ≠ non-redundant. |
| C231 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Slim apply / fan-in.** Never stub or delete a Slim path listed under “Slim fan-in blocked” (or when `python3 "$SKILL_DIR/scripts/slim_fanin.py" --path <P>` reports citers) unless those consumers are updated in the same change. |
| C232 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Mixed/Slim apply stays self-contained.** Cutting REPO-DEMONSTRATED / THEORY means delete or compress that bulk in the harness surface. Never replace a fenced teaching snippet (or the contract it carried) with `See app/...` / `lib/...` / `test/...` — that swaps SoT for a code-tree pointer. Judge evidence paths stay in score tables only; if the behavior-changing contract must survive, keep a short in-skill rule or snippet. |
| C233 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Mixed apply is mechanical.** Dual MIXED alone is not enough. Merge emits `11-mixed-apply.md` with per-ID **KEEP** (from Keep-core columns) and **CUT** (from Slim columns). Apply agents must follow that file only — do not re-judge, redesign, or invent a different pattern than KEEP. Empty Keep-core/Slim cells → skip that path (Hold). |
| C234 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Set `SKILL_DIR` to the directory containing this `SKILL.md`. Verify: |
| C235 | T1 | `.opencode/skills/harness-eval/SKILL.md` | `$SKILL_DIR/references/PROTOCOL.md` |
| C236 | T1 | `.opencode/skills/harness-eval/SKILL.md` | `$SKILL_DIR/scripts/inventory_extract.py` |
| C237 | T1 | `.opencode/skills/harness-eval/SKILL.md` | `$SKILL_DIR/scripts/track_a_correctness.py` |
| C238 | T1 | `.opencode/skills/harness-eval/SKILL.md` | `$SKILL_DIR/scripts/merge_agreement.py` |
| C239 | T1 | `.opencode/skills/harness-eval/SKILL.md` | `$SKILL_DIR/scripts/surfaces_extract.py` |
| C240 | T1 | `.opencode/skills/harness-eval/SKILL.md` | `$SKILL_DIR/scripts/merge_usefulness.py` |
| C241 | T1 | `.opencode/skills/harness-eval/SKILL.md` | `$SKILL_DIR/scripts/slim_fanin.py` |
| C242 | T1 | `.opencode/skills/harness-eval/SKILL.md` | `$SKILL_DIR/scripts/doc_scope.py` |
| C243 | T1 | `.opencode/skills/harness-eval/SKILL.md` | If missing, the skill install is broken — stop. |
| C244 | T1 | `.opencode/skills/harness-eval/SKILL.md` | From the **target repo root**: |
| C245 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Expected under `.harness-eval/runs/$RUN_ID/`: `inventory.json`, `claims.jsonl`, `claims.md`, `trap-key.json`, `optional-docs-candidates.md` (+ `.json`). |
| C246 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Read `optional-docs-candidates.md`. If optional types exist, run **Q1** from [User questionnaires](#user-questionnaires-high-priority). Re-run inventory only after approval: |
| C247 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Run **Q2** from [User questionnaires](#user-questionnaires-high-priority) **before** Track A. Record the answer (`A only` / `B` / `C` / `B+C`). Do not start Steps 4+ unless B and/or C were approved. |
| C248 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Expected: `04-correctness.md` (includes term definitions at top). Spot-check that `.agents/...` cites resolve (not `agents/...`). |
| C249 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Summarize Track A (broken count + notable clusters). If Q2 was `A only`, stop. Otherwise continue to the approved B and/or C steps. |
| C250 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Read `references/judge-prompts.md` (Track B Judge1). Spawn an independent subagent with an allowlisted model. Point it at `.harness-eval/runs/$RUN_ID/claims.md`. It writes `05-redundancy-j1.md` (include `model: <id>`). |
| C251 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Judge1 may read `inventory.json`. Must not read `trap-key.json`. |
| C252 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Read `references/judge-prompts.md` (Track B Judge2). Spawn a second subagent. Writes `06-blind-scores.md`. |
| C253 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Forbidden for Judge2: `trap-key.json`, `05-redundancy-j1.md`, `07-agreement.md`, prior agreement reports. |
| C254 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Prefer Steps 4 and 5 in parallel. |
| C255 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Expected: `07-agreement.md` (Ship/Review/Hold + **What these words mean**). On trap FAIL: fix plants per PROTOCOL, rescore P00x, re-merge — do not Ship. |
| C256 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Expected: `surfaces.md`, `surfaces.json`, `usefulness-trap-key.json`. |
| C257 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Read `references/judge-prompts.md` (Usefulness Judge1). Spawn subagent with allowlisted model (record same id in header). Writes `08-usefulness-j1.md`. |
| C258 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Must not read `usefulness-trap-key.json`. |
| C259 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Read Usefulness Judge2 prompt. Prefer **same model** as Step 8 for agreement stability. Writes `09-usefulness-j2.md`. |
| C260 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Forbidden: `usefulness-trap-key.json`, `08-usefulness-j1.md`, `10-usefulness-agreement.md`, and using Track B 05/06/07 to decide usefulness classes. |
| C261 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Prefer Steps 8 and 9 in parallel. |
| C262 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Expected: `10-usefulness-agreement.md` (Slim/Keep-core/Mixed/Hold + **What these words mean**), `11-mixed-apply.md` (KEEP/CUT per Mixed ID), plus `slim-fanin.json`. On trap FAIL: do not Slim. Surfaces with `slim-fanin-blocked` are Hold — not Slim apply candidates. |
| C263 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Summarize from the agreement reports (each starts with term definitions): |
| C264 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Track A broken count → `04-correctness.md` |
| C265 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Track B trap + Ship/Review/Hold → `07-agreement.md` |
| C266 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Track C trap + fan-in + Slim/Keep-core/Mixed/Hold → `10-usefulness-agreement.md` |
| C267 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Call out `11-mixed-apply.md` when Mixed count > 0 (the only Mixed apply path) |
| C268 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Call out model ids used for Track C and that Slim is model-sensitive |
| C269 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Call out any **Slim fan-in blocked** rows (consumers outside seed may appear here) |
| C270 | T1 | `.opencode/skills/harness-eval/SKILL.md` | Stop unless the user asks to apply Ship/Slim/Mixed. When applying: |
| C271 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Slim:** only paths in the Slim table (fan-in PASS); never stub fan-in-blocked paths without updating citers first. |
| C272 | T1 | `.opencode/skills/harness-eval/SKILL.md` | **Mixed:** open `11-mixed-apply.md` and execute KEEP/CUT per ID only (rule 12). Never re-judge from the Mixed path list alone. Never add code-tree path pointers as substitutes for cut demos (rule 11). |
| C273 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Feature planning and implementation with 4 adaptive phases (Specify, Design, Tasks, Execute). Auto-sizes depth by complexity. Writes testable requirements in EARS notation, atomic tasks, atomic Conventional Commits, and requirement traceability. Ships deterministic Python validation scripts so structural gates are enforced by code, not memory. Features an independent Verifier (author != verifier, evidence-or-zero), a discrimination sensor, a decision log (STATE.md), a test-coverage matrix, and a |
| C274 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Plan and implement features with precision. Granular tasks. Clear dependencies. Right tools. Zero ceremony. |
| C275 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Loading this skill's files.** Reference files live under `references/` in this skill's own directory (where this `SKILL.md` resides). Resolve them relative to the skill directory - never the workspace root - and load them through the active skill by name; never assume a fixed install path. When a step tells you to read a reference, **read it completely (to EOF)** before acting - never act on a partial/truncated read. |
| C276 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Running this skill's scripts.** Every `scripts/*.py` shipped with this skill lives under that same skill directory. Resolve the skill directory first, then invoke `python3 <skill-dir>/scripts/<name>.py ...`. Never run `python3 scripts/...` from the consuming project root - that looks for a project-local `scripts/` tree that is not this skill. Project data under `.specs/` is still read/written relative to the project root (pass `--root` when the cwd is elsewhere). Below, `<skill-dir>` means the directory that contains this `SKILL.md`. |
| C277 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Execution contract - every task, non-negotiable (holds even if you do not open the reference files):** |
| C278 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Tests derive from the spec's acceptance criteria and assert spec-defined outcomes - they never mirror the implementation. |
| C279 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | The gate must pass (tests pass) before a task is done - the test runner decides, not self-assessment. |
| C280 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | One atomic commit per task. Mark the task complete in `tasks.md` (and update spec traceability when used) **before** that commit, and include those updates in the same commit. Never batch tasks; never weaken, skip, or delete tests to make them pass. |
| C281 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | After the LAST task, a fresh **Verifier always runs automatically** (author ≠ verifier) - spec-anchored outcome check + discrimination sensor. It is never optional and never prompted. See Sub-Agent Delegation. |
| C282 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Blast radius:** approving a spec or tasks authorizes local implementation and local commits only. `git push`, force-push, deploy, production DB changes, and other remote / externally visible / destructive operations require an explicit go-ahead for that action. |
| C283 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Deterministic gates run before human review - not from memory.** The structural gates for the spec and tasks are enforced by scripts in this skill's `scripts/` directory, so they cannot silently drift when the model forgets a step: |
| C284 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Before confirming a spec: `python3 <skill-dir>/scripts/validate_spec.py <spec-path-or-feature>` (closure gate: EARS-shaped ACs, filled assumptions, well-formed requirement IDs, required sections). |
| C285 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Before presenting tasks for approval: `python3 <skill-dir>/scripts/validate_tasks.py <tasks-path-or-feature>` (granularity smell, diagram-vs-`Depends on` parity within a phase, no forward-phase dependency, every task carries `Tests` + `Gate`). |
| C286 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | On each commit: `python3 <skill-dir>/scripts/check_commit.py --message "<msg>"` (Conventional Commits). Optionally wire it as a git `commit-msg` guard (git only, no agent dependency) - see [implement.md](references/implement.md). |
| C287 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Before declaring a feature done: `python3 <skill-dir>/scripts/validate_state.py <feature>` (completion gate: the Verifier's `validation.md` exists, its verdict is filled to PASS, and it cites `file:line` evidence - a missing, FAIL, placeholder, or evidence-free report fails). The closing step of Execute runs this automatically, the same way the lessons layer runs at distillation; it is not a manual step. |
| C288 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | A non-zero exit means STOP and fix before proceeding. Skip a script only when no code-execution tool is available; then perform the same checks by reading the artifact. |
| C289 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Before Execute:** read [implement.md](references/implement.md) completely and run `<skill-dir>/scripts/validate_tasks.py`; if a formal `tasks.md` packs into more than one task-budgeted batch (> ~8 tasks), present the sub-agent offer first (see Sub-Agent Delegation). |
| C290 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **The complexity determines the depth, not a fixed pipeline.** Before starting any feature, assess its scope and apply only what's needed: |
| C291 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Specify and Execute are always required** - you always need to know WHAT and DO it |
| C292 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Design is skipped** when the change is straightforward (no architectural decisions, no new patterns) |
| C293 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Tasks is skipped** when there are ≤3 obvious steps (they become implicit in Execute) |
| C294 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Discuss is triggered within Specify** when the agent detects ambiguous gray areas that need user input, or when the feature has any implicit-requirement dimension present (persistence/state, external calls, auth, payments, concurrency, state transitions) |
| C295 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Interactive UAT is triggered within Execute** only for user-facing features with complex behavior |
| C296 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Safety valve:** Even when Tasks is skipped, Execute ALWAYS starts by listing atomic steps inline (see [implement.md](references/implement.md)). If that listing reveals >5 steps or complex dependencies, STOP and create a formal `tasks.md` - the Tasks phase was wrongly skipped. |
| C297 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Create artifacts lazily.** Write each file only when its phase actually produces content - never scaffold empty `context.md`, `design.md`, or `tasks.md` up front. An empty file signals a phase happened when it did not; absence is the correct state for a skipped phase. The deterministic validators (`scripts/validate_spec.py`, `scripts/validate_tasks.py`, `scripts/check_commit.py`, `scripts/validate_state.py`) ship inside this skill's own `scripts/` directory, alongside `lessons.py`. |
| C298 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Specify → (Design) → (Tasks) → Execute (depth auto-sized) |
| C299 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Read `.specs/STATE.md` (Handoff + Decisions). |
| C300 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Reconcile Handoff against git (`branch`, `status --porcelain`, recent commits) and `tasks.md` - evidence wins over a stale snapshot. Full procedure: [memory.md](references/memory.md). |
| C301 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Propose the reconciled next step before writing code. |
| C302 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **On-demand load (only what the current task needs):** |
| C303 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | `.specs/STATE.md` - Decisions section (read at Design, re-read on resume); Handoff section (read on resume only) |
| C304 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | confirmed lessons - load at Specify and Design via `python3 <skill-dir>/scripts/lessons.py list --status confirmed` ([lessons.md](references/lessons.md)); confirmed only, never candidates |
| C305 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | spec.md (when working on a specific feature) |
| C306 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | context.md (when designing or implementing from user decisions) |
| C307 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | design.md (when implementing from design) |
| C308 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | tasks.md (when executing tasks) |
| C309 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Never load simultaneously:** |
| C310 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Multiple feature specs |
| C311 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Multiple architecture docs |
| C312 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Target:** <40k tokens total context |
| C313 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Reserve:** 160k+ tokens for work, reasoning, outputs |
| C314 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Monitoring:** Display status when >40k (see [context-limits.md](references/context-limits.md)) |
| C315 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Trigger:** count total tasks. If the feature packs into more than one task-budgeted batch (> ~8 tasks) → offer sub-agents; if it fits a single batch (≤ ~8 tasks) → execute inline. |
| C316 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Offer-then-confirm** - never auto-spawn. The user must accept before any sub-agent is dispatched. |
| C317 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **One worker per task-budgeted batch (~7 tasks, whole phases):** Phases stay the semantic/dependency unit; a **batch** is the execution unit - one or more *consecutive whole phases* packed to ~7 tasks. Walk phases in order, accumulate whole phases into the current batch until it reaches the budget, then start the next - **never split a phase** across workers. ~20 tasks → ~3 workers; scales linearly (40 → ~6). Each worker executes all its tasks in order (implement → gate → atomic commit), then reports a compact summary (tasks done, commit hashes, test counts, deviations). Batches run sequentially - a batch never starts until the previous one reports all tasks complete. Workers never spawn further sub-agents. |
| C318 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Verifier (always-on, never prompted):** After the final task is committed, the orchestrator dispatches a fresh Verifier sub-agent automatically - regardless of phase count. Validation never requires a user prompt; it is the closing step of Execute. **Author ≠ verifier**: the Verifier re-derives coverage independently using evidence-or-zero; it does not inherit the author's mental model. The Verifier: (1) performs a **spec-anchored outcome check** - confirms each test's asserted value matches the spec-defined expected outcome, flags spec-precision gaps; (2) runs a **discrimination sensor** - injects behavior-level faults in an isolated scratch (temp worktree or file copies - never `git stash`), confirms tests kill them, discards the scratch and verifies real-tree porcelain matches the pre |
| C319 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Model tier per role (only if the harness supports choosing a model per sub-agent).** Match the reasoning cost to the work instead of paying top-tier reasoning for boilerplate. A batch worker on a mechanical, low-ambiguity phase (entities, config, wiring, straightforward CRUD) runs on a faster/cheaper tier; a worker on a core-domain or high-ambiguity phase, and the Design phase itself, runs on a high-reasoning tier; the Verifier runs on a mid-to-high tier because it does adversarial reasoning and designs mutations. This is a portable recommendation: if the harness cannot set a per-sub-agent model, ignore it. Full rubric in [sub-agents.md](references/sub-agents.md). |
| C320 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Standalone fallback:** Without sub-agents, run `validate.md` as an independent fresh-eyes pass after the final commit - including the spec-anchored check and discrimination sensor. |
| C321 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Full mechanics (worker payload, compact summary format, failure handling, context sizing, model tier, Verifier report format): [sub-agents.md](references/sub-agents.md). |
| C322 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Feature-level (auto-sized):** |
| C323 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | When researching, designing, or making any technical decision, follow this chain in strict order. Never skip steps. |
| C324 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Never skip to Step 5 if Steps 1-4 are available |
| C325 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Step 5 is ALWAYS flagged as uncertain - never presented as fact |
| C326 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **NEVER assume or fabricate.** If you cannot find an answer, say "I don't know" or "I couldn't find documentation for this". Inventing APIs, patterns, or behaviors causes cascading failures across design → tasks → implementation. Uncertainty is always preferable to fabrication. |
| C327 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Do the work; do not narrate the machinery.** Produce the right artifact for the phase instead of announcing the phase ("I will now run the Specify phase"). The user judges the output, not a play-by-play of the process. This keeps the flow from reading as robotic. |
| C328 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Match effort to the work.** Lightweight steps (feature-level checks, validation, mechanical tasks) do not need top-tier reasoning; heavy steps (complex design, ambiguous features) do. If the harness lets you pick a model per sub-agent, apply the tier rubric in [sub-agents.md](references/sub-agents.md); otherwise proceed and simply invest more care on the heavy steps. Mention this once per session at most, and only if it helps; skip it for an experienced user. |
| C329 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | **Write generated artifacts in a plain, decided voice.** Specs, ADRs, validation reports, commit messages, and chat summaries follow the writing rules in [coding-principles.md](references/coding-principles.md): lead with the verdict, state decisions definitively, cut filler and mechanical hedging. |
| C330 | T1 | `.opencode/skills/tlc-spec-driven/SKILL.md` | Use available tools with graceful degradation. See [code-analysis.md](references/code-analysis.md). |
| C331 | T2 | `.opencode/command/init.md` | Harness-referenced document `.opencode/command/init.md` is an on-demand load target when linked from always-on rules or skills. |
| C332 | T2 | `.opencode/opencode.json` | Harness-referenced document `.opencode/opencode.json` is an on-demand load target when linked from always-on rules or skills. |
| C333 | T2 | `.opencode/skills/frontend-design/references/color-and-contrast.md` | Harness-referenced document `.opencode/skills/frontend-design/references/color-and-contrast.md` is an on-demand load target when linked from always-on rules or skills. |
| C334 | T2 | `.opencode/skills/frontend-design/references/interaction-design.md` | Harness-referenced document `.opencode/skills/frontend-design/references/interaction-design.md` is an on-demand load target when linked from always-on rules or skills. |
| C335 | T2 | `.opencode/skills/frontend-design/references/motion-design.md` | Harness-referenced document `.opencode/skills/frontend-design/references/motion-design.md` is an on-demand load target when linked from always-on rules or skills. |
| C336 | T2 | `.opencode/skills/frontend-design/references/responsive-design.md` | Harness-referenced document `.opencode/skills/frontend-design/references/responsive-design.md` is an on-demand load target when linked from always-on rules or skills. |
| C337 | T2 | `.opencode/skills/frontend-design/references/spatial-design.md` | Harness-referenced document `.opencode/skills/frontend-design/references/spatial-design.md` is an on-demand load target when linked from always-on rules or skills. |
| C338 | T2 | `.opencode/skills/frontend-design/references/typography.md` | Harness-referenced document `.opencode/skills/frontend-design/references/typography.md` is an on-demand load target when linked from always-on rules or skills. |
| C339 | T2 | `.opencode/skills/frontend-design/references/ux-writing.md` | Harness-referenced document `.opencode/skills/frontend-design/references/ux-writing.md` is an on-demand load target when linked from always-on rules or skills. |
| C340 | T2 | `.opencode/skills/harness-eval/references/GLOSSARY.md` | Harness-referenced document `.opencode/skills/harness-eval/references/GLOSSARY.md` is an on-demand load target when linked from always-on rules or skills. |
| C341 | T2 | `.opencode/skills/harness-eval/references/PROTOCOL.md` | Harness-referenced document `.opencode/skills/harness-eval/references/PROTOCOL.md` is an on-demand load target when linked from always-on rules or skills. |
| C342 | T2 | `.opencode/skills/harness-eval/references/claims.schema.json` | Harness-referenced document `.opencode/skills/harness-eval/references/claims.schema.json` is an on-demand load target when linked from always-on rules or skills. |
| C343 | T2 | `.opencode/skills/harness-eval/references/judge-prompts.md` | Harness-referenced document `.opencode/skills/harness-eval/references/judge-prompts.md` is an on-demand load target when linked from always-on rules or skills. |
| C344 | T2 | `.opencode/skills/tlc-spec-driven/references/code-analysis.md` | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/code-analysis.md` is an on-demand load target when linked from always-on rules or skills. |
| C345 | T2 | `.opencode/skills/tlc-spec-driven/references/coding-principles.md` | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/coding-principles.md` is an on-demand load target when linked from always-on rules or skills. |
| C346 | T2 | `.opencode/skills/tlc-spec-driven/references/context-limits.md` | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/context-limits.md` is an on-demand load target when linked from always-on rules or skills. |
| C347 | T2 | `.opencode/skills/tlc-spec-driven/references/design.md` | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/design.md` is an on-demand load target when linked from always-on rules or skills. |
| C348 | T2 | `.opencode/skills/tlc-spec-driven/references/discuss.md` | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/discuss.md` is an on-demand load target when linked from always-on rules or skills. |
| C349 | T2 | `.opencode/skills/tlc-spec-driven/references/implement.md` | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/implement.md` is an on-demand load target when linked from always-on rules or skills. |
| C350 | T2 | `.opencode/skills/tlc-spec-driven/references/lessons.md` | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/lessons.md` is an on-demand load target when linked from always-on rules or skills. |
| C351 | T2 | `.opencode/skills/tlc-spec-driven/references/memory.md` | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/memory.md` is an on-demand load target when linked from always-on rules or skills. |
| C352 | T2 | `.opencode/skills/tlc-spec-driven/references/specify.md` | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/specify.md` is an on-demand load target when linked from always-on rules or skills. |
| C353 | T2 | `.opencode/skills/tlc-spec-driven/references/sub-agents.md` | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/sub-agents.md` is an on-demand load target when linked from always-on rules or skills. |
| C354 | T2 | `.opencode/skills/tlc-spec-driven/references/tasks.md` | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/tasks.md` is an on-demand load target when linked from always-on rules or skills. |
| C355 | T2 | `.opencode/skills/tlc-spec-driven/references/validate.md` | Harness-referenced document `.opencode/skills/tlc-spec-driven/references/validate.md` is an on-demand load target when linked from always-on rules or skills. |
| P003 | T1 | `.agents/skills/workflow-tips/SKILL.md` | Prefer clear variable names and small functions when writing code. |
| P004 | T1 | `.agents/skills/workflow-tips/SKILL.md` | Keep layers thin and delegate work to the appropriate lower layer. |
| P005 | T0 | `AGENTS.md` | Never commit secrets, API keys, or credentials into the repository; use environment configuration outside version control. |
| P006 | T0 | `AGENTS.md` | Known caveat: commands that pass locally can still fail in CI when they depend on machine-local env vars or secrets that are not present in the pipeline; prefer the project's documented CI entrypoint when validating. |

## Output

Write scores as a table: `| ID | Cost | Class | Evidence | Confidence | Trim suggestion |`

