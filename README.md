# ApplyProof

ApplyProof is a Chrome extension that helps people complete job applications with answers grounded in their actual resume and candidate profile.

Traditional autofill handles contact details. Generic AI can write polished answers, but may exaggerate or invent experience. ApplyProof combines the speed of autofill with visible evidence, conservative answer generation, and a final accuracy audit.

> **Project status:** Phase 1 foundation implemented. The local extension shell, mock application, shared contracts, and API are ready for the scanning milestone.

## The idea

ApplyProof should help an applicant:

1. Load a resume or demo profile.
2. Open a job application.
3. Detect and classify its form fields.
4. Fill confirmed personal information deterministically.
5. Draft open-ended answers using only relevant candidate evidence.
6. Review evidence, confidence, and warnings before inserting an answer.
7. Audit the application for missing fields, inconsistencies, unsupported claims, and length violations.

ApplyProof never submits an application automatically.

## Product principles

- **Evidence before eloquence.** Material claims must trace back to the resume, profile, or an explicit user answer.
- **Deterministic when possible.** Names, email addresses, dates, and direct profile mappings do not need a language model.
- **Human review for high-risk answers.** Work authorization, salary, legal consent, demographic information, and similar questions remain under the user's control.
- **No silent invention.** Missing or ambiguous information is marked `needs_review` or `unsupported`.
- **No surprise overwrites.** Existing non-empty fields are preserved unless the user confirms a replacement.
- **No automatic submission.** The user inspects and submits the final application.
- **Minimum page access.** Only normalized form metadata and relevant job context should leave the page.

## Hackathon demo

The first goal is one reliable, polished workflow—not universal support for every applicant tracking system.

The demo uses:

- **Candidate:** Maya Chen, a fictional new-grad software engineer
- **Company:** Northstar Labs
- **Role:** Junior Software Engineer
- **Environment:** a local mock application and unpacked Chrome extension

### Target demo flow

1. Open the Northstar Labs mock application.
2. Open the ApplyProof side panel and choose Maya's demo profile.
3. Scan the page and show detected fields.
4. Autofill verified fields such as name, email, education, and GitHub URL.
5. Generate at least three open-ended answers with concise evidence excerpts.
6. Flag an injected claim such as “I led a team of ten engineers” as unsupported.
7. Leave work authorization marked `needs_review`.
8. Run a transparent readiness audit.

The demo is successful when a judge can complete this flow locally without an account or personal data.

## MVP scope

### Included

- Chrome Manifest V3 extension with a side panel
- Local mock job application
- Built-in fictional candidate profile and evidence records
- Detection of common inputs, textareas, selects, radio buttons, and accessible labels
- Deterministic mapping for confirmed profile fields
- Safe insertion with existing-value protection
- Grounded answers for open-ended questions
- Evidence, warnings, confidence, and editable answer previews
- Sensitive-field blocking and high-risk review states
- Unsupported-claim checks
- Rule-based final application audit

### Deferred until the demo works

- Resume PDF upload and extraction
- Broad third-party ATS compatibility
- Authentication or multi-user persistence
- Automatic job discovery or submission
- LinkedIn scraping
- Application tracking
- Cover-letter generation
- Payments
- Chrome Web Store publishing
- A vector database

## Planned architecture

```text
ApplyProof/
├── apps/
│   ├── extension/       # Manifest V3 extension and side-panel UI
│   ├── web-demo/        # Northstar Labs mock job application
│   └── api/             # FastAPI analysis and generation endpoints
├── packages/
│   ├── shared-types/    # Shared contracts and validation schemas
│   └── sample-data/     # Maya profile, evidence, and job fixture
├── docs/
│   ├── BUILD_LOG.md
│   ├── ROADMAP.md
│   └── SUBMISSION_CHECKLIST.md
└── README.md
```

Planned stack:

- **Extension and demo:** React, TypeScript, Vite, Zod, Vitest
- **Backend:** Python 3.12, FastAPI, Pydantic, pytest
- **Browser platform:** Chrome Manifest V3 and Side Panel API
- **Model integration:** structured outputs for semantic classification, evidence selection, answer generation, and claim verification

The demo should remain useful without a model key where practical. Deterministic fields, safety behavior, scanning, and auditing should still work, while sample generated answers may be supplied as fixtures for presentation reliability.

## Answer statuses

| Status         | Meaning                                            | Automatic fill                        |
| -------------- | -------------------------------------------------- | ------------------------------------- |
| `verified`     | Directly mapped to confirmed candidate information | Allowed after user initiates autofill |
| `generated`    | Drafted from cited candidate evidence              | Only after preview and user action    |
| `needs_review` | Ambiguous, sensitive, time-dependent, or high-risk | Never                                 |
| `unsupported`  | Information is missing or a claim lacks evidence   | Never                                 |

## Safety boundaries

ApplyProof must not:

- click a final Submit button;
- accept legal terms;
- automatically answer optional demographic questions;
- fill passwords, government identifiers, payment fields, banking fields, or security questions;
- make legal or immigration conclusions;
- send unrelated page content to the backend; or
- expose hidden prompts or model reasoning.

## Roadmap

Development follows a demo-first sequence:

1. **Foundation:** runnable extension shell, API health endpoint, and mock application.
2. **Scan:** detect and normalize fields on the mock page.
3. **Safe autofill:** load Maya's profile and fill verified fields without overwriting values.
4. **Grounded answers:** prepare evidence-backed open-ended answers for review.
5. **Verification and audit:** detect unsupported claims and calculate application readiness using transparent rules.
6. **Demo polish:** improve UI, resilience, documentation, and the three-minute presentation.
7. **Post-demo expansion:** add resume parsing and carefully broaden site compatibility.

See [the detailed roadmap](docs/ROADMAP.md) for acceptance criteria and sequencing.

## How GPT-5.6 and Codex were used

ApplyProof is being planned and built collaboratively with Codex. We use GPT-5.6 for the work that benefits from broad reasoning and semantic understanding, while keeping product ownership and final decisions with the human builder.

### Where Codex accelerated the workflow

- Read the original long-form product plan and converted it into a narrower, judge-ready vertical slice.
- Inspected the new repository before proposing implementation work.
- Created the initial README and phased roadmap from the planning conversation.
- Made safety requirements—no automatic submission, no unsupported claims, and human review for high-risk questions—explicit acceptance criteria rather than informal intentions.
- Identified features that should be deterministic and moved expensive or risky features, such as broad ATS support and vector search, after the demo milestone.

As implementation progresses, this section will be updated with concrete examples of code generation, debugging, test creation, browser verification, and design iteration.

### Key decisions made by the human builder

- Build the controlled demo first, then polish it before expanding scope.
- Position ApplyProof around truthfulness and visible evidence, not generic form filling.
- Keep applicants in control of generated, sensitive, and legal answers.
- Optimize the hackathon build for one coherent end-to-end experience.

### How we preserve evidence of the collaboration

- Maintain a dated [build and decision log](docs/BUILD_LOG.md).
- Use milestone commits so the repository history shows how the project evolved.
- Record representative Codex planning, implementation, testing, and browser-validation moments for the demo video.
- Run `/feedback` in the primary Codex project task after the majority of core functionality has been built, then place that Session ID in the Devpost submission form.

The `/feedback` Session ID is submission metadata and does not need to be published in this README.

## Development approach

Each milestone should be a small, demonstrable vertical slice:

1. Inspect the current implementation.
2. Define the milestone's narrow acceptance criteria.
3. Implement the smallest complete behavior.
4. Add or update tests.
5. Run formatting, linting, type checks, and tests.
6. Record limitations and follow-up work.
7. Commit the milestone separately.

We prioritize a dependable demo, conservative behavior, and clear evidence over feature count.

## Getting started

### Prerequisites

- Node.js 20 or newer and npm 10 or newer
- Python 3.12 or newer
- Google Chrome 116 or newer for the Side Panel API

### Install

```bash
npm install
python3 -m venv .venv
.venv/bin/pip install -e 'apps/api[dev]'
cp .env.example .env
```

### Run the local surfaces

Use a separate terminal for each process:

```bash
npm run dev:web
npm run dev:extension
npm run dev:api
```

- Mock application: `http://localhost:5173`
- API health check: `http://127.0.0.1:8000/health`
- API documentation: `http://127.0.0.1:8000/docs`

For Chrome, build the extension with `npm run build --workspace @applyproof/extension`, open
`chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select
`apps/extension/dist`. Click the ApplyProof toolbar action to open its side panel.

### Verify

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

The API scripts expect the project-local `.venv` created by the install steps. The extension and
mock application contain no model dependency or secrets in Phase 1.

Before submitting, use the [hackathon submission checklist](docs/SUBMISSION_CHECKLIST.md).

## License

License to be decided before public distribution.
