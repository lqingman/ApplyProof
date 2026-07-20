# ApplyProof Inline Answer Generation Design

**Status:** Implemented controlled demo

**Roadmap milestone:** Phase 4, revised after browser workflow testing

**Last updated:** 2026-07-19

## Purpose

ApplyProof completes deterministic application fields from a saved candidate profile and drafts open-ended answers from resume evidence. The primary interaction happens on the application page so the user can review and edit answers in their real context.

The extension may fill fields and check mapped checkboxes after the user clicks **Scan & Autofill**. It never clicks Continue, Next, or Submit.

## Final product decisions

1. One user action starts scanning, deterministic autofill, checkbox selection, and first-draft generation for blank open-ended fields.
2. Open-ended drafts are generated directly into the application page, not into side-panel review cards.
3. Hovering or focusing an open-ended field reveals an inline ApplyProof assistant with an optional instruction and a Generate or Regenerate action.
4. A user instruction may select a resume project, emphasis, or tone. It is an instruction, not evidence for a new factual claim.
5. The user reviews and edits the generated text in the application field itself.
6. The side panel contains only profile selection, Scan & Autofill, and compact progress text. It does not duplicate an outcome summary, review queue, or field inventory.
7. Canadian work eligibility and sponsorship are separate required profile choices. Voluntary self-identification answers are optional; every stored value is explicit and may be `Prefer not to say`.
8. The accuracy-confirmation checkbox is checked during autofill. Navigation and submission remain manual.
9. Existing page values are preserved during deterministic autofill. Regeneration replaces an open-ended answer only after the user explicitly clicks Regenerate.
10. Provider keys remain on the FastAPI server.

## User workflow

```text
Select saved profile
        |
        v
Click Scan & Autofill
        |
        +--> Scan eligible fields and character constraints
        |
        +--> Fill saved profile values and mapped checkboxes
        |
        +--> Mount inline assistants beside open-ended fields
        |
        +--> Generate drafts for blank open-ended fields
        |
        v
Review and edit answers on the application page
        |
        +--> Hover/focus a field
        +--> Add an optional instruction
        +--> Regenerate in place
        |
        v
User manually continues or submits
```

The side panel does not become a second editing surface. Page-native inputs remain the source of truth after insertion.

## Profile-driven deterministic fields

The controlled profile contains stable identity, contact, education, links, availability, work authorization, and demographic choices.

Current Northstar mappings include:

- identity and contact fields;
- education and portfolio fields;
- start date and relocation preference;
- `work-authorization` from `profile.workAuthorization.canada.authorized`;
- `sponsorship` from `profile.workAuthorization.canada.sponsorship`;
- `gender` from `profile.demographics.genderIdentity`;
- supported race/ethnicity, disability, LGBTQ+, and veteran questions from their explicit demographic values;
- `accuracyConfirmation`, checked after the user initiates autofill.

Profile schemas require separate work-eligibility and sponsorship choices. Gender, race/ethnicity, disability, LGBTQ+, and veteran or military-service values are optional. ApplyProof does not infer any of these answers from a name, identity field, or resume, and self-described responses remain manual.

Checkbox filling sets the real DOM `checked` property and dispatches `input` and `change` events so React and ATS forms observe the update.

## Open-ended field detection and inline UI

The current inline workflow targets scanned `textarea` fields.

After scanning, the content script mounts an isolated Shadow DOM assistant beside each open-ended field. The assistant is visible when the field is hovered or focused and contains:

- ApplyProof identity and grounded-profile context;
- an optional extra-instruction textarea;
- Generate or Regenerate;
- progress, evidence-source, follow-up, or provider-error text.

On the first scan, every blank open-ended field starts generation automatically. A field with an existing answer is never automatically regenerated.

Generated text is written through the native input setter, followed by bubbling `input` and `change` events. This updates both the visible field and framework-managed form state.

## Evidence selection

Candidate claims should be supported by profile evidence whenever possible. Job context supports company, role, and requirement alignment but is not candidate evidence.

Known demo questions use deterministic strategies:

| Question class   | Preferred resume evidence                                  |
| ---------------- | ---------------------------------------------------------- |
| Motivation       | Product interest plus a relevant project                   |
| Relevant project | Relevant project record                                    |
| Strengths        | Education, experience, and skills                          |
| AI workflow      | Project, co-op, skills, testing, and accessibility records |

AI-workflow questions no longer require a separate `confirmed-ai-workflow` record. ApplyProof produces a conservative resume-based starting draft and asks the user to review and personalize it. It avoids inventing named AI tools, usage frequency, or results not present in the profile.

When the user supplies an extra instruction, the request may include up to twenty verified profile evidence records so the provider can follow instructions such as “use the campus map project.” The backend still rejects returned evidence IDs that were not supplied.

## Character-limit handling

Character constraints are enforced at three layers.

### 1. Scan-time discovery

The scanner reads limits from:

- native `maxlength`;
- custom attributes such as `data-maxlength`, `data-max-length`, `data-character-limit`, and `aria-maxlength`;
- `aria-describedby` text;
- nearby helper text such as “Maximum 500 characters” or “250 character limit.”

### 2. Generate-time refresh

Every Generate or Regenerate action re-reads the current field rather than relying only on the initial scan. This supports dynamic ATS forms that reveal or change a limit after interaction.

The live value is sent as `field.maxCharacters`. Supported API limits are 1–20,000 characters.

### 3. Backend validation and retry

The backend recalculates the returned draft length. If the provider exceeds the known limit, ApplyProof retries once with an explicit instruction containing the exact maximum and asks it to retain only the strongest grounded details.

If the second result is still too long, validation returns an empty draft and an explanatory note. The content script does not insert an over-limit result.

## Additional prompt behavior

The optional inline prompt is sent as `additionalPrompt`, trimmed, and limited to 1,000 characters.

It may guide:

- which resume project to use;
- which skill or experience to emphasize;
- concision or tone;
- how to structure the answer.

It must not be treated as verified evidence for quantities, employers, technologies, achievements, legal status, or other candidate facts.

## API boundary

```text
Chrome page/content script
        |
        | APPLYPROOF_GENERATE_INLINE_DRAFT
        v
Extension side panel
        |
        | POST /v1/answer-drafts
        v
FastAPI validation layer
        |
        +--> FixtureProvider
        +--> OpenRouterProvider
        +--> GeminiProvider
```

The page does not receive provider credentials. The side panel builds the request from the selected profile, job context, field metadata, live limit, and optional instruction.

## Request contract

`POST /v1/answer-drafts`

```json
{
  "field": {
    "id": "project",
    "question": "Describe a relevant project.",
    "maxCharacters": 500
  },
  "job": {
    "company": "Northstar Labs",
    "role": "Junior Software Engineer",
    "requirements": [
      "React",
      "TypeScript",
      "accessibility",
      "automated testing"
    ]
  },
  "evidence": [
    {
      "id": "project-campus-map",
      "category": "project",
      "text": "Built an accessible campus navigation app with React, TypeScript, and FastAPI.",
      "source": "Demo resume · Projects"
    }
  ],
  "additionalPrompt": "Emphasize the accessibility decisions."
}
```

`additionalPrompt` and `maxCharacters` are optional.

## Response contract

```json
{
  "fieldId": "project",
  "draft": "I built an accessible campus navigation app using React and TypeScript.",
  "evidenceIds": ["project-campus-map"],
  "notes": [],
  "followUpQuestion": null,
  "characterCount": 71,
  "fitsLimit": true
}
```

The backend, not the model, calculates `characterCount` and `fitsLimit`.

## Providers

### Fixture mode

Fixture mode is deterministic and requires no network key. It supports the controlled Northstar questions and remains useful for unit tests and offline demos.

### OpenRouter mode

OpenRouter mode uses the server-side Responses API with `store: false` and strict JSON Schema output. `ProviderDraft` forbids additional properties so its generated schema includes `additionalProperties: false`, which strict OpenRouter requests require.

Environment variables:

```env
ANSWER_GENERATION_MODE=openrouter
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

Changing `.env` requires a full API process restart; Uvicorn file reload does not re-import changed environment variables.

### Gemini mode

Gemini mode uses the OpenAI-compatible Chat Completions endpoint with structured output. A 429 means the configured project or model quota is exhausted. Provider exceptions are logged server-side while the extension receives a safe drafting-unavailable note.

Environment variables:

```env
ANSWER_GENERATION_MODE=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
```

## Validation

The backend validates every provider result:

1. The returned field ID matches the request.
2. Every evidence ID was supplied by the extension.
3. Company names do not drift to another employer.
4. Leadership, numerical, and technology claims are supported.
5. Character count is recalculated.
6. A known character limit is respected, with one retry when needed.
7. Invalid structured output is rejected.

Resume-based process answers may conservatively describe review, testing, and verification practices, but should not introduce named tools, frequencies, or results unsupported by the profile.

## Failure behavior

| Failure                                   | Behavior                                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| API unavailable                           | Keep the page value unchanged and show a retryable inline error                           |
| Missing provider key                      | Log the server configuration error and show drafting unavailable                          |
| Provider timeout, quota, or network error | Preserve page text and show drafting unavailable                                          |
| Invalid structured output                 | Reject it and preserve page text                                                          |
| First result exceeds a known limit        | Retry once with the exact live limit                                                      |
| Second result exceeds the limit           | Return no draft and show the limit note                                                   |
| Evidence is insufficient                  | Return a conservative resume-based draft when possible; otherwise show a focused question |
| Existing deterministic value              | Preserve it during Scan & Autofill                                                        |
| Existing open-ended value                 | Do not auto-generate; allow explicit Regenerate                                           |

## Privacy and submission boundary

- Provider keys stay in `.env` or a deployment secret manager.
- OpenRouter requests set `store: false`.
- The extension sends only the selected profile evidence and current job context required for drafting.
- Production logs should contain exceptions and provider metadata, not raw resumes or generated drafts.
- ApplyProof never clicks Continue, Next, or Submit.

## Test coverage

Automated tests cover:

- deterministic profile mappings, including authorization, gender, and confirmation checkboxes;
- true DOM checkbox selection and framework events;
- inline assistant mounting, automatic first generation, regeneration, and existing-value preservation;
- optional prompt propagation and expanded evidence selection;
- native, custom-attribute, ARIA, and helper-text character limits;
- live-limit refresh immediately before generation;
- one backend retry for an over-limit provider result;
- strict provider schemas and evidence-ID validation;
- fixture, OpenRouter, and Gemini request shapes;
- production extension builds.

## Current acceptance criteria

- One Scan & Autofill action fills all mapped profile fields and checkboxes.
- Blank open-ended questions begin generating on the application page.
- Existing answers are not overwritten automatically.
- Hover or focus reveals an inline Regenerate control and optional instruction.
- Generated drafts are editable in the real application field.
- AI-workflow questions receive a resume-based draft rather than requiring a profile follow-up flow.
- Known character limits are sent to the provider and enforced with one retry.
- Work authorization, gender, and accuracy confirmation fill from the current profile/workflow rules.
- The side panel does not duplicate field summaries or review queues.
- Continue, Next, and Submit remain user actions.
