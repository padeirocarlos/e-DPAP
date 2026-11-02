# @dpap/schema — the questionnaire as the single source of truth

This package is the **keystone** of e-DPAP (BRD `docs/BRD_Maputo_Agri_Fisheries_Actor_Mapping_System.md`,
Section 14 step 2–3). Per the BRD, the questionnaire is **not hard-coded in UI components** — it is
defined once here and the database migrations, the data-entry UI (web + mobile), the validation and
the exports are all generated from it.

## Contents

| File | What it is |
|---|---|
| `form_schema.json` | The authoritative questionnaire: BRD Section 7 as data — 16 modules (0–O), every field with its **verbatim Portuguese label**, type, options, `relevance` (skip logic) and `constraint`, the 20 rosters (fixed + repeatable), and the shared `code_lists` (Appendix A). |
| `form_schema.schema.json` | A JSON Schema (draft 2020-12) that machine-validates `form_schema.json`'s shape. |
| `src/expr.ts` | The sandboxed **relevance / constraint expression engine** (no `eval`). The one shared implementation the web and mobile clients use; the Spring Boot backend gets a mirrored Java port for server-side re-validation (NFR-9). |
| `src/schema-model.ts` | Typed accessors + `validateField` / `validateSubmission` (required-when-relevant, `max_select`, exclusive codes, constraints — BR-CN rules). |
| `src/index.ts` | Barrel export (`import { … } from "@dpap/schema"`). |
| `scripts/validate.mjs` | `npm run validate` — validates `form_schema.json` against its JSON Schema. |
| `test/` | `expr.test.ts` (engine + real BRD routing expressions), `schema-completeness.test.ts` (every Section-7 ID present — AC-1), `validate.test.ts` (field validation / BR-CN — AC-3). |

## Commands

```bash
cd schema
npm install
npm run typecheck   # tsc --noEmit
npm run validate    # form_schema.json conforms to form_schema.schema.json
npm test            # vitest: engine, completeness, field validation
```

## The expression language (relevance & constraints)

Used verbatim from BRD Sections 7–8. Operators: `=`, `!=` / `≠`, `<`, `<=`, `>`, `>=`,
`IN (set)`, `<code> IN <multiselectVar>`, `AND`, `OR`, `NOT`, arithmetic `+ - * /`, parentheses.
The evaluation context is a flat map of questionnaire variable → answer
(e.g. `{ q0_13: 1, qA_15: [1, 4] }`). Examples straight from the BRD:

- Module C relevance: `q0_12 = 1 AND q0_13 IN (1, 2, 4) AND 1 IN qA_15`
- A.21 (NUIT) relevance: `4 IN qA_20`
- C.03 constraint: `qC_03 <= qC_02`

## Conventions

- **English** identifiers/keys; **Portuguese** labels verbatim from Section 7 (canonical UI strings).
- Special codes: `96` Other (+`_other` text), `98` Don't know, `99` Refused, `-1` Not applicable.
- `select_multiple` answers are integer code arrays.
- Coordinates WGS84 (EPSG:4326); currency MZN ("MT").

## How the rest of the system consumes this (later phases)

1. **DB migrations** (`DPAP-api`): roster `table` names + columns → `roster_*` tables; scalar fields →
   `submission` columns / JSONB. A **structural** schema change ⇒ a new `form_version` (FR-FORM-10).
2. **Form renderer** (`DPAP-web`, `DPAP-mobile`): iterate `modules()` → render fields by `type`,
   hide/show with `fieldRelevant`, validate with `validateField`. No question strings in components.
3. **Server re-validation** (`DPAP-api`): the Java port of `expr.ts` re-runs relevance + constraints.
4. **Exports / data dictionary** (FR-EXP-3): emit this schema per form version as XLSX/CSV/JSON.

## Adding or changing a field

Edit `form_schema.json` **first**, then propagate: new Flyway migration + entity + DTO/mapper
(`DPAP-api`), client types + renderer (both clients), and update the ID list in
`test/schema-completeness.test.ts`. Adding an **option** to a code list is non-structural; adding or
removing a **field/roster** is structural and bumps `meta.version` → a new `form_version`.
Code-list items are **deactivated, never deleted or re-coded** (BR-RG-4).
