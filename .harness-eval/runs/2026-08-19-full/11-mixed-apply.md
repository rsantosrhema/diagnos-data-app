# Mixed apply plan (Track C)

> Run dir: `E:\OneDrive Rafael\OneDrive\Rhema Data\Aplicações\diagnos-data-app\.harness-eval\runs\2026-08-19-full`
> Judges: J1 model=`deepseek-v4-flash:0731` · J2 model=`deepseek-v4-flash:0731`
> **This file is the only Mixed apply input.** Do not re-judge usefulness.

## What these words mean

| Word | Meaning | Apply must |
|------|---------|------------|
| **KEEP** | Text from judge Keep-core columns | Remain in the harness surface as rule/snippet |
| **CUT** | Text from judge Slim columns | Delete or compress only this bulk |
| **Apply** | Mechanical edit | Not a new design pass |

## Hard rules for apply agents

1. For each Mixed ID below, edit **only** that path.
2. **KEEP** items must survive (same contract — concern/module/section/checklist).
   Do not replace a KEEP teaching snippet with a weaker pattern.
3. **CUT** only what both judges' Slim columns describe (or the union when both
   clearly name the same bulk). If KEEP and CUT conflict, **skip that path** (Hold).
4. Never replace a fenced teaching snippet with `See app/...` / `lib/...` / `test/...`.
5. Never defer KEEP content to AGENTS.md or another surface unless CUT explicitly
   names OVERLAP with that path **and** KEEP still retains the behavior contract.
6. Do not open the repo to invent a different convention than KEEP states.
7. After edits: every KEEP bullet must still be satisfied by the file text.

## Paths (2)

### S002 — `.opencode/skills/create-adr/SKILL.md`

- Tier: `T1` · Name: `create-adr`
- Overall: J1 `MIXED` · J2 `MIXED`

#### KEEP (do not remove or degrade)

- **J1:** KEEP: ADR format templates (MADR/Nygard/Y-Statement) + Step 1-5 workflow + Step 3 number assignment + file-naming convention. BEHAVIOR-CHANGING for ADR authoring.
- **J2:** BEHAVIOR-CHANGING: MADR/Nygard/Y-statement format templates, mandatory-field validation, sequential ADR numbering, supersede semantics.

#### CUT (only this bulk)

- **J1:** CUT: "Common Anti-Patterns", "ADR Quality Checklist", "Language Adaptation", prose of `When to Use`/`ADR vs RFC` tables. THEORY — general ADR knowledge.
- **J2:** Slim: CUT verbose "ADR vs RFC" prose, "Common Anti-Patterns" section, large AskQuestion context JSON, ADR-vs-format selection tables (general methodology THEORY).

#### Overlap cites (context only; cut OVERLAP here only if listed under CUT)

- **J1:** —
- **J2:** —

---

### S003 — `.opencode/skills/frontend-design/SKILL.md`

- Tier: `T1` · Name: `frontend-design`
- Overall: J1 `MIXED` · J2 `MIXED`

#### KEEP (do not remove or degrade)

- **J1:** KEEP: Frontend Aesthetics DO/DON'T guidelines (Typography, Color, Layout, Motion, Interaction, Responsive, UX Writing) + "AI Slop Test" + the 7 `references/*.md` load pointers. BEHAVIOR-CHANGING for UI work.
- **J2:** BEHAVIOR-CHANGING: "AI Slop Test" + Design Direction + the compressed DO/DON'T design rules that shape output.

#### CUT (only this bulk)

- **J1:** CUT: "Design Direction" narrative, the three "Examples" vignettes, "Implementation Principles" prose. THEORY / REPO-demonstrated (src/components + src/app/page.tsx).
- **J2:** keep; then CUT trimmed: the per-category "Consult references/…" pointers and the three narrative Examples (1/2/3) (THEORY/OVERLAP with its own references).

#### Overlap cites (context only; cut OVERLAP here only if listed under CUT)

- **J1:** —
- **J2:** S007 S008 S009 S010 S011 S012 S013 (parent body duplicates condensed DO/DON'T for each category)

---

