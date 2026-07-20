# ApplyProof Roadmap

This roadmap turns the product plan into a demo-first build sequence. Every milestone must leave the project in a runnable, explainable state.

## How to track progress

- Mark a deliverable `[x]` when its implementation exists.
- Mark an acceptance criterion `[x]` only after it has been tested or manually verified.
- A phase is complete only when all of its deliverables and acceptance criteria are checked.
- Add verification details to `docs/BUILD_LOG.md` before closing a phase.
- If scope changes, update this roadmap instead of silently skipping an item.

### Progress summary

| Phase                             | Status      |
| --------------------------------- | ----------- |
| 1. Demo foundation                | Complete    |
| 2. Page scanning                  | Complete    |
| 3. Demo profile and safe autofill | Complete    |
| 4. Inline grounded answers        | Complete    |
| 5. Product workflow expansion     | In progress |
| 6. Submission and demo polish     | Not started |

## Definition of the first demo

A judge can install the unpacked extension, open the local Northstar Labs application, select the Maya Chen profile, run one Scan & Autofill action, see saved profile values and checkboxes filled, review generated open-ended answers on the page, add an instruction before regeneration, and confirm character limits are respected.

No account, personal resume, production deployment, or automatic submission is required.

## Phase 1 — Demo foundation

**Goal:** prove that all three application surfaces can run locally.

### Deliverables

- [x] Monorepo workspace and shared scripts
- [x] Manifest V3 extension shell
- [x] Chrome side panel with placeholder Profile, Analyze, Review, and Audit states
- [x] Northstar Labs mock application containing all target field types
- [x] FastAPI service with a health endpoint
- [x] Shared core data contracts
- [x] Environment example and setup instructions

### Acceptance criteria

- [x] The extension can be loaded unpacked in Chrome.
- [x] Clicking the extension opens the side panel.
- [x] The mock application runs locally and displays the complete demo form.
- [x] The API health endpoint returns successfully.
- [x] Linting, type checking, and baseline tests pass.

## Phase 2 — Page scanning

**Goal:** accurately understand the controlled demo form without collecting unrelated page content.

### Deliverables

- [x] Detection for `input`, `textarea`, `select`, radio groups, and practical custom controls
- [x] Label extraction using associated labels, parent labels, ARIA attributes, nearby text, then placeholders
- [x] Normalized field metadata
- [x] Sensitive-field denylist
- [x] Initial side-panel field inventory, later removed when the workflow moved onto the page
- [x] Page highlighting and jump-to-field behavior

### Acceptance criteria

- [x] At least 90% of intended mock fields are detected.
- [x] Every detected field has a useful label.
- [x] Password and other blocked fields are excluded.
- [x] Scanning sends normalized metadata rather than the full page.
- [x] Label extraction and normalization have unit tests.

## Phase 3 — Demo profile and safe autofill

**Goal:** let the user choose a trusted profile and fill all explicitly saved profile choices and mapped confirmations in one action.

### Deliverables

- [x] Maya Chen profile with resume-like evidence records
- [x] Profile selection, summary, and inspection UI
- [x] Combined Scan & Autofill primary action that requires a selected profile
- [x] Rule-based field classification for known demo fields
- [x] Deterministic mappings for identity, contact, education dates, links, location, relocation, availability, separate authorization/sponsorship, and voluntary self-identification
- [x] Real checkbox selection for the accuracy confirmation
- [x] Existing-value protection
- [x] Work authorization and voluntary self-identification sourced from explicit profile choices rather than inference
- [x] Compact side panel containing profile, Scan & Autofill, and progress only
- [x] Removal of the superseded outcome summary, review queue, and field inventory

### Acceptance criteria

- [x] Name, email, phone, school, education start/graduation dates, GitHub URL, and location map correctly.
- [x] Non-empty fields are not overwritten without confirmation.
- [x] Saved authorization, sponsorship, and supported voluntary choices autofill correctly.
- [x] Accuracy confirmation is checked through the real DOM property and framework events.
- [x] Filling occurs only after a user action.
- [x] Autofill cannot run until the user selects a profile.
- [x] Continue, Next, and Submit are not clicked.
- [x] Reload the unpacked extension and verify the complete workflow in Chrome.

## Phase 4 — Inline grounded answers

**Goal:** generate useful resume-based drafts in the application context and make review and regeneration immediate.

**Design:** follow [`docs/ANSWER_GENERATION_DESIGN.md`](ANSWER_GENERATION_DESIGN.md). The application page is the answer editor and source of truth; the side panel is not a review surface.

### Deliverables

- [x] Approved grounded answer generation design
- [x] Replace the placeholder answer-status schema with the approved request and response contracts
- [x] Lightweight evidence selection from structured candidate records
- [x] FastAPI `POST /v1/answer-drafts` endpoint and provider interface
- [x] Deterministic fixture provider for a reliable keyless demo
- [x] OpenRouter provider using the Responses API Beta, Structured Outputs, server-side credentials, and `store: false`
- [x] Answers tailored to the Northstar Labs role
- [x] Deterministic evidence-ID, claim, context, and character-limit validation
- [x] Shadow DOM inline assistants beside open-ended fields
- [x] Automatic first generation for blank textareas
- [x] Hover/focus Generate and Regenerate controls with optional instructions
- [x] Native page insertion with `input` and `change` events
- [x] Resume-based AI-workflow draft without a separate confirmation flow
- [x] Live limit detection from native, custom, ARIA, and helper-text constraints
- [x] One automatic provider retry when a draft exceeds the live character limit
- [x] Fixture, OpenRouter, and Gemini provider modes
- [x] Strict provider schema compatibility and server-side provider exception logging

### Initial questions

- Why are you interested in this role?
- Describe a relevant project.
- How do you use AI in your development workflow?
- What makes you a strong candidate?

### Acceptance criteria

- [x] Blank open-ended answers generate and insert directly after Scan & Autofill.
- [x] Every material generated answer cites candidate evidence.
- [x] Answers use the correct company and role names.
- [x] Known character limits are refreshed before generation and enforced with one retry.
- [x] Existing open-ended answers are not regenerated automatically.
- [x] Generated text remains editable on the page.
- [x] AI-workflow questions receive a conservative resume-based draft for review.
- [x] Optional instructions can select a resume project or emphasis without becoming evidence.
- [x] Fixture and OpenRouter modes return the same ApplyProof response contract.
- [x] The extension never receives the OpenRouter API key.
- [x] Reload the unpacked extension and verify inline generation and regeneration in Chrome.

## Phase 5 — Product workflow expansion

These items build on the stable controlled prototype and must be completed before final submission polish. The product workflow has been narrowed to one applicant-owned profile, page-native review instead of a side-panel queue, and gradual online-site support rather than a claim of universal ATS compatibility.

### 5A — Single editable profile and answer memory

- [x] Replace profile selection with one persistent `My Profile`
- [x] Add create, inspect, edit, save, and local reset controls for that profile
- [x] Keep “Load Maya demo data” as a demo seeding action, not a second selectable profile
- [x] Add Word (`.docx`) and PDF resume import with editable extraction results
- [x] Upgrade `Import resume` from regex-only parsing to hybrid deterministic plus AI extraction for text-based `.docx` and `.pdf` files; OCR remains explicitly out of scope
- [x] Extract existing document text and layout locally, then send only the extracted resume content—not the original file—to the configured server-side AI provider after clear user disclosure
- [x] Require AI resume extraction to return a strict JSON Schema covering identity, contact details, links, multiple education records, multiple work-experience records, and evidence
- [ ] Validate AI-extracted email addresses, URLs, dates, record boundaries, duplicates, and required fields with deterministic rules before showing results
- [x] Preserve source text and confidence or review metadata for extracted fields so uncertain values are visibly reviewable rather than silently accepted
- [x] Keep all AI-extracted profile values editable and require review before save
- [x] Return a clear unsupported-file message when a PDF has no readable text layer instead of attempting OCR
- [x] Persist one original Word or PDF resume file locally in extension-owned IndexedDB; never upload it to the ApplyProof API or model provider
- [x] Retain locally extracted resume text for grounded writing so unmapped project and detail sections remain usable as selected evidence
- [x] Add a `My resume file` area to `My Profile` showing the saved filename, type, size, and last-updated time
- [x] Let the user delete or replace the saved resume file; deleting it must not delete or change extracted profile fields
- [x] Keep saved-file replacement separate from profile import: uploading in `My resume file` only replaces the local original and never parses, merges, or changes other profile data
- [x] Make `Import resume` the explicit parse-and-update action: it updates editable profile fields from the selected resume and also replaces the locally saved original file
- [x] Support separate LinkedIn and portfolio links, multiple education entries, and work experience
- [x] Store authorization and sponsorship as two explicit answers; keep demographic answers optional with `Prefer not to say`
- [ ] Separate stable profile facts from reusable application preferences
- [x] Store reusable answers under scoped canonical keys such as `work_authorization.canada.authorized` and `.sponsorship`
- [x] Record the answer source, confirmation time, and applicable country or scope
- [x] Reuse a saved answer only when the new question maps to the same canonical meaning with high confidence
- [ ] Re-review time-dependent preferences such as start date, salary, and relocation when context changes
- [x] Never remember or autofill passwords, verification codes, government identifiers, or financial data
- [ ] Add local privacy controls for viewing, editing, exporting, and deleting saved data

### 5B — Page-native field workflow

- [x] Keep the side panel limited to profile controls, Scan & Autofill, and progress
- [x] Treat profile facts and high-confidence remembered answers as eligible for user-initiated autofill
- [x] Keep generated open-ended answers editable in their application fields
- [x] Generate grounded cover letters from job-description context and saved resume evidence, with a manual JD fallback when page extraction is unavailable
- [x] Let a user explicitly attach the locally saved resume to supported application file-upload controls, with a manual fallback for unsupported custom uploaders or cross-origin iframes
- [x] Preserve existing page values unless the user explicitly regenerates an open-ended answer
- [x] Exclude denied sensitive fields from scanning without collecting or recording their values
- [x] Detect character limits across supported ATS implementations
- [x] Keep Continue, Next, and Submit as user actions

### 5C — Online application pilot

- [x] Preserve least-privilege, user-initiated access to the active application tab
- [ ] Validate ordinary online HTML forms before claiming third-party site support
- [ ] Pilot one selected ATS, then add platforms individually using regression fixtures
- [x] Improve semantic field classification using labels, names, IDs, autocomplete metadata, types, options, and surrounding question text
- [ ] Add more robust accessible custom-control, dynamic-form, multi-step, and iframe support
- [x] Document an explicit supported-site matrix and known limitations
- [x] Do not claim universal ATS support without compatibility evidence

### 5D — Operational readiness

- [x] Field-classification compatibility fixtures
- [ ] Model-provider configuration, observability, cost controls, and failure handling
- [ ] Security and privacy review
- [ ] Chrome Web Store readiness

### Acceptance criteria

- [x] Returning users can autofill without selecting a profile on every application.
- [x] Editing `My Profile` changes subsequent deterministic fills.
- [x] A saved work-authorization answer fills semantically equivalent questions within its recorded country scope.
- [x] Existing page values are never silently overwritten.
- [x] Denied sensitive fields have no workflow result and no captured value.
- [x] Mapped confirmations may be checked, while navigation and submission remain manual.
- [ ] A saved resume survives a browser restart and remains confined to the extension's local IndexedDB until the user replaces, deletes, resets, or uninstalls the extension.
- [x] Replacing a file through `My resume file` leaves every other profile value unchanged.
- [x] Importing through `Import resume` both replaces the saved original and updates the editable parsed profile.
- [ ] AI resume import produces schema-valid, editable results for representative single-column and multi-column text-based Word/PDF fixtures without using OCR.
- [x] The original resume binary remains local during AI parsing; only disclosed extracted content reaches the ApplyProof API and configured model provider.
- [ ] Invalid, missing, duplicated, or low-confidence AI fields are rejected or marked for review before profile save.
- [x] Deleting the saved original leaves existing parsed profile data intact and prevents resume attachment until another file is saved.
- [x] Resume attachment remains user-initiated and never submits the application.
- [ ] Each advertised online site passes a repeatable scan, fill, inline-review, and no-submit test.

## Phase 6 — Submission and demo polish

**Goal:** package the completed product workflow into a clear, reliable submission and judging experience.

### Deliverables

- [ ] Cohesive visual design and status language
- [ ] Loading, empty, error, and offline states
- [ ] Seed/reset demo controls
- [ ] Automated unit and integration coverage for the critical path
- [ ] Fresh-machine setup validation
- [ ] Three-minute demo script and backup recording
- [ ] Architecture and model-usage documentation
- [ ] Final repository, video, and Devpost submission checks

### Acceptance criteria

- [ ] The full demo completes without editing source code or supplying personal data.
- [ ] Resetting restores the initial demo state.
- [ ] The primary path works repeatedly in a clean Chrome profile.
- [ ] A new contributor can follow the README to run all services.
- [ ] The final product workflow fits within the three-minute demo.
- [ ] Repository, video, and submission links pass the final checklist.

## Explicit non-goals for the hackathon

- Automatic application submission
- Automatic job discovery
- Universal ATS support
- Applicant tracking dashboard
- LinkedIn scraping
- Email automation
- Cover-letter documents
- Authentication, billing, or recruiter analytics
- Full vector-search infrastructure

## Suggested build order within each phase

Prefer a thin end-to-end behavior over isolated layers. For example, Phase 2 should first scan one text input and show it in the side panel, then expand field coverage. Phase 4 should first generate one fully evidenced answer and insert it safely, then add the remaining questions.

At the end of every phase:

- run formatter, linter, type checker, unit tests, and relevant integration tests;
- manually repeat the demo path;
- update the README if commands or behavior changed;
- add a dated entry to `docs/BUILD_LOG.md` describing the human decisions and Codex contribution;
- save a short screenshot or clip when the milestone demonstrates a useful Codex-assisted planning, implementation, debugging, or verification moment;
- record known limitations; and
- create one descriptive milestone commit.
