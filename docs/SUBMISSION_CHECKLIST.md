# OpenAI Build Week Submission Checklist

This checklist summarizes the requirements relevant to ApplyProof. The official Devpost page and rules remain the source of truth.

## Deadline and eligibility

- [ ] Submit by **July 21, 2026 at 5:00 PM Pacific Time**.
- [ ] Confirm every participant satisfies the official eligibility rules.
- [ ] Register or join the hackathon on Devpost.

## Project

- [ ] Build the project with Codex and GPT-5.6 during the submission period.
- [ ] Enter the category that best fits ApplyProof. Current recommendation: **Apps for Your Life** because it is a consumer tool for job applicants.
- [ ] Ensure the project installs and runs consistently as shown and described.
- [ ] Use only code, assets, data, libraries, and integrations we are authorized to use.
- [ ] Keep dated commits and this build log as evidence of work completed during the submission period.

## Repository

- [ ] Provide the repository URL.
- [ ] Make it public with an appropriate license, or share the private repository with `testing@devpost.com` and `build-week-event@openai.com`.
- [ ] Include complete setup instructions.
- [ ] Include sample data that avoids requiring a judge's personal resume.
- [ ] Include exact instructions for running the API, mock application, and unpacked Chrome extension.
- [ ] Document supported platforms and a low-friction test path.
- [ ] Link the inline answer generation design and distinguish fixture, OpenRouter, and Gemini modes.
- [ ] Explain how GPT-5.6 and Codex were used.
- [ ] Highlight where Codex accelerated implementation.
- [ ] Identify key human product, engineering, and design decisions.

## Demo video

- [ ] Keep the video under three minutes; judges do not have to watch beyond three minutes.
- [ ] Upload it as a publicly visible YouTube video.
- [ ] Include audio explaining what was built.
- [ ] Include audio explaining how both Codex and GPT-5.6 were used.
- [ ] Show the actual project working.
- [ ] Avoid unlicensed music, third-party copyrighted material, and unnecessary third-party trademarks.

### Recommended video allocation

- **0:00–0:20 — Problem and promise:** generic autofill is fast, but generated applications can become inaccurate; ApplyProof makes claims inspectable.
- **0:20–1:55 — Working demo:** load Maya data into `My Profile`, run Scan & Autofill, show separate eligibility/sponsorship, voluntary answers, and confirmation filled, review auto-generated answers on the page, add a project instruction, regenerate, and show a character limit being respected.
- **1:55–2:25 — Codex collaboration:** show short planning and implementation artifacts; explain how GPT-5.6 helped synthesize the roadmap and how Codex accelerated code, tests, and debugging.
- **2:25–2:50 — Technical design and impact:** deterministic mappings, inline Shadow DOM assistance, strict structured model outputs, live limit enforcement, and why page-native review is different.
- **2:50–2:58 — Closing:** “ApplyProof helps applicants move faster without losing control of the truth.”

Leave a small timing buffer rather than targeting exactly three minutes.

## Devpost form

- [ ] Add the project category.
- [ ] Add a clear project description explaining features and operation.
- [ ] Add the public YouTube demo URL.
- [ ] Add the repository URL and any judge-testing instructions.
- [ ] In the Codex task where most core functionality was built, run `/feedback` near the end of the build.
- [ ] Copy the resulting Codex Session ID into the Devpost submission form.
- [ ] Save a draft early and perform a final link/access check before submission.

## Final judge test

- [ ] Follow the README from a clean checkout.
- [ ] Confirm the sample profile requires no private data.
- [ ] Confirm `My Profile` can be created, edited, saved, reset, and seeded with Maya demo data.
- [ ] Confirm supported resume import produces editable profile data.
- [ ] Confirm the extension can be loaded unpacked in Chrome.
- [ ] Repeat the complete demo path at least twice.
- [ ] Verify no API keys, tokens, private prompts, or personal information are committed.
- [ ] Confirm the OpenRouter API key is read only by the FastAPI backend and never appears in the extension bundle, browser messages, logs, or demo recording.
- [ ] Confirm fixture mode completes the grounded-answer demo without an API key.
- [ ] Confirm Scan & Autofill fills saved profile values, separate eligibility/sponsorship answers, supported voluntary answers, and the accuracy checkbox.
- [ ] Confirm blank open-ended fields generate directly on the page and existing answers are preserved.
- [ ] Confirm hover/focus reveals the optional instruction and Regenerate control.
- [ ] Confirm native, helper-text, and live character limits are passed to generation and an over-limit result is retried once.
- [ ] Confirm AI-workflow answers use conservative resume evidence and remain editable by the user.
- [ ] Confirm reviewed reusable answers are remembered only by canonical meaning and scope.
- [ ] Confirm every advertised online site passes its compatibility test path.
- [ ] Confirm the side panel has no duplicated outcome summary, review queue, or field inventory.
- [ ] Confirm Continue, Next, and Submit are never clicked automatically.
- [ ] Confirm changing `.env` provider settings is followed by a full API restart.
- [ ] Confirm all links are accessible without the builder's logged-in session.
- [ ] Describe Northstar as the supported local demo; do not imply that unvalidated third-party ATS sites are supported.
- [ ] Confirm the demo and documentation show the completed editable-profile workflow rather than the superseded profile-selection prototype.
