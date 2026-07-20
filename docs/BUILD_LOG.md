# GPT-5.6 and Codex Build Log

This log records how ApplyProof was shaped and built with GPT-5.6 and Codex. It is intentionally concrete: each entry identifies the human decision, the work Codex accelerated, and how the result was verified.

Use this document as source material for the README, Devpost description, and demo-video narration. Do not paste private prompts, hidden reasoning, secrets, or personal candidate data here.

Entries are chronological decision records. When a later entry explicitly says it supersedes an earlier workflow, the later entry and the current design documents define product behavior; the older entry remains only to show how the design evolved.

## Working method

For every meaningful milestone, record:

- **Goal:** what we were trying to accomplish
- **Human decision:** the product, engineering, or design choice made by the builder
- **Codex contribution:** planning, implementation, testing, debugging, research, or validation accelerated by Codex
- **Why GPT-5.6 helped:** the reasoning or semantic task for which the model was useful
- **Verification:** commands, tests, screenshots, or manual checks proving the result
- **Artifacts:** relevant files and commit hash

## Entries

### 2026-07-18 — Product scope and demo-first roadmap

**Goal:** turn a broad Chrome-extension concept into a project that can be completed and demonstrated reliably during the hackathon.

**Human decision:** build one controlled Northstar Labs application flow using the fictional Maya Chen profile, then polish it before adding resume parsing or broad ATS compatibility.

**Codex contribution:** inspected the initial empty repository, read the complete implementation plan, identified the strongest product narrative, reduced the first release to a vertical demo slice, and wrote the initial README and milestone roadmap.

**Why GPT-5.6 helped:** the planning task required synthesizing product scope, browser safety, model boundaries, test requirements, judging presentation, and implementation order into one coherent sequence.

**Verification:** reviewed the generated documentation for consistency and ran `git diff --check`.

**Artifacts:** `README.md`, `docs/ROADMAP.md`, `docs/BUILD_LOG.md`, and `docs/SUBMISSION_CHECKLIST.md`.

### 2026-07-18 — Phase 1 demo foundation

**Goal:** create a runnable foundation across the Chrome extension, controlled job application, shared contracts, and backend API.

**Human decision:** keep Phase 1 keyless and local, make the mock application comprehensive enough for later safety and scanning tests, and reserve actual profile data and generation behavior for their planned milestones.

**Codex contribution:** scaffolded the npm workspace and Python service; implemented the Manifest V3 side-panel shell, responsive Northstar Labs application, Zod contracts, FastAPI health endpoint, shared quality scripts, and baseline tests; then debugged lint boundaries and verified the rendered application in a browser.

**Why GPT-5.6 helped:** the implementation required keeping browser permissions, accessible form semantics, future field-detection fixtures, cross-language contracts, and demo presentation quality aligned while building three surfaces at once.

**Verification:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass. Five baseline tests cover the extension workflow shell, complete mock form, shared schemas, and API response. A browser inspection confirmed 18 inputs, four textareas, one select, two fieldsets, no horizontal overflow, and no console errors. A live request to `/health` returned the expected success payload. The built extension contains a valid MV3 manifest, side-panel entry point, and service worker; unpacked installation and toolbar-click behavior remain pending manual Chrome verification.

**Artifacts:** root workspace configuration, `apps/extension`, `apps/web-demo`, `apps/api`, `packages/shared-types`, `.env.example`, `README.md`, and `docs/ROADMAP.md`.

### 2026-07-18 — Phase 2 page scanning

**Goal:** understand the controlled Northstar Labs application accurately while excluding sensitive fields and unrelated page content.

**Human decision:** make scanning explicitly user-initiated, limit persistent host access to the two local demo origins, inject the scanner only into the active tab, keep the returned payload limited to normalized field metadata, and group radio buttons into one application question rather than exposing implementation-level controls.

**Codex contribution:** implemented native and practical ARIA control detection, prioritized accessible-label extraction, field normalization, a conservative sensitive-field denylist, on-demand Chrome messaging, the side-panel inventory, page highlighting and jump behavior, error and empty states, and unit plus controlled-form integration coverage.

**Why GPT-5.6 helped:** the milestone required reconciling accessibility semantics, browser permission boundaries, sensitive-data filtering, radio-group normalization, extension packaging, and a compact demo UI without expanding into Phase 3 autofill behavior.

**Verification:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass. Thirteen TypeScript tests plus one API test pass overall; the scanner integration test detects 18 of 18 intended safe mock fields, confirms every field has a useful label, groups both radio fixtures, retains character limits and select options, and excludes the password fixture. A browser-bridge regression test confirms scanning still proceeds when Chrome provides an active tab ID but withholds its URL. Chrome inspection confirmed the live Northstar form exposes the expected accessible controls. Reloading the unpacked extension and manually repeating scan plus jump-to-field remains the final human UI recheck after this build.

**Artifacts:** `apps/extension/src/scanner.ts`, `apps/extension/src/content.ts`, `apps/extension/src/browser.ts`, the Phase 2 side-panel UI and tests, `packages/shared-types`, `README.md`, and `docs/ROADMAP.md`.

### 2026-07-18 — Phase 3 trusted profile and safe autofill

**Goal:** replace the developer-oriented field inventory workflow with a profile-first experience that fills verified data in one action and focuses the user on exceptions.

**Human decision:** require a selected trusted profile before autofill; combine scan and deterministic fill into one primary action; keep resume upload deferred until the controlled demo is stable; preserve existing values; never fill demographics, work authorization, or legal confirmation; and move raw field metadata into optional details.

**Codex contribution:** updated the roadmap around the revised workflow; added a schema-validated Maya Chen profile with evidence records; implemented deterministic classification and mappings, page-safe value insertion, existing-value protection, profile inspection, an outcome summary, and an exception-only review queue; then used live Chrome inspection to find and fix repeated content-script injection that unit DOM tests did not expose.

**Why GPT-5.6 helped:** the work required translating product intent into a coherent state model across profile trust, browser scanning, deterministic mappings, high-risk decisions, UI prioritization, and extension messaging while preserving the boundaries planned for grounded generation in Phase 4.

**Verification:** formatting, linting, type checking, tests, and production builds pass. Twenty-two TypeScript tests plus one API test cover the profile fixture, profile-gated UI, 11 deterministic Northstar mappings, existing-value protection, demographic and legal skips, review routing, blocked-field counts, page insertion, browser messaging, and repeated-injection prevention. The controlled-form integration test confirms all 11 safe mappings fill while work authorization, demographics, and final confirmation remain empty. After rebuilding and reloading the unpacked extension, the builder completed the profile selection and Scan & Autofill workflow in Chrome without errors and accepted the Phase 3 behavior.

**Artifacts:** `packages/sample-data`, shared profile and fill contracts, `apps/extension/src/autofill.ts`, `apps/extension/src/pageFill.ts`, the revised side-panel UI, browser messaging tests, `README.md`, and `docs/ROADMAP.md`.

### 2026-07-18 — Post-demo workflow design

**Goal:** simplify the safe-autofill workflow before expanding from the controlled demo to personal data and real application sites.

**Human decision:** use one editable applicant profile instead of a profile picker; use only `Filled` and `Needs review` for eligible fields, without a second internal taxonomy for blocked, skipped, missing, or unsupported states; exclude denied sensitive fields from the workflow entirely; remember reusable user-confirmed answers by canonical meaning and scope; and introduce online support through tested site pilots rather than claiming universal ATS compatibility.

**Codex contribution:** inspected the Phase 2 scanner, Phase 3 deterministic mappings, extension permissions, result states, and roadmap; explained which behavior currently relies on sensitive-field regexes versus fixed demo-field IDs; reduced the proposed state model to two outcomes with plain-language review explanations; and translated the discussion into sequenced roadmap deliverables, acceptance criteria, README workflow documentation, and explicit website-support boundaries.

**Why GPT-5.6 helped:** the design required aligning a simple user experience with privacy boundaries, semantic field matching, durable versus time-dependent answers, legal confirmations, least-privilege browser access, and an incremental ATS compatibility strategy.

**Verification:** reviewed the documentation against the current implementation so completed Phase 3 behavior remains labeled as current and the newly agreed behavior remains unchecked future work; ran formatting and diff checks for the changed Markdown files.

**Artifacts:** `README.md`, `docs/ROADMAP.md`, and `docs/BUILD_LOG.md`.

### 2026-07-18 — Grounded answer generation design

**Goal:** turn the Phase 4 open-ended-question concept into an implementable, evidence-first workflow with one API contract across keyless demo and live AI modes.

**Human decision:** keep every eligible field in the same two-outcome model; leave AI drafts as `Needs review` until the user explicitly inserts them; show evidence, notes, and character count without answer statuses or confidence scores; return no draft when evidence is insufficient; remember confirmed reusable facts rather than complete company-specific answers; and keep the provider API key exclusively on the backend.

**Codex contribution:** wrote the answer-generation design covering question strategies, evidence and claim rules, review-card behavior, FastAPI request and response shapes, deterministic validation, fixture and live providers, memory and privacy policies, failure behavior, tests, implementation order, and acceptance criteria; then synchronized the README, roadmap, build log, and submission checklist.

**Why GPT-5.6 helped:** the design required reconciling truthful generation, a deliberately minimal state model, data minimization, character and context constraints, reusable candidate memory, reliable keyless judging, and a production-safe provider boundary.

**Verification:** checked current provider guidance for the Responses API, Structured Outputs, and server-side API-key management; reviewed the design against the existing scanner, profile fixtures, shared contracts, and two-outcome workflow decision; then ran Markdown formatting, repository format checks, link checks, and `git diff --check`.

**Artifacts:** `docs/ANSWER_GENERATION_DESIGN.md`, `README.md`, `docs/ROADMAP.md`, `docs/BUILD_LOG.md`, and `docs/SUBMISSION_CHECKLIST.md`.

### 2026-07-18 — Phase 4 grounded answer review implementation

**Goal:** turn the approved evidence-first design into a complete keyless demo path with an optional production-safe live provider.

**Human decision:** support three useful Northstar drafts from confirmed Maya evidence, keep the AI-workflow answer empty until the user confirms reusable facts, and require a separate user action before exact-text insertion.

**Codex contribution:** replaced the placeholder answer taxonomy with shared request and response contracts; added selective evidence routing, deterministic Northstar fixtures, provider-independent validation, the FastAPI endpoint, and an OpenRouter Responses API provider with Structured Outputs and `store: false`; then built editable evidence review cards, character checks, follow-up confirmation, regeneration, existing-value protection, and explicit insertion.

**Why GPT-5.6 helped:** the work required keeping the TypeScript and Pydantic contracts aligned while translating truthfulness rules into deterministic validation, safe failure behavior, provider parity, and a compact two-outcome review experience.

**Verification:** repository formatting, linting, TypeScript and Python type checks, unit and integration tests, and production builds pass. Tests cover three grounded fixture answers, missing AI evidence, duplicate and unavailable evidence IDs, unsafe claim rejection, server-side OpenRouter credentials and strict JSON Schema requests, selective evidence, review-before-fill state transitions, exact-text insertion, and existing-value preservation. The builder reloaded the unpacked extension and verified the three-answer review and insertion workflow in Chrome.

**Artifacts:** shared answer contracts; Maya evidence fixture; `apps/api/app/contracts.py`, `providers.py`, and `validation.py`; the `/v1/answer-drafts` route; extension evidence selection, API client, review UI, and tests; `.env.example`; `README.md`; and `docs/ROADMAP.md`.

### 2026-07-19 — Page-native autofill and inline answer workflow

**Goal:** remove the split between the application page and side-panel review cards so the primary workflow happens where the user is completing the form.

**Human decision:** one Scan & Autofill action should fill all explicitly saved profile values, select mapped checkboxes, and generate blank open-ended answers directly on the page. Hovering or focusing an open-ended field should reveal Regenerate and an optional instruction. The side panel should contain only profile controls, the primary action, and compact progress; it should not contain an outcome summary, review queue, field inventory, or submission-boundary copy.

**Supersedes:** the 2026-07-18 decisions that required separate review cards, explicit Fill answer insertion, a two-outcome side-panel queue, unfilled demographics, work-authorization review, and a manual accuracy confirmation. Those entries remain above as historical records of the design evolution, not the current specification.

**Codex contribution:** added isolated Shadow DOM assistants beside textareas; automatic first generation for blank fields; optional regeneration prompts; native-setter page insertion with React-compatible events; status synchronization; and side-panel simplification. Extended the profile contract with required work authorization and gender choices, mapped them deterministically, added true checkbox selection for the accuracy confirmation, and retained the rule that Continue, Next, and Submit are never clicked.

**Evidence decision:** AI-workflow questions now receive a conservative starting draft from resume project, experience, skills, testing, and accessibility evidence. They no longer require a `confirmed-ai-workflow` record or a follow-up profile-memory flow. Optional instructions may choose evidence or emphasis but are not factual evidence themselves.

**Verification:** extension, web-demo, shared-type, sample-data, and API tests pass alongside formatting, linting, type checks, and production builds. Browser testing confirmed inline assistants mount on the live demo fields and generated values reach framework-managed inputs.

**Artifacts:** `apps/extension/src/inlineAssistant.ts`, content/browser messaging, autofill and page-fill logic, profile schemas and fixtures, side-panel UI, provider instructions, tests, `README.md`, `docs/ANSWER_GENERATION_DESIGN.md`, and `docs/ROADMAP.md`.

### 2026-07-19 — Provider and character-limit hardening

**Goal:** make live generation reliable when providers reject strict schemas, quotas are exhausted, or ATS character limits are not represented by a simple native attribute.

**Human decision:** support fixture, OpenRouter, and Gemini during development; allow switching through `.env`; keep credentials server-side; and automatically regenerate once when a provider returns a draft longer than the live field limit.

**Codex contribution:** diagnosed a Gemini 429 free-tier quota failure and an OpenRouter 400 caused by strict JSON Schema missing `additionalProperties: false`; corrected the provider schema; added server-side exception logging; documented that `.env` changes require a full API restart; and verified a real OpenRouter structured response end to end.

The scanner now recognizes native `maxlength`, common custom data attributes, `aria-describedby`, and nearby helper text. The inline assistant refreshes the live limit before every request. The API accepts limits from 1–20,000 characters, recalculates returned length, and retries one over-limit draft with an explicit maximum. A real 100-character OpenRouter test returned a 71-character accepted draft.

**Verification:** automated tests cover strict provider schemas, optional prompts, live limit refresh, helper-text parsing, and over-limit retry. Repository formatting, linting, TypeScript/Python type checks, all tests, and production builds pass.

**Artifacts:** scanner and inline assistant limit handling, shared and Pydantic contracts, answer endpoint retry logic, provider contracts and logging, API tests, and the synchronized design documentation.

### 2026-07-19 — Remove the standalone audit phase

**Goal:** keep the roadmap focused on the page-native autofill and answer-review experience that matters for the demo.

**Human decision:** remove the planned claim-verification, readiness-score, and final-application-audit phase. Grounded generation, evidence constraints, live character-limit handling, and user review remain part of the current workflow; a separate audit surface is not required.

**Codex contribution:** removed the standalone audit milestone and related MVP promises, renumbered Hackathon polish and Post-demo productization as Phases 5 and 6, and synchronized the README and roadmap.

**Verification:** ran Markdown formatting, repository format checks, terminology searches, and `git diff --check`.

**Artifacts:** `README.md`, `docs/ROADMAP.md`, and `docs/BUILD_LOG.md`.

### 2026-07-19 — Put product expansion before submission polish

**Goal:** make the roadmap order match the intended build and submission sequence.

**Human decision:** complete the editable profile, answer memory, page-native workflow, and validated site-support work before investing in the final demo, video, and submission polish.

**Codex contribution:** moved Product workflow expansion to Phase 5, moved Submission and demo polish to Phase 6, removed the contradictory “post-demo” wording, and synchronized the README and submission checklist.

**Verification:** ran Markdown formatting, repository format checks, phase-order terminology searches, and `git diff --check`.

**Artifacts:** `README.md`, `docs/ROADMAP.md`, `docs/SUBMISSION_CHECKLIST.md`, and `docs/BUILD_LOG.md`.

### 2026-07-19 — Phase 5A persistent My Profile foundation

**Goal:** begin product workflow expansion by replacing the demo-only profile picker with one applicant-owned profile that survives side-panel restarts.

**Human decision:** store one schema-validated `My Profile` in Chrome local extension storage; make Maya a seeding action for that same profile; require explicit Canadian work-authorization and gender choices, including `Prefer not to say`; and keep profile management in the compact side panel.

**Codex contribution:** added versioned profile storage and the Manifest V3 storage permission; built create, inspect, edit, save, demo-seed, and local-reset states; connected the persisted profile to deterministic autofill and inline answer evidence; preserved stable evidence identifiers while editing unchanged evidence; and added migration-focused UI and storage tests.

**Why GPT-5.6 helped:** the change required coordinating schema validation, browser persistence, form accessibility, existing autofill behavior, evidence continuity, privacy controls, and the removal of the old profile-selection state without weakening the no-overwrite and no-submit boundaries.

**Verification:** repository formatting, linting, TypeScript and Python type checks, all tests, production builds, and `git diff --check` pass. Extension tests verify empty storage, validated save/load, malformed-data rejection, key-scoped reset, automatic returning-user readiness, Maya seeding, profile edits affecting subsequent deterministic fills, and local deletion. Reloading the unpacked extension remains the final manual Chrome check.

**Artifacts:** extension manifest; `apps/extension/src/profileStorage.ts`, `ProfileEditor.tsx`, `App.tsx`, styles, and tests; shared profile choices; `README.md`; `docs/ROADMAP.md`; and `docs/SUBMISSION_CHECKLIST.md`.

### 2026-07-19 — Phase 5B page-native workflow hardening

**Goal:** complete the page-native workflow guarantees before expanding to online application pilots.

**Human decision:** keep the side panel limited to profile management, the user-initiated Scan & Autofill action, and progress; allow only country-scoped, high-confidence remembered answers to join deterministic profile fills; preserve all existing page values; and enforce character limits without taking navigation or submission actions.

**Codex contribution:** added a separate schema-validated reusable-answer store with canonical keys, source, confirmation time, scope, and time-dependence metadata; implemented conservative Canadian work-authorization equivalence mapping; preserved the existing live character-limit pipeline across custom attributes, ARIA descriptions, helper text, the extension, and the API; and strengthened regression coverage for the page-native safety boundaries.

**Why GPT-5.6 helped:** the work required distinguishing safe semantic equivalence from broad field guessing while coordinating browser metadata extraction, local privacy boundaries, option polarity, cross-language request contracts, provider retries, and deterministic rejection behavior.

**Verification:** automated coverage confirms country-scoped reuse, no cross-country reuse, existing-value preservation, sensitive values absent from scan results, navigation and submission controls excluded from scanning, live character-limit discovery, API retry, and final over-limit rejection. Repository formatting, linting, type checks, tests, production builds, and diff checks pass; manual unpacked-extension verification remains pending.

**Artifacts:** shared remembered-answer contracts; extension storage, autofill, scanner, evidence, and inline-assistant code and tests; API contracts, retry, validation, and tests; `README.md`; `docs/ANSWER_GENERATION_DESIGN.md`; and `docs/ROADMAP.md`.

### 2026-07-19 — Keep application limits character-only

**Goal:** keep the supported limit behavior aligned with the actual Northstar demo and current product scope.

**Human decision:** support character limits only. Word-limit parsing and enforcement are not required for the current workflow.

**Codex contribution:** removed the word-limit fields and logic from the shared contracts, scanner, inline assistant, API retry and validation layers, fixtures, tests, roadmap, and design documentation while preserving all character-limit behavior.

**Verification:** formatting, linting, type checks, tests, production builds, and diff checks pass after the removal.

**Artifacts:** shared contracts; extension scanner, evidence, and inline-assistant code; API contracts, retry, and validation code; Northstar fixture; tests; `README.md`; `docs/ANSWER_GENERATION_DESIGN.md`; and `docs/ROADMAP.md`.

### 2026-07-19 — Local Word and PDF resume import

**Goal:** let an applicant seed or update `My Profile` from a resume without sending the source file to a server.

**Human decision:** support Word `.docx` and text-based `.pdf` files up to 10 MB; keep extraction entirely inside the extension; make every extracted value editable before save; and never infer work authorization, gender, relocation, or other explicit application choices from resume text. Legacy `.doc` and scanned image-only PDF OCR remain out of scope.

**Codex contribution:** integrated Mammoth and PDF.js behind an on-demand browser bundle; implemented multi-page text extraction, file validation, deterministic profile and evidence parsing, editable merge behavior, progress and error states, and regression coverage for DOCX/PDF routing, cleanup, parser safety, and UI updates. A test exposed an email-domain/portfolio collision, which was fixed by excluding URL candidates embedded in email addresses.

**Why GPT-5.6 helped:** resume extraction required balancing imperfect document text order, conservative field recognition, evidence usefulness, privacy boundaries, browser-extension bundle size, accessibility, and explicit-choice safety without introducing a backend upload workflow.

**Verification:** extension type checks, parser and import tests, UI workflow tests, and production builds pass. The parser libraries are loaded only after file selection, keeping the main side-panel bundle small. Full repository verification and manual unpacked-extension testing are recorded before milestone completion.

**Artifacts:** `apps/extension/src/resumeImport.ts`, `resumeTextParser.ts`, `ProfileEditor.tsx`, styles and tests; extension dependencies; `README.md`; and `docs/ROADMAP.md`.

### 2026-07-19 — Expand parsed profile structure

**Goal:** correct the first resume-import model after testing it with real profile expectations.

**Human decision:** remove the headline field; store LinkedIn separately from portfolio/GitHub; support multiple education records and multiple work-experience records; and treat location as city/region rather than an arbitrary comma-containing resume line.

**Codex contribution:** migrated the shared profile schema while retaining compatibility with previously saved single-education profiles; rebuilt the Profile editor with repeatable education and experience cards; added LinkedIn; updated deterministic autofill to use primary education; reconstructed PDF lines from text coordinates before parsing; narrowed name and header-location recognition; and parsed repeated education and experience sections into editable records.

**Why GPT-5.6 helped:** the correction required connecting UI feedback to underlying schema limitations, document-coordinate behavior, migration safety, repeated-section parsing, autofill compatibility, and conservative location extraction rather than patching individual labels.

**Verification:** tests cover legacy profile migration, coordinate-based PDF name reconstruction, separate LinkedIn extraction, city/region extraction, two education records, two work-experience records, editable imported fields, and explicit-choice non-inference. Full repository checks and the production extension build pass before completion.

**Artifacts:** shared profile contracts; Maya fixture; extension profile editor, parser, PDF import, autofill, styles, and tests; `README.md`; and `docs/ROADMAP.md`.

### 2026-07-19 — Align profile setup with common ATS questions

**Goal:** make profile creation more direct and model education, work authorization, and voluntary self-identification as the separate questions applicants commonly encounter.

**Human decision:** defer OCR; replace the extra create-then-import step with direct `From resume` and `From scratch` entry points; add education start dates; split Canadian legal work eligibility from current-or-future sponsorship; and group optional gender, race/ethnicity, disability, LGBTQ+, and veteran or military-service choices without inferring them.

**Codex contribution:** reviewed Greenhouse's official Job Board field model, including separate education start/end dates and optional configurable compliance/demographic questions; migrated legacy combined authorization values; expanded the profile editor and Northstar fixture; added semantic mappings for supported questions; and taught page filling to match visible ATS option labels even when underlying values are opaque IDs.

**Why GPT-5.6 helped:** the change required coordinating applicant UX, sensitive-data boundaries, legacy migration, country-scoped answer memory, ATS option semantics, resume extraction, deterministic filling, and test fixtures rather than adding isolated form controls.

**Verification:** automated tests cover direct resume entry, education start dates, separate eligibility and sponsorship, optional voluntary fields, legacy migration, semantic demographic mapping, opaque ATS option values, country scoping, and the expanded Northstar workflow. Full repository verification and production builds pass before completion.

**Artifacts:** shared profile contracts; extension profile editor, storage, parser, autofill, page filling, and tests; Northstar demo form; sample data; `README.md`; roadmap, answer design, submission checklist, and build log.

### 2026-07-19 — Local resume storage and AI extraction

**Goal:** retain the applicant's original resume for later application uploads and improve structured profile import without adding OCR.

**Human decision:** keep one original `.docx` or text-based `.pdf` in local IndexedDB; let `My resume file` replace or delete only that document; make `Import resume` update both the editable profile and saved original; send only locally extracted text—not the original binary—to the configured AI provider; and keep OCR out of scope.

**Codex contribution:** added IndexedDB binary storage and metadata management; a strict shared extraction schema with source-review metadata; a FastAPI extraction endpoint for fixture, OpenRouter, and Gemini providers; deterministic fallback when AI is unavailable; editable import review; and user-initiated attachment of the saved file to supported ordinary resume upload fields without navigation or submission.

**Verification:** automated tests cover file persistence, reconstruction, replacement, deletion, isolation from profile data, import-on-save behavior, strict provider requests, fallback extraction, ordinary upload attachment, existing-file protection, and no-submit boundaries. Formatting, linting, type checks, complete test suites, production builds, and diff checks pass before commit.

**Artifacts:** shared extraction contracts; API contracts, endpoint, providers, and tests; extension resume storage, extraction client, import, attachment, profile UI, browser messaging, tests, `README.md`, and `docs/ROADMAP.md`.

### 2026-07-20 — Phase 5C online-form compatibility baseline

**Goal:** begin online-application support without broadening extension access or advertising an untested ATS integration.

**Human decision:** preserve user-initiated `activeTab` injection with no persistent online-site host permission; validate common semantic HTML patterns before selecting a named ATS; use only bounded question-container text as classification metadata; and keep iframes and complex site-owned widgets explicitly unsupported until a site pilot proves them.

**Codex contribution:** extended normalized field metadata with names, `autocomplete`, input types, and bounded surrounding question text; added conservative semantic mappings for common identity, contact, location, link, education, availability, relocation, and Canadian authorization questions; applied the sensitive-field denylist to the new context signal; added opaque-ID and client-rendered-step compatibility fixtures; added a least-privilege manifest regression test; and documented the supported-site and capability matrices with pilot exit criteria.

**Why GPT-5.6 helped:** the work required balancing broader semantic recognition against false-positive autofill, sensitive-data exclusion, minimum page access, generated ATS identifiers, dynamic form behavior, and evidence strong enough to distinguish a compatibility baseline from an advertised integration.

**Verification:** `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check` pass. The extension suite now has 65 passing tests, including ordinary semantic HTML, later-step rescanning, sensitive context blocking, active-tab injection, no persistent online host access, existing-value protection, and no-submit behavior. The ordinary HTML fixture remains a local compatibility baseline; no named online ATS is marked supported.

**Artifacts:** shared normalized-field contract; extension scanner and autofill classifier; compatibility, scanner, and manifest tests; `docs/SITE_COMPATIBILITY.md`; `README.md`; and `docs/ROADMAP.md`.

### 2026-07-20 — Fix online-tab access from the side panel

**Goal:** make the least-privilege online-tab workflow actually inject ApplyProof after the user clicks its toolbar action.

**Human decision:** keep temporary `activeTab` access instead of adding persistent online host permissions or `<all_urls>`.

**Codex contribution:** reproduced the failure on a normal Workable HTTPS application and confirmed that no ApplyProof content script reached the page; traced the failure to Chrome's automatic `openPanelOnActionClick` path not emitting `action.onClicked`; replaced it with an explicit action listener that receives the temporary tab grant and then opens the side panel for that tab; and added a regression test for the background event flow.

**Verification:** the Workable page showed no scanner marker before the fix. Automated verification covers the explicit `action.onClicked` registration, disabled automatic panel behavior, tab-specific `sidePanel.open`, unchanged local-only persistent host permissions, and absence of `<all_urls>`.

**Artifacts:** extension background service worker, manifest regression test, and build log.

### 2026-07-20 — Grounded cover letters and complete local resume evidence

**Goal:** fix oversized ATS character-limit failures, keep internal validation details out of the page, and make cover letters use both job context and resume sections that do not fit the editable Profile schema.

**Human decision:** support cover-letter textareas as grounded open-ended answers; require job-description context; ask the user to paste the JD when safe page extraction cannot find it; retain extracted resume text locally after an explicit import and save; and continue sending only selected text evidence rather than the original document binary.

**Codex contribution:** reproduced Workable's `maxlength="200000"` behavior; capped live limits at the 20,000-character API boundary; replaced raw schema errors with stable user-facing messages; added bounded `JobPosting` and explicit-container job extraction; implemented the manual-JD inline fallback; stored extracted resume text beside the original IndexedDB file; selected relevant project and other resume lines into evidence records; expanded provider guidance and fixture behavior for cover letters; and added privacy disclosures and regression coverage across the extension and API.

**Why GPT-5.6 helped:** the change required coordinating ATS-specific HTML behavior, page privacy, local binary and derived-text lifecycle, prompt-injection boundaries, evidence validation, provider contracts, inline UX, and the distinction between job context and candidate claims.

**Verification:** `npm run format:check`, Ruff format checks, linting, type checks, all 107 tests, production builds, and `git diff --check` pass. Tests cover a 200,000-character Workable-style field, friendly validation failure, structured and visible JD extraction, manual cover-letter JD input, skipped automatic generation without JD, local extracted-text persistence and replacement, project evidence selection, strict evidence IDs, grounded fixture cover letters, and safer recognition of saved-resume upload controls.

**Artifacts:** shared answer and page-scan contracts; extension job-context extraction, resume storage, evidence selection, inline assistant, drafting client, profile UI, and tests; API contracts, provider instructions, validation, and tests; README, answer design, roadmap, site matrix, and build log.

## Entry template

Copy this section for the next milestone:

```markdown
### YYYY-MM-DD — Milestone name

**Goal:**

**Human decision:**

**Codex contribution:**

**Why GPT-5.6 helped:**

**Verification:**

**Artifacts:**
```

## Moments worth capturing for the video

Capture short clips or screenshots as the work happens:

1. Codex narrowing the original plan to a demo-first roadmap.
2. Codex implementing a complete vertical slice across extension, demo page, and API.
3. A test or browser check finding a real issue.
4. The human choosing between tradeoffs suggested by Codex.
5. Codex fixing the issue and re-running verification.

The final video should use these as brief supporting evidence. The working ApplyProof demo remains the main subject.
