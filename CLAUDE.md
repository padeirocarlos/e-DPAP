# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## BRD full-implementation programme (all six phases delivered)

The principal business requirement is to satisfy **every** requirement in
`docs/BRD_Maputo_Agri_Fisheries_Actor_Mapping_System.md` — a **schema-driven** re-architecture
(Section 7 → machine-readable schema → DB, UI, validation, exports; "do not hard-code questions in
UI components"). It is being built **in phases, evolving the three existing apps in place** (the
`actor` table becomes the registry master; submission/roster/workflow/form-engine are added
alongside). Reference requirement IDs (FR-/BR-/NFR-/AC-) in commits and tests. Build order & status:

- **Phase 0 — DONE.** `/schema/` keystone (below). The authoritative questionnaire + shared
  expression engine. Non-destructive; the three apps are not yet wired to it.
- **Phase 1 — DONE.** Backend data model (`DPAP-api`, Flyway **`V6__brd_data_model.sql`**, additive):
  `form_version`, `survey_round`, `submission` (routing/registry keys typed+indexed, all other
  answers in `answers` jsonb → stable across form versions; `geom` generated PostGIS point;
  `client_uuid` for idempotent sync), generic **`roster_row`** (one row per roster row, keyed by
  `roster_id` — all 20 rosters, version-stable), `relationship`, `programme`, `attachment`,
  `qc_flag`, `review_comment`, a `village` table + boundary geom cols on the admin hierarchy, and
  `actor` registry extensions (`actor_uid`, `registry_status`, `merged_into_id` for BR-RG-2
  merge-redirect / FR-PRV-5 anonymise). Entities so far: `FormVersion`, `SurveyRound` (+ repos);
  the heavier submission/roster entities are added in the phase that first uses them, to keep
  `ddl-auto: validate` clean. `FormVersionSeeder` (always-on, not demo-gated) seeds form version
  **1.0 PUBLISHED** with the schema dictionary from the bundled `src/main/resources/form_schema.json`
  (**copy of `/schema/form_schema.json` — keep in sync**) + a baseline round "Linha de base 2026".
  Verified: image build (compile+tests) green, Flyway applied to v6, Hibernate validate passed,
  all tables present, seeding confirmed.
- **Phase 2 — DONE.** Six BRD roles + submission workflow + server-side re-validation.
  **Backend:** `Role` enum is now the 6 BRD roles (`SYS_ADMIN, DATA_MANAGER, SUPERVISOR,
  ENUMERATOR, ANALYST, PARTNER`); Flyway **`V7__roles_and_scope.sql`** remaps the 3 legacy roles,
  widens the CHECK, and adds `user_scope` (per-user district scope, FR-AUTH-2; `UserScope` entity).
  `SecurityConfig` role rules updated; `DataSeeder` seeds one demo user per role
  (`admin@ / gestor@ / supervisor@ / inquiridor@ / analista@ / parceiro@ dpap.gov.mz`, password
  `dpap2024`). New `mz.gov.dpap.form` package: **`Expr`** (Java port of `schema/src/expr.ts`,
  tested for parity) + **`FormService`** (loads the bundled schema, re-validates a submission's
  answers — required-when-relevant, max_select, exclusive codes, constraints — BR-RT-2). New
  **submission workflow**: `Submission` entity (jsonb `answers` + `@Generated` questionnaire_number),
  `SubmissionStatus` state machine (§4.2) + `SubmissionAction`, `SubmissionService` (create with
  idempotent `client_uuid`; transitions enforce the state graph, per-action roles, optimistic
  concurrency, and SUBMIT re-validation), `SubmissionController` (`POST /submissions`,
  `GET /submissions[/{id}]`, `POST /submissions/{id}/transitions`), `ValidationException`→422.
  24 backend tests green; workflow verified end-to-end (submit→review→approve→publish, role 403 /
  invalid-transition 409 / validation 422). **Web + mobile:** `roles` dictionary → the 6 codes
  (`sysadmin/datamanager/supervisor/enumerator/analyst/partner`); web `permissions.ts` map +
  `normalizeRole` (accepts the uppercase wire names), `UserRole` wire type, `DEMO_ACCOUNTS`, admin
  role options and mock stores all updated; web tsc/lint/build green, mobile build/lint/24 tests
  green. **Not yet wired:** the submission capture UI (Phase 3) and the review/QC screens (Phase 4);
  PUBLISH sets status only — actor-registry linking/merge is Phase 4.
- **Phase 3 — DONE.** Schema-driven form renderer + offline PWA capture, both clients. A **shared,
  framework-neutral renderer** is vendored into each app at `src/form/` — `expr.ts` + `schema-model.ts`
  + `form_schema.json` (copies of `/schema`; see sync note), plus `use-form.ts` (headless controller:
  answers map, live relevance, select_multiple exclusivity/max, roster rows) and `form-ui.tsx`
  (`Questionnaire` — module-by-module nav + progress, every field type, "Outro"(96)/98/99, fixed +
  repeatable rosters with auto-calc, GPS capture with ≤10 m accuracy gate + reason, in-browser photo
  capture/compress ≤2 MB rendered as a CSS background). Each app injects its chrome labels
  (`dict.form`) and data layer. **Mobile** (`DPAP-mobile`): Dexie `submissions` store (db v2) +
  `submissions-repo` (autosave drafts) + `submissions-sync` (push `pending` to `POST /submissions`,
  idempotent via `clientUuid`, hooked into `useSync`), an Entrevistas/Atores tab, `Interview`
  capture + `InterviewList`. **Web** (`DPAP-web`): `lib/api/submissions.ts` + `lib/actions/submissions.ts`,
  the `/pt/entrevistas` list, `/nova` capture (same renderer), `/[id]` schema-driven read view +
  client `SubmissionWorkflow` action bar; a dev **mock** backend (`lib/mock/submissions-store.ts` +
  `app/api/submissions/**`). Verified: mobile build/lint/24 tests green; web tsc/lint/build green (3
  new routes); web mock API smoke (create→SUBMITTED, list, OPEN_REVIEW→UNDER_REVIEW, invalid→409).
  **Deferred:** photo stays local (no attachment-upload endpoint yet — Phase 4/6); roster rows ride
  in the `answers` jsonb (extraction to `roster_row` / network / programme tables is Phase 4).
- **Phase 4 — DONE.** QC engine + Actor Registry (publish/dedup/merge) + review screens + extraction.
  **Backend:** Flyway **`V8__registry_publish_support.sql`** (adds Matola — the 8th district absent
  from V2 — and makes `actor.administrative_post_code` nullable since 0.07 is free text). New
  entities/repos for the Phase-1 tables now in use: `QcFlag`, `ReviewComment`, `RosterRow`,
  `Relationship`, `Programme`; `Actor` now maps `actorUid`/`registryStatus`/`mergedIntoId`.
  `QcService` runs BR-QC-1 (GPS missing/>10 m/outside Maputo bbox), BR-QC-3 (duration), BR-QC-4
  (duplicate by phone/NUIT/name), BR-QC-5 (>20% 98/99) on SUBMIT → `qc_flag` rows (BR-QC-2/6/7
  deferred — need polygons/distributions). `ExtractionService` extracts roster rows on submit and
  N.03/J.13→`relationship` + K.08/L.11/M.07→`programme` on publish. `RegistryService` publishes a
  submission to a master `actor` (assigns `actor_uid` = `MPT-<district>-%06d`, maps q0_13/qA_15/qA_19
  → the actor enums), finds duplicate candidates, and merges (BR-RG-2 redirect + re-point submissions
  + audit). `SubmissionService` wires these into the workflow; RETURN/REJECT records a
  `review_comment`. New endpoints: `GET /submissions/{id}/qc|comments|duplicates`,
  `POST /submissions/{id}/comments`, `POST /actors/{id}/merge` (SecurityConfig: comments =
  SUPERVISOR+, merge = DATA_MANAGER/SYS_ADMIN). 30 backend tests green (6 new `QcServiceTest`).
  Verified live: submit→QC flags (BR-QC-3/4 fired), comment, approve, publish→actor `MPT-BOA-000002`,
  duplicate candidate ("Mesmo telefone"), merge→source MERGED, supervisor-merge 403.
  **Web:** submission detail now shows a **review surface** — `QcPanel`, `CommentsPanel` (add via
  Server Action), and a `DuplicatesPanel` (merge, shown when APPROVED/PUBLISHED); `lib/api/submissions.ts`
  + actions extended; dev **mock** routes added (`/api/submissions/[id]/{qc,comments,duplicates}`,
  `/api/actors/[id]/merge`). tsc/lint/build green; mock smoke verified (QC flags, add comment).
  **Deferred:** attachment-upload endpoint (photo still local); exposing `actor_uid` in `ActorDto`
  (set + DB-verified, UI display is minor polish).
- **Phase 5 — DONE.** Multi-actor network graph + indicator dashboards + GIS symbology.
  **Backend:** `NetworkService` builds the graph from the `relationship` edges — registered actors
  + unregistered free-text partners as nodes, degree/most-connected/isolated metrics — at
  `GET /network?relationType=` (`NetworkDto`). `IndicatorsService` aggregates a §9 subset from
  published submissions + programmes + the network at `GET /indicators` (`IndicatorsDto`): IND-01
  actors-by-level, IND-02 respondents-by-sex, IND-16 programmes (count + beneficiaries + by thematic
  area/district), IND-18 coordination (knows-plans / participates + network size). Both GET endpoints
  are any-authenticated. Verified live: publish an interview with an N.03 row → `/network` 2 nodes/1
  edge (registered + unregistered partner), `/indicators` the level/coordination distributions.
  **Web:** a new **Rede** page (`/pt/rede`) with an interactive, dependency-free **SVG force-layout
  graph** (registered vs unregistered = two CVD-safe hues, radius ∝ degree, hover→actor profile,
  relationship-type filter) + metrics + most-connected; the **dashboard** gained an `IndicatorsPanel`
  (schema-resolved labels, single-hue magnitude bars per the dataviz skill); the **map** now colours
  actors by sector (Okabe–Ito colourblind-safe palette) with a legend (FR-GIS-1). `lib/api/network.ts`
  + dev **mock** (`/api/network`, `/api/indicators`). tsc/lint/build green; mock smoke verified.
  **Deferred:** roster-level indicators (IND-05/06/07/08 — need `roster_row` aggregation), GIS
  clustering/choropleth, free-text-partner→actor linking UI.
- **Phase 6 — DONE.** Exports, OpenAPI, attachments, export audit, dump script, PT manuals.
  **Backend:** `ExportService` + `ExportController` — `GET /actors/export?format=geojson|kml&anonymised=`
  (anonymisation strips individual-producer name/contacts + jitters the point ≥1 km, FR-EXP-5) and
  `GET /form/dictionary?format=json|csv` (data dictionary, FR-EXP-3); every export is
  audit-logged via the new `EXPORT` action (Flyway **`V9`** widens the audit CHECK; NFR-8/17).
  **OpenAPI** via springdoc at `/api/swagger-ui.html` + `/api/v3/api-docs` (permitAll). **Attachment
  upload** (`Attachment` entity/repo/service/controller): `POST /submissions/{id}/attachments`
  (data-URL, ≤5 MB, SHA-256, stored under `ATTACHMENTS_DIR`), `GET …/attachments`,
  `GET /attachments/{id}`; mobile sync uploads the `q0_11` photo after the submission posts and drops
  it from the local answers (NFR-3, FR-MOB-5). 30 backend tests green; verified live (OpenAPI 22
  paths, GeoJSON/KML/anonymised, dictionary CSV, attachment upload→download, EXPORT audit rows).
  **Web:** the report builder gained **GeoJSON/KML** (+ anonymise toggle) and **data-dictionary**
  download links via a token-forwarding proxy `/api/download/export`; dev mocks for
  `/api/actors/export` + `/api/form/dictionary`. tsc/lint/build + mock smoke green.
  **Root:** `scripts/dump.sh` — full open-format cópia (pg_dump + per-table CSV + attachments +
  dictionary, FR-EXP-4). **Docs:** `docs/MANUAL_UTILIZADOR.md` + `docs/MANUAL_ADMINISTRADOR.md` (PT,
  FR-DOC-2). **Deferred:** Shapefile export (GeoJSON/KML cover the SIG need), runtime code-list/
  admin-unit/round management UI (FR-FORM-11 form-designer), SMTP self-service reset, 2FA.

**BRD programme status: all six phases delivered.** The schema-driven system (one `form_schema.json`
→ DB, UI, validation, exports), the submission→registry workflow with the six roles, offline capture,
QC + dedup/merge, the network graph + indicators, and the export/handover suite are implemented and
verified. Remaining items are explicitly-deferred niceties (listed per phase above): Shapefile,
roster-level indicators IND-05/06/07/08, GIS clustering/choropleth, the form-designer/admin-unit UI,
SMTP/2FA, and the full XLSForm round-trip (FR-FORM-12, "Could").

**Post-BRD enhancements (delivered after the six phases).**
- **Data Conformance review queue (Conformidade de Dados).** A dedicated web page `/pt/conformidade`
  (`src/components/conformance/conformance-queue.tsx`) listing submissions awaiting validation
  (SUBMITTED / UNDER_REVIEW / RETURNED, newest first) with their open QC-flag count, each linking to
  the existing submission detail (QcPanel + CommentsPanel + SubmissionWorkflow) where the reviewer
  approves/returns/rejects. Gated by a new `conformance:review` permission → **SUPERVISOR,
  DATA_MANAGER, SYS_ADMIN only**; enumerators (interviewers), analysts and partners never see the nav
  entry and get the forbidden notice on the page. Backend exposes `qcFlagCount` on `SubmissionDto`
  (batch-counted in `SubmissionService.list` via `QcFlagRepository.countBySubmissionIdIn`, avoiding
  N+1). Review transitions/comments were already role-enforced server-side.
- **Per-module statistics on the dashboard (data conformance / §9).** `FormService.moduleStats(...)`
  computes, schema-driven, per questionnaire module 0–O: field count, applicable published
  submissions, and completeness % (answered relevant fields / relevant fields). Surfaced in
  `IndicatorsDto.byModule` → the dashboard `IndicatorsPanel` (`ModuleStatsCard`, single-hue magnitude
  bars). The dev mock `indicators()` returns a shape-compatible `byModule`.
- **User registration** already lives at `/pt/administracao` (SYS_ADMIN, all six roles assignable) —
  no change needed.
- **LAN / IP-address access fix.** (1) Both browser HTTP clients (`DPAP-web/src/lib/api/http.ts`,
  `DPAP-mobile/src/api/http.ts`) resolve the API host from the page's own host when the configured
  base URL is loopback (`localhost`/`127.0.0.1`) but the app was opened over a LAN IP/hostname — so a
  device reaches the API on the machine that served the app, not itself. Server-side calls are
  untouched. (2) Backend CORS now also accepts origin **patterns** (`app.cors.allowed-origin-patterns`
  / `CORS_ALLOWED_ORIGIN_PATTERNS`, default private ranges `http://192.168.*:*,http://10.*:*,
  http://172.*:*,http://*.local:*`) alongside the exact `allowed-origins`, so a LAN origin passes the
  preflight without pinning the address. (Note: to reach the dev servers from *other* devices they
  must bind externally — use `./start.sh lan`, which sets `-H 0.0.0.0`/`--host` and wires origins.)
- **Mozambique-flag theme + Word-point type scale (both apps).** The visual theme lives entirely in
  the two Tailwind-v4 CSS files — `DPAP-web/src/app/globals.css` and `DPAP-mobile/src/index.css` —
  which must be kept in sync. In an `@theme` block they (a) **remap the `emerald-*` brand ramp to the
  flag's green**, so every existing `emerald` utility is flag-green with no per-component churn — do
  **not** reintroduce literal greens; use `emerald-*` for brand or the `flag-*` accents; (b) expose
  `flag-green/red/red-dark/gold/black` colour utilities; (c) **remap the text-size scale to
  Microsoft-Word points** (titles `text-xl`/`text-2xl` = 16pt ≈ 21px, regular labels/body `text-sm`
  = 12pt = 16px, hints `text-xs` ≈ 10pt; `text-3xl`+ left large for data numerals) — so sizing is
  consistent app-wide without touching components. A `.mz-flag-stripe` CSS class paints the flag-band
  gradient used as a thin accent on the app header (`app-shell.tsx` / mobile `App.tsx`) and the login
  screens. The **login page** (`DPAP-web/src/app/[lang]/(auth)/entrar/page.tsx`) is a two-column hero
  (flag-green panel + inline Mozambique silhouette `src/components/brand/mozambique-map.tsx`, an
  offline-safe single-path SVG) beside the form. When changing brand colour or type scale, edit both
  CSS files identically.

**Vendored form engine — sync rule.** `/schema` is canonical. Its `form_schema.json` is copied to
`DPAP-api/src/main/resources/form_schema.json` and to `DPAP-web/src/form/` + `DPAP-mobile/src/form/`;
`expr.ts`/`schema-model.ts` are copied (bundler-friendly: same-dir JSON import, extensionless, no
import attribute) to both apps' `src/form/` and ported to Java (`mz.gov.dpap.form.Expr`). When the
questionnaire or engine changes in `/schema`, re-copy to all four places (web+mobile files are
byte-identical to each other; edit the mobile copy then `cp` to web).

### `schema/` — the single source of truth (Phase 0)

Standalone, independently-tested package at repo root (`cd schema && npm install`). It owns
`form_schema.json` — BRD Section 7 as data: **16 modules (0–O)**, 150 scalar fields and 20 rosters
(fixed + repeatable) with **verbatim Portuguese labels**, `relevance` (skip logic) and `constraint`
expressions, plus shared `code_lists` (Appendix A: districts, crops, actor_type, special codes
96/98/99/-1, …). `form_schema.schema.json` is its JSON Schema (validated by `npm run validate`,
draft 2020-12 via `ajv/dist/2020.js`). `src/expr.ts` is the sandboxed **relevance/constraint
expression engine** (no `eval`; operators `= != ≠ < <= > >= IN AND OR NOT + - * /`, `code IN
multiselectVar`) shared by both clients; the backend gets a mirrored **Java port** in Phase 2.
`src/schema-model.ts` has typed accessors + `validateField`/`validateSubmission` (required-when-
relevant, `max_select` BR-CN-9, exclusive codes BR-CN-10, constraints). Commands: `npm run
typecheck`, `npm run validate`, `npm test` (vitest — 58 tests: engine + real BRD routing
expressions, schema completeness/AC-1, field validation/AC-3). **All later phases consume the
questionnaire through this package; never hard-code questions or re-read the BRD at runtime.**
Add/change a field here first, then propagate (see `schema/README.md`); a structural change bumps
`meta.version` → a new `form_version`.

## Project status

**All three components exist; web + backend verified end-to-end, the mobile PWA has its offline core.** `DPAP-web/` (Next.js App Router) has auth + the 6 BRD roles (see Phase 2), actor CRUD, map, dashboard, list filtering, report export (CSV/XLSX/PDF), the audit viewer, and admin user management. `DPAP-api/` (Spring Boot + PostgreSQL/PostGIS) implements the matching contract and was verified end-to-end against the frontend (login → JWT → CRUD → dashboard, with role enforcement and PostGIS geometry). `DPAP-web` can run against either the real backend or its dev-only in-process mock. `DPAP-mobile/` (Vite + React + Dexie PWA) is built and verified: login, offline actor capture with GPS, on-device duplicate detection, the IndexedDB store + outbox, bidirectional sync (outbox push + delta pull) with version/last-updated-wins conflict resolution and a conflict-review UI, and Background Sync via a custom service worker. Verified by a Vitest suite (fake IndexedDB), a live integration test against the backend (`npm run test:live`), and a Playwright/Chromium E2E (`npm run test:e2e`: service worker, offline shell, GPS, offline→reconnect, pull); typecheck/build/lint green. The full functional and non-functional specification lives in `docs/REQUIREMENTS.md` (an English brief) and `docs/TDR.pdf` (the formal Portuguese Terms of Reference). Read `docs/REQUIREMENTS.md` before building features or making architecture decisions — this file only summarizes it.

**Root helper scripts.** `./start.sh` runs the whole stack locally (prereq checks → API via Docker Compose, waits healthy → web + mobile dev servers against the real backend; modes: `all|lan|api|web|mobile|stop` — `lan` binds to `0.0.0.0` and wires the apps + CORS to the machine's LAN IP so phones/tablets on the same Wi-Fi can connect). `./deploy.sh` does a fail-closed production deploy (preflight validates real secrets, refuses dev defaults → backend with `SEED_DEMO_DATA=false` + injected secrets → `next build`/`next start` → mobile static build; `./deploy.sh stop` tears down). Production config comes from `.env.deploy` (see `.env.deploy.example`); the backend `docker-compose.yml` reads `JWT_SECRET`/`DB_PASSWORD`/`CORS_ALLOWED_ORIGINS`/`SEED_DEMO_DATA` from the environment with dev-safe `:-` defaults.

To run the web app against the **real** backend instead of the mock: start `DPAP-api` (`cd DPAP-api && docker compose up --build`), then run `DPAP-web` with `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api` and `AUTH_DEV_MODE=false` (so login hits the backend). Demo users are seeded in both with the same emails; the backend demo password is `dpap2024`.

### DPAP-web commands (run from `DPAP-web/`)

- `npm run dev` — dev server (Turbopack) at http://localhost:3000. **Works end-to-end out of the box**: `.env.development` points the API client at the app's own origin so the dev mock backend serves data, and demo login is on. Sign in at `/pt/entrar` with `admin@dpap.gov.mz`, `editor@dpap.gov.mz`, or `leitor@dpap.gov.mz` (any password).
- `npm run build` — production build
- `npm start` — serve the production build (real backend; add `MOCK_API=true` + `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api` to use the mock here too)
- `npm run lint` — ESLint

> **Next.js 16 (Turbopack).** This is a newer major than most training data — APIs, conventions, and file layout differ. A generated `DPAP-web/AGENTS.md` instructs reading the bundled guides in `DPAP-web/node_modules/next/dist/docs/` before writing Next.js code; `next dev` rewrites that file, so commit it with your changes rather than fighting the diff. `next.config.ts` has `cacheComponents` and `partialPrefetching` enabled. Two Next 16 renames to watch: middleware is now `proxy` (`src/proxy.ts`, exports `proxy()`), and locale is read via `next/root-params` (`lang()`), server-only.

### DPAP-web structure & conventions

The app is App Router with a `src/` dir. Key foundations are in place — **follow these patterns, don't reinvent them:**

- **Routing is locale-prefixed** under `src/app/[lang]/`. `src/proxy.ts` redirects any non-prefixed path to the best locale (default `pt`). Because Cache Components is on, every `[lang]` layout needs `generateStaticParams()` returning the locales (already wired in the root layout).
- **No hardcoded strings — ever.** All user-facing text lives in `src/i18n/locales/pt.ts` (the single source of truth; the `Dictionary` type is derived from it). Server Components read it with `getDictionary()` (`src/i18n/dictionary.ts`, uses `root-params`); Client Components read it via `useDictionary()`/`useLocale()` from `src/i18n/provider.tsx` (the root layout wraps the tree in `I18nProvider`). Interpolate `{placeholders}` with `format()` from `src/i18n/format.ts`. Catalog leaves are plain strings so they stay serializable across the server/client boundary — do not put functions in the dictionary.
- **No hardcoded config/paths either.** Tunables live in `src/config/app.config.ts`; env vars are parsed/validated in `src/config/env.ts`; internal links come from the builders in `src/config/routes.ts` (keep them locale-prefixed).
- **Domain reference data** is in `src/lib/domain/`: enum codes (`enums.ts`) are derived from the dictionary keys so a code can't exist without a label; the Maputo territorial hierarchy (`location.ts`) is seed data to be completed from the official register.
- **Validation is centralized and localized.** `src/lib/validation/actor-schema.ts` exports `buildActorSchema(dict)` — a factory so zod messages come from the dictionary (don't write bare zod schemas with inline English messages). 
- **Duplicate avoidance** lives in `src/lib/validation/duplicate.ts`: a deterministic `identityKey` blocks exact duplicates and a bigram `nameSimilarity` warns on near-matches. Lookups go through the `DuplicateChecker` interface — `duplicate-checker.ts` currently exports an in-memory seeded `defaultChecker`; **replace it with an API-backed impl** (and an IndexedDB-backed one in the mobile PWA), both reusing `rankDuplicates`. The new-actor form (`src/components/actors/actor-form.tsx`) is the reference wiring: debounced check, hard-block on exact, warn on similar.
- **Leaflet is client-only.** Never import it in a Server Component. Render maps through `src/components/map/map-view.tsx`, which dynamically imports `actor-map.tsx` with `ssr: false`. Map config (center/zoom/bounds/tiles) comes from `appConfig.map`.
- **Backend data layer** lives in `src/lib/api/`. `http.ts` is the one isomorphic fetch client (base URL + timeout from `appConfig.api`, bearer token from `auth-token.ts`, every failure normalized to a typed `ApiError` with a stable `code`). Resources (`actors.ts`, `dashboard.ts`) are thin typed wrappers — **call these, never `fetch` directly.** DTOs are in `types.ts`; every persisted entity carries the sync envelope (`id`/`version`/`createdAt`/`updatedAt`/`syncStatus`) and mutations send `version` for optimistic concurrency. The base URL comes from `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080/api`), validated in `src/config/env.ts`.
- **Dashboard** (`dashboard-metrics.tsx` server → `dashboard-view.tsx` client): stat tiles, an SVG registration-trend area, and three **clickable** category bar charts (district/sector/type). Magnitude uses a single brand hue (emerald) — no categorical palette to CVD-validate. Clicking a category expands an inline drill-down of its actors via the `drilldownActorsAction` Server Action (`src/lib/actions/dashboard.ts`), each linking to the actor detail page plus a "ver todos" link to the filtered list. (Chart work: the `dataviz` skill applies — magnitude→one sequential hue, hover layer, dark-mode-stepped colors.)
- **Actor detail** (`/pt/atores/[id]`, `actors:read`): `actor-detail-loader.tsx` (server, token) → `actor-detail.tsx` renders every populated field grouped into the form's sections (empty fields hidden), with back + role-gated edit links. The actors table name and dashboard drill-down link here.
- **Data-fetching pages** render a static shell, then fetch inside a `<Suspense>` boundary via an async Server Component (`dashboard-metrics.tsx`, `actors-table.tsx`, `actor-markers.tsx`). This is required: under Cache Components an uncached (request-time) fetch must sit inside Suspense. Failures bubble to `src/app/[lang]/error.tsx` (localized, with retry). Follow this shell + Suspense + error-boundary pattern for new data pages rather than awaiting fetches at the top of a page.
- **Auth + the six roles** live in `src/lib/auth/`. Sessions are a signed (HMAC, not encrypted) httpOnly cookie (`session-token.ts`), read server-side only through the DAL in `session.ts` (`getSession`/`requireSession`/`getServerAuthToken`). Login/logout are Server Actions (`actions.ts`); `service.ts` authenticates (demo accounts in dev, backend `/auth/login` otherwise). Roles are the BRD §3.3 six — `RoleCode` codes `sysadmin | datamanager | supervisor | enumerator | analyst | partner` (the dictionary `roles` keys); the wire format is the uppercase backend enum (`SYS_ADMIN`…), mapped by `normalizeRole()`. The capability map is `permissions.ts` (`can(role, permission)`), the single source for UI gating and server-action authorization, and it mirrors the backend `SecurityConfig` role rules.
  - **Three enforcement layers, each with a job:** (1) `src/proxy.ts` hard-redirects requests with no session cookie to login — a presence check only; (2) the `(app)` layout verifies the session behind `<Suspense>` (`AuthenticatedShell`) and server components gate with `RequirePermission`; (3) **the backend API re-verifies the bearer token on every call and is the real security boundary** — client `useCan()` gating only hides UI. Always re-check the session inside Server Actions; never trust the client.
  - **Cache Components rule (critical):** a session read calls `cookies()`, which is request-time data — it must sit inside a `<Suspense>` boundary and **never at a layout's top level**. Follow the `(app)/layout.tsx` pattern (gate in a child async component under Suspense). `redirect()` throws, so it interrupts rendering rather than returning.
  - **Routes** are split into `app/[lang]/(app)/` (protected; has the `AppShell` + `SessionProvider`) and `app/[lang]/(auth)/` (public login). Root `[lang]/layout.tsx` only provides `I18nProvider`. There are two error boundaries: `(app)/error.tsx` (keeps the shell, for data errors) and `[lang]/error.tsx` (covers auth pages and layout-level failures).
  - **Secrets** (`AUTH_SESSION_SECRET`, `AUTH_DEV_MODE`, `AUTH_SESSION_TTL_SECONDS`) are read in `src/lib/auth/config.ts` (`server-only`), kept out of the shared `src/config/env.ts` so they never enter the client bundle. `AUTH_SESSION_SECRET` is resolved lazily (fails at request time in production if unset, not at build). `AUTH_DEV_MODE` (default on outside production) enables demo-account login without a backend.
  - **Writes go through Server Actions** (`src/lib/actions/actors.ts`: create/update/delete + duplicate check), which read the cookie token server-side and attach it as the bearer — the httpOnly cookie can't reach client-side `fetch`. Server reads pass `getServerAuthToken()` into the resource functions. Actions use `getActiveSession()` (expiry-aware); the backend still validates the token.
  - **Never read the clock (`Date.now()`/`new Date()`) in the render path** — Cache Components flags it as an "unstable value while prerendering" and the route errors. Session expiry is enforced via the cookie `maxAge` (browser) + `isSessionExpired()` inside Server Actions (where reading the clock is allowed) + the backend. `decodeSession` deliberately does not compare against the current time.

- **Admin user management** (`/pt/administracao`) is wired: `src/components/admin/*` (server `UsersLoader` → client `UsersAdmin` table + create/edit form) over `src/lib/api/users.ts` and Server Actions in `src/lib/actions/users.ts` (all require `admin:access`, gated by `RequirePermission`). Roles travel on the wire **uppercase** (`ADMINISTRATOR`/`EDITOR`/`VIEWER`); use `normalizeRole()` to map to a `RoleCode` for labels. Email is immutable on edit; password optional on edit (reset only).
- **Report builder** (`/pt/relatorios`, permission `reports:read` — every role). Three steps: (1) `ActorFilters` (URL filters) + a server `ReportSummary` that shows the live matched-actor count (re-renders as filters change the URL); (2) a **column chooser** (`report-export.tsx`, client) over the shared catalogue `src/lib/reports/columns.ts` (keys match the backend `ReportService.COLUMNS` + the dev mock `report.ts`); (3) three download links (CSV/XLSX/PDF) built by `actorExportUrl()` in `src/config/routes.ts`, carrying the current filters **and the selected `columns`**. A file download is a top-level navigation and can't send the httpOnly cookie's bearer, so the links point at a **token-forwarding proxy** `src/app/api/download/actors/route.ts` (NOT a mock — runs in prod): it reads the session server-side, attaches the JWT, fetches the backend `/reports/actors` at `appConfig.api.baseUrl`, and streams the bytes back with the `Content-Disposition: attachment` header (so the browser downloads without navigating). It uses raw `fetch` (not the typed `http` client) deliberately — exports are opaque binary streams. On failure it 307-redirects to `…/relatorios?erro=formato|exportacao` (localized notice). The **dev mock only generates CSV** (`src/lib/mock/report.ts`, UTF-8 BOM, columns matching the backend); XLSX/PDF are the real backend's job (Apache POI/OpenPDF) and the mock returns 501 → the proxy shows the "full backend" notice.
- **Audit viewer** (`/pt/administracao`, second section, `admin:access`). `src/components/admin/audit-loader.tsx` (server, reads URL filters + token) → `audit-viewer.tsx` (client table + filters + prev/next paging) over `src/lib/api/audit.ts`. Filters live in the URL under namespaced keys (`auditoria*` in `src/lib/audit/filter-params.ts`) so they coexist with any actor filters. Entity types and actions travel **uppercase** (`ACTOR`/`USER`, `CREATE`/`UPDATE`/`DELETE`); labels come from `admin.audit.*`. The mock (`src/lib/mock/audit-store.ts`, seeded) also receives entries from the actor/user mock route handlers via `recordAudit(...)`, attributed to the acting user decoded from the mock bearer (`bearerEmail()` in `src/lib/mock/http.ts`), so the viewer reflects live demo activity.
- **Dev mock backend** (`src/app/api/*` + `src/lib/mock/store.ts`, `users-store.ts`, `audit-store.ts`, `report.ts`) implements the same contract as the real backend (`/auth/login`, `/actors` CRUD with filtering/pagination/duplicate-409/optimistic-concurrency-409, `/dashboard/stats`, `/audit`, `/reports/actors` CSV) over a seeded in-memory store (kept on `globalThis` to survive HMR; resets on restart). It is **dev-only**: handlers 404 unless `MOCK_API=true` or non-production (`MOCK_ENABLED` in `src/lib/mock/http.ts`). The app reaches it because `.env.development` sets `NEXT_PUBLIC_API_BASE_URL` to the app's own origin; swapping in the real backend is just that env var — no client changes. Note: route handlers that must run per-request use `await connection()` (the `dynamic` segment config is disallowed under Cache Components). This is scaffolding to delete once the Spring Boot backend exists.
- **Actor CRUD + list filtering.** The actor form (`actor-form.tsx`) is shared by create and edit via an `{ mode, actorId, version, initial }` prop union; edit sends `version` for optimistic concurrency (a stale update returns a distinct `STALE` result). Edit route: `atores/[id]/editar` (gated `actors:write`, loads via `edit-actor-loader.tsx`). Row actions (`actor-row-actions.tsx`) are role-gated (edit = write, delete = delete) with an inline two-step confirm, and refresh the server list via `router.refresh()`. **List filters live in the URL**, not component state: keys + parsing are centralized in `src/lib/actors/filter-params.ts` (shared by the server `ActorsTable` that reads them and the client `ActorFilters` that writes them, debounced); `useSearchParams` requires its own `<Suspense>`, and the page forwards the `searchParams` promise into the table's boundary rather than awaiting it in the shell.

## DPAP-api (Spring Boot backend)

Java 21 + Spring Boot 3.3 + PostgreSQL 16/PostGIS, under `DPAP-api/`. It implements the exact contract `DPAP-web`'s `src/lib/api` expects. Package root `mz.gov.dpap`.

- **Run it:** `cd DPAP-api && docker compose up --build` (PostGIS + API; API on `:8080`, served under context-path `/api`). No local Maven needed; the Docker build uses a Maven image. Locally without Docker you can build with any Maven 3.9 + JDK 21 (`mvn -DskipTests package`) and run the jar against a PostGIS instance (`DB_URL`/`DB_USER`/`DB_PASSWORD`, `JWT_SECRET`).
- **Contract match (verified end-to-end against the frontend):** `POST /api/auth/login` → `{token, user}`; `GET /api/actors` (filters `q,districtCode,localityCode,sector,actorType,legalStatus,page,pageSize`) → `{items,page,pageSize,total}`; `GET/POST/PUT/DELETE /api/actors/{id}`; `GET /api/actors/changes?since=&page=&pageSize=` (delta pull for offline clients — full records with `updatedAt > since`, oldest first; the literal path is matched before `/{id}`); `GET /api/dashboard/stats`. Errors return `{message, code}` with the status the frontend's `ApiError` maps on (401/403/404/409/422/5xx). **Enum string values must stay identical** to the frontend dictionary codes (`ActorType`, `Sector`, `LegalStatus`, `FundingType`, `Role`); they're the wire contract.
- **Schema** is Flyway (`src/main/resources/db/migration`): `V1` (PostGIS extension, `district`/`administrative_post`/`locality` hierarchy, `app_user`, `actor`), `V2` (Maputo locations matching the frontend codes), `V3` (audit log), `V4` (actor activity fields: `description`, `observations`, `start_date`, `funding_type`, `image_url`), `V5` (BRD Module 0/A/I profile: `acronym`, respondent sex/age/education, `phone_alt`, `website`, `operation_level`, `legal_formality`, `nuit`, consent flags, `received_credit`, and the `select_multiple` fields `subsectors`/`value_chain_links`/`districts_of_operation`/`registration_docs`/`funding_sources` stored as comma-separated code lists via `StringListConverter`) — all nullable. `actor.geom` is a **DB-generated, GIST-indexed `geography(Point,4326)`** derived from lon/lat — not mapped in the JPA entity, so it validates clean (`ddl-auto: validate`). Adding an actor field means: a new Flyway migration + the entity + `ActorRequest`/`ActorDto` + `ActorMapper` (apply & toDto) + `ReportService` columns + **the positional `new ActorRequest(...)` in `ActorServiceTest`** (easy to forget — it's compiled by the Docker `package` build even with `-DskipTests`), then the web (`types`, `actor-schema`, `actor-form`, `edit-actor-loader`, i18n) and mobile (`api/types`, `validate-actor`, `ActorForm`, `sync/server-record`, `engine.toWriteModel`, i18n) layers. Demo users + sample actors are seeded by `DataSeeder` (Java, needs the password encoder) when tables are empty; disable with `SEED_DEMO_DATA=false`.
- **Auth/roles:** stateless JWT (`JwtService` + `JwtAuthenticationFilter`), BCrypt passwords, URL rules in `SecurityConfig` (write = `EDITOR`/`ADMINISTRATOR`, delete = `ADMINISTRATOR`). The frontend sends this JWT as the bearer; the backend is the real authorization boundary.
- **Gotchas that bit during build:** create/update use `repo.saveAndFlush(...)` (not `save`) so `@CreationTimestamp`/`@UpdateTimestamp` and the `@Version` increment are reflected in the returned DTO — plain `save()` returns before the flush and yields `null` timestamps / a stale version. Optimistic concurrency: the service compares the request's `version` to the entity's and throws `StaleVersionException` (→ 409) before applying changes.
- **Audit trail** (`AuditService` + `audit_log` table, Flyway `V3`): every actor/user create/update/delete records `{at, actorEmail, action, entityType, entityId, summary}` in the same transaction as the mutation. `GET /api/audit` (admin only; filters `entityType`, `action`, paged) browses it.
- **Admin user management** (`UserService`/`UserController`, `/api/users`, **ADMINISTRATOR only**): list/get/create/update/delete. Email is immutable on update; `password` is optional there (set only to reset). Guards: duplicate email → 409, self-deletion → 409. Passwords BCrypt-hashed.
- **Report exports** (`ReportService`/`ReportController`, `GET /api/reports/actors?format=csv|xlsx|pdf` + the same list filters + optional `columns=key1,key2,…`; any authenticated user). Columns are a canonical `ReportService.COLUMNS` list (stable key + PT header + extractor); CSV/XLSX emit the selected keys in canonical order (empty = all), PDF (OpenPDF, **pinned to 1.3.x for the `com.lowagie.text` API**) is a fixed summary. Returns `Content-Disposition: attachment`. The report builder UI sends the chosen `columns`.
- **Tests** (`src/test/...`, run `mvn test`): Mockito unit tests for `ActorService` (duplicate/stale/not-found/audit), `AuthService` (login paths), and `JwtService` (round-trip). No DB needed — they don't load a Spring context, so they stay fast and runnable anywhere. 10 tests, all green.

## DPAP-mobile (offline-first PWA)

Field data-collection app for enumerators, under `DPAP-mobile/`. **Vite + React 18 + TypeScript + Tailwind v4 + Dexie (IndexedDB) + vite-plugin-pwa (Workbox)** — a lightweight static SPA, the right tool for offline-first (not Next.js, which is server-centric; this matches the "developed as separate apps sharing the API contract" convention). Commands from `DPAP-mobile/`: `npm run dev`, `npm run build` (`tsc --noEmit && vite build`), `npm run preview`, `npm run lint`, `npm run test` (Vitest; engine/repo/pull against a fake IndexedDB), `npm run test:live` (integration against a running DPAP-api — opt-in via `DPAP_LIVE=1`), `npm run test:e2e` (Playwright/Chromium — builds + previews on `:4173`; sync-flow specs need DPAP-api up). Backend URL comes from `VITE_API_BASE_URL` (`.env.development` → `http://localhost:8080/api`; CORS for `:5173`/`:4173` is in the backend compose). Icons are generated solid-emerald PNGs + an SVG in `public/`.

- **Offline-first is the architecture, not a feature.** Every write lands in IndexedDB first (`src/db/db.ts` — `actors` + `outbox` + `meta` stores via Dexie) and is mirrored to the backend later. A **custom service worker** (`src/sw.ts`, vite-plugin-pwa `injectManifest`) precaches the app shell (opens with no network), runtime-caches OSM tiles (CacheFirst), and handles Background Sync. App **data is never HTTP-cached** — it lives in Dexie and syncs through the outbox.
- **Local-first write → queue → reconcile.** `src/db/actors-repo.ts` writes the local record and enqueues one outbox op per record (folding rules in its header: an edit/delete before a record ever syncs is folded into its pending CREATE). `src/sync/engine.ts` drains the outbox when online: CREATE/UPDATE/DELETE, with **conflict resolution by last-updated timestamp + server `version`** — a stale UPDATE (409) fetches the server copy and keeps the newer `updatedAt`, retrying once with the server version if the local copy wins. `markSynced` adopts the **full** authoritative server record over the local row (not just the envelope), so a server-wins conflict actually replaces the discarded local edit. It never throws; per-record state shows on the actor's `syncStatus` (PENDING/SYNCED/CONFLICT). `runSync({token?})` threads an explicit token so the SW can sync without the page. Verified end-to-end against the real Spring Boot + PostGIS backend (`test:live`: create → update/version-bump → delete). **Note:** the backend's Hibernate `@Version` starts at **0** on insert — the client's `version: 0` default for a new local record matches it.
- **Background Sync.** `src/sync/background-sync.ts` registers the `dpap-outbox` sync tag after each queued mutation (feature-detected; no-op on Safari/Firefox). The SW's `sync` handler replays the outbox via `runSync`, reading the token from IndexedDB (`src/auth/token-store.ts`) because localStorage is unavailable in a worker — `auth/session.ts` mirrors the token there on login/logout. The in-page reconnect sync (`useSync`: `online` event + interval + the manual `SyncBar` button) is the universal fallback. **`useSync` is mounted only inside `AuthenticatedApp`** (not at the top of `App`) so its first sync runs with a token in hand — mounting it pre-auth fired a tokenless pull that 401'd and never retried after login.
- **Server → device pull (delta sync).** `src/sync/pull.ts` (`pullChanges`) fetches `GET /actors/changes` since the stored watermark (`meta.pullSince`), page by page, and upserts records into Dexie as SYNCED — keyed by server id, matched by `serverId`. **Local-first is preserved:** a row with un-synced work (PENDING/CONFLICT) is never clobbered. `useSync.syncNow()` pushes the outbox then pulls; this runs on login, reconnect, interval, and the manual button. `serverToLocalFields()` (`src/sync/server-record.ts`) is the single server→local mapper shared by push (`markSynced`) and pull. Limitation: no tombstones, so a pull can't learn of server-side deletes (would need a `deletedAt` feed).
- **Conflict review.** A record left `CONFLICT` by the engine (a create that the server rejected as a duplicate) is surfaced for human resolution: `ActorList` shows a count banner, and `ActorForm` shows a red banner with the reason + guidance. Resolution reuses existing actions — edit a field to disambiguate and **Guardar** (re-queues; a record with no `serverId` re-attempts a CREATE) or **Eliminar** (discards locally). Stale UPDATE conflicts are auto-resolved server-wins and don't need review.
- **Same constraints as the web app.** No hardcoded strings — all copy in `src/i18n/pt.ts` (single source of truth, `{placeholder}` via `format()`), read through `dict` from `src/i18n`. Domain codes (`src/domain/enums.ts`) and the Maputo hierarchy (`src/domain/location.ts`) mirror DPAP-web / the backend exactly (the wire contract). **Duplicate avoidance** reuses the same identityKey + bigram logic (`src/lib/duplicate.ts`), run against IndexedDB in the capture form (debounced; hard-block on exact, warn on similar). Validation is centralized and localized in `src/lib/validate-actor.ts`. GPS capture (lat/lon/accuracy/timestamp) is in `src/lib/gps.ts`; accuracy/timestamp are local-only metadata (not in the backend contract). The session JWT is persisted in `localStorage` (single-user field device) so the app stays usable offline; the backend remains the authoritative auth boundary.
- **Tests.** Vitest + `fake-indexeddb` (`src/**/*.test.ts`): the sync engine (CREATE/duplicate/offline, UPDATE both conflict directions, DELETE, token threading, ordering), the repo (outbox folding, on-device duplicate detection), and pull (insert/update/skip-pending/watermark/paging) — plus the opt-in live integration (`DPAP_LIVE=1`). Playwright E2E (`e2e/*.spec.ts`, real Chromium): service-worker registration, install manifest, **offline app-shell reload** (precache), GPS capture (emulated geolocation), online capture→sync, **offline→reconnect sync**, and pull-on-login. Test files + `src/sw.ts` are excluded from the app `tsc` (DOM lib); Vitest is scoped to `src/`, Playwright to `e2e/`.
- **Not yet done:** server-side delete tombstones (so pulls can prune deleted records), and multi-locale (the app is pt-only today).

## What this system is

A digital, georeferenced registry of actors in **agriculture, livestock, fisheries, and aquaculture** for the Government of Mozambique's Direcção Provincial de Agricultura e Pescas (DPAP), **Maputo Province**. Three components:

- **`DPAP-web/`** — centralized web management platform (auth, dashboards, GIS maps, actor CRUD, reporting/export, audit trail, admin).
- **`DPAP-api/`** — Spring Boot + PostgreSQL/PostGIS backend (REST, JWT auth, the actor/dashboard endpoints).
- **`DPAP-mobile/`** — offline-first field data-collection PWA used by enumerators in rural areas with no connectivity (capture → outbox push + delta pull + Background Sync + conflict review, verified by unit/live/E2E tests).

## Architecture decisions that span multiple files

These are the load-bearing constraints. Treat them as fixed unless the user says otherwise.

- **Offline-first is the defining constraint, not a feature.** The mobile app must function fully with zero internet. It is a **PWA** (not React Native unless explicitly justified) using **IndexedDB via Dexie.js** for local storage and **Service Workers** for offline operation. Do **not** use SQLite on the client. Every data-entry flow must assume the network is absent and sync later.

- **Sync model: local-first write, queue, reconcile.** All changes are written locally first and queued as pending records. Sync runs automatically when connectivity returns (Background Sync API where supported) and via a manual sync button. **Conflict resolution uses last-updated-timestamp + server versioning** — any record schema must carry these fields, and the server API must expose them.

- **Stack.** Frontend/web: Next.js + TypeScript + Tailwind. Maps: **Leaflet + OpenStreetMap** (no paid map providers — recurring licensing cost is a hard constraint). Backend: Spring Boot. DB: **PostgreSQL 16 + PostGIS**. Auth: JWT (or Keycloak), role-based. Deployment: Docker + Docker Compose, targeting a **local government server** (not a commercial cloud).

- **Three roles everywhere:** Administrator, Editor, Read-only Viewer. Authorization is role-based and must be enforced server-side, not just in the UI.

- **Audit trail is mandatory** on data-mutating actions: user, action, timestamp, affected record.

- **Actor data model is a normalized relational schema** with a central `actor` entity specialized into 12 actor types (Producers, Producer Associations, Livestock Producers, Fisheries, Aquaculture, NGOs, International Orgs, Cooperation Agencies, Research/Educational Institutions, Private Companies, Public Institutions). Location is a hierarchy: Province → District → Administrative Post → Locality, plus GPS (lat, lon, timestamp, accuracy). See `docs/REQUIREMENTS.md` → "DATA TO BE COLLECTED" for the full field set.

## Non-negotiable context constraints

Every design and implementation choice is judged against the deployment reality in rural Mozambique:

- **Portuguese is the default language.** UI copy, reports, and seed data (district/post/locality names) are Portuguese-first.
- **Low bandwidth, intermittent power, limited connectivity, Android 8+ devices.** Optimize payload sizes, degrade gracefully, and never assume a stable connection or a modern high-end device.
- **Open-source only, minimal recurring cost.** Avoid any dependency that introduces licensing fees or mandatory paid cloud services.
- **Scale targets:** 10,000+ actors, 300 concurrent users.

## Conventions

- Keep the two components in their respective top-level directories; they are deployed together via Docker Compose but developed as separate apps sharing the backend API contract.
- When adding the API that both the web app and the mobile sync layer consume, keep the sync-relevant fields (version, updated-at) first-class in the contract — both clients depend on them.
