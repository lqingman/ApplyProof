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
| 1. Demo foundation                | In progress |
| 2. Page scanning                  | Not started |
| 3. Demo profile and safe autofill | Not started |
| 4. Grounded answer review         | Not started |
| 5. Claim verification and audit   | Not started |
| 6. Hackathon polish               | Not started |
| 7. Post-demo productization       | Deferred    |

## Definition of the first demo

A judge can install the unpacked extension, open the local Northstar Labs application, select the Maya Chen profile, scan the form, fill safe fields, inspect three grounded answers, see one unsupported claim rejected, review a high-risk field, and run a final audit.

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

- [ ] The extension can be loaded unpacked in Chrome.
- [ ] Clicking the extension opens the side panel.
- [x] The mock application runs locally and displays the complete demo form.
- [x] The API health endpoint returns successfully.
- [x] Linting, type checking, and baseline tests pass.

## Phase 2 — Page scanning

**Goal:** accurately understand the controlled demo form without collecting unrelated page content.

### Deliverables

- [ ] Detection for `input`, `textarea`, `select`, radio groups, and practical custom controls
- [ ] Label extraction using associated labels, parent labels, ARIA attributes, nearby text, then placeholders
- [ ] Normalized field metadata
- [ ] Sensitive-field denylist
- [ ] Side-panel field inventory
- [ ] Page highlighting and jump-to-field behavior

### Acceptance criteria

- [ ] At least 90% of intended mock fields are detected.
- [ ] Every detected field has a useful label.
- [ ] Password and other blocked fields are excluded.
- [ ] Scanning sends normalized metadata rather than the full page.
- [ ] Label extraction and normalization have unit tests.

## Phase 3 — Demo profile and safe autofill

**Goal:** make the deterministic half of the product excellent before adding model behavior.

### Deliverables

- [ ] Maya Chen profile with resume-like evidence records
- [ ] Profile summary and inspection UI
- [ ] Rule-based field classification for known demo fields
- [ ] Deterministic mappings for identity, contact, education, links, location, relocation, and availability
- [ ] Existing-value protection
- [ ] Explicit skip behavior for demographic and high-risk fields

### Acceptance criteria

- [ ] Name, email, phone, school, degree, graduation date, GitHub URL, and location map correctly.
- [ ] Non-empty fields are not overwritten without confirmation.
- [ ] Optional demographics remain unfilled.
- [ ] Work authorization is visibly marked `needs_review`.
- [ ] Filling occurs only after a user action.

## Phase 4 — Grounded answer review

**Goal:** demonstrate useful AI assistance without hiding uncertainty or evidence.

### Deliverables

- [ ] Lightweight evidence selection from structured candidate records
- [ ] Structured answer-generation contract
- [ ] Answers tailored to the Northstar Labs role
- [ ] Character-limit enforcement
- [ ] Review cards showing answer, status, evidence excerpts, confidence, warnings, edit, and fill actions
- [ ] Deterministic fixture mode for a reliable keyless demo

### Initial questions

- Why are you interested in this role?
- Describe a relevant project.
- How do you use AI in your development workflow?
- What makes you a strong candidate?

### Acceptance criteria

- [ ] At least three answers can be reviewed and inserted.
- [ ] Every material generated answer cites candidate evidence.
- [ ] Answers use the correct company and role names.
- [ ] Character limits are respected.
- [ ] Generated text is never inserted without user review and action.
- [ ] Missing evidence produces `needs_review` or `unsupported`, not fabrication.

## Phase 5 — Claim verification and application audit

**Goal:** make truthfulness and review—not text generation—the memorable feature.

### Deliverables

- [ ] Material-claim extraction and evidence checks
- [ ] Conservative replacement suggestions
- [ ] Unsupported leadership and numerical-impact test cases
- [ ] Checks for blank required fields, length violations, context mismatches, conflicting values, repeated generic answers, and review-required fields
- [ ] Transparent rule-based readiness score
- [ ] Issue list with jump-to-field actions

### Acceptance criteria

- [ ] “I led a team of ten engineers” is flagged when the profile does not support it.
- [ ] Invented metrics and technologies are flagged.
- [ ] Supported technical claims pass.
- [ ] Missing required fields and length violations reduce readiness predictably.
- [ ] The UI explains every deduction from the readiness score.

## Phase 6 — Hackathon polish

**Goal:** make the complete story easy to understand and difficult to break during judging.

### Deliverables

- [ ] Cohesive visual design and status language
- [ ] Loading, empty, error, and offline states
- [ ] Seed/reset demo controls
- [ ] Automated unit and integration coverage for the critical path
- [ ] Fresh-machine setup validation
- [ ] Three-minute demo script and backup recording
- [ ] Architecture and model-usage documentation

### Acceptance criteria

- [ ] The full demo completes without editing source code or supplying personal data.
- [ ] Resetting restores the initial demo state.
- [ ] The primary path works repeatedly in a clean Chrome profile.
- [ ] A new contributor can follow the README to run all services.
- [ ] The demo fits within three minutes.

## Phase 7 — Post-demo productization

These items begin only after the controlled demo is stable:

- [ ] Plain-text and PDF resume import with editable extraction results
- [ ] Persistent profiles and local privacy controls
- [ ] Compatibility testing against selected ATS platforms
- [ ] More robust accessible custom-control support
- [ ] Evaluation datasets for classification and claim verification
- [ ] Model-provider configuration, observability, cost controls, and failure handling
- [ ] Security and privacy review
- [ ] Chrome Web Store readiness

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
