import { useState } from "react";
import { mayaProfile } from "@applyproof/sample-data";
import type {
  AnswerDraftResponse,
  CandidateProfile,
  FillResult,
  NormalizedField,
} from "@applyproof/shared-types";

import { generateAnswerDraft } from "./answerApi";
import { planAutofill, type FieldDecision } from "./autofill";
import { fillActivePage, focusField, scanActivePage } from "./browser";
import { buildDraftRequest } from "./evidence";

type WorkflowStatus = "idle" | "working" | "complete" | "error";
type DraftState = {
  response?: AnswerDraftResponse;
  text: string;
  loading: boolean;
  error?: string;
};

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "ApplyProof could not complete the workflow. Try again.";
}

function applyFillResults(decisions: FieldDecision[], results: FillResult[]) {
  const byField = new Map(results.map((result) => [result.fieldId, result]));
  return decisions.map((decision): FieldDecision => {
    if (decision.action !== "fill") return decision;
    const result = byField.get(decision.field.id);
    if (result?.status === "filled") return decision;
    return {
      ...decision,
      action: "review",
      reason:
        result?.status === "skipped_existing"
          ? "Existing value was preserved. Review it before replacing."
          : "ApplyProof could not safely fill this field. Please complete it manually.",
    };
  });
}

export function App() {
  const [profileSelected, setProfileSelected] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile>(mayaProfile);
  const [fields, setFields] = useState<NormalizedField[]>([]);
  const [decisions, setDecisions] = useState<FieldDecision[]>([]);
  const [blockedCount, setBlockedCount] = useState(0);
  const [status, setStatus] = useState<WorkflowStatus>("idle");
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [followUpAnswers, setFollowUpAnswers] = useState<
    Record<string, string>
  >({});
  const [message, setMessage] = useState(
    "Choose a trusted profile before scanning this application.",
  );

  const reviewItems = decisions.filter((item) => item.action === "review");
  const filledCount = decisions.filter((item) => item.action === "fill").length;
  const skippedCount = decisions.filter(
    (item) => item.action === "skip",
  ).length;

  function selectProfile() {
    setProfileSelected(true);
    setMessage("Maya's verified profile is ready for safe autofill.");
  }

  function clearProfile() {
    setProfileSelected(false);
    setFields([]);
    setDecisions([]);
    setBlockedCount(0);
    setStatus("idle");
    setDrafts({});
    setFollowUpAnswers({});
    setMessage("Choose a trusted profile before scanning this application.");
  }

  async function handleAutofill() {
    if (!profileSelected) return;
    setStatus("working");
    setMessage("Scanning fields and applying verified profile data…");
    try {
      const scan = await scanActivePage();
      const plan = planAutofill(profile, scan.fields);
      const results = await fillActivePage(plan.fills);
      const completed = applyFillResults(plan.decisions, results);
      setFields(scan.fields);
      setBlockedCount(scan.blockedCount);
      setDecisions(completed);
      setStatus("complete");
      const filled = completed.filter((item) => item.action === "fill").length;
      const review = completed.filter(
        (item) => item.action === "review",
      ).length;
      setMessage(
        `Filled ${filled} verified fields. ${review} ${review === 1 ? "item needs" : "items need"} your attention.`,
      );
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
    }
  }

  async function handleFocus(field: NormalizedField) {
    try {
      await focusField(field.id);
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
    }
  }

  async function handleGenerate(field: NormalizedField) {
    setDrafts((current) => ({
      ...current,
      [field.id]: {
        ...current[field.id],
        text: current[field.id]?.text ?? "",
        loading: true,
      },
    }));
    try {
      const response = await generateAnswerDraft(
        buildDraftRequest(profile, field),
      );
      setDrafts((current) => ({
        ...current,
        [field.id]: { response, text: response.draft, loading: false },
      }));
    } catch (error) {
      setDrafts((current) => ({
        ...current,
        [field.id]: {
          ...current[field.id],
          text: current[field.id]?.text ?? "",
          loading: false,
          error: errorMessage(error),
        },
      }));
    }
  }

  async function handleFillAnswer(field: NormalizedField) {
    const text = drafts[field.id]?.text ?? "";
    if (!text.trim()) return;
    if (field.maxLength && text.length > field.maxLength) {
      setDrafts((current) => ({
        ...current,
        [field.id]: {
          ...current[field.id],
          error: "Shorten this answer before filling it.",
        },
      }));
      return;
    }
    let result: FillResult | undefined;
    try {
      [result] = await fillActivePage([{ fieldId: field.id, value: text }]);
    } catch (error) {
      setDrafts((current) => ({
        ...current,
        [field.id]: {
          ...current[field.id],
          error: errorMessage(error),
        },
      }));
      return;
    }
    if (result?.status !== "filled") {
      setDrafts((current) => ({
        ...current,
        [field.id]: {
          ...current[field.id],
          error:
            result?.status === "skipped_existing"
              ? "The page answer changed, so ApplyProof preserved it."
              : "This field is no longer available. Your reviewed text is preserved here.",
        },
      }));
      return;
    }
    setDecisions((current) =>
      current.map((decision) =>
        decision.field.id === field.id
          ? {
              ...decision,
              action: "fill",
              reason: "Inserted after your review.",
              value: text,
            }
          : decision,
      ),
    );
    setMessage(
      "Inserted the exact answer you reviewed. ApplyProof did not submit the form.",
    );
  }

  async function confirmFollowUp(field: NormalizedField) {
    const answer = followUpAnswers[field.id]?.trim();
    if (!answer) return;
    const updatedProfile: CandidateProfile = {
      ...profile,
      evidence: [
        ...profile.evidence.filter(
          (record) => record.id !== `confirmed-${field.id}`,
        ),
        {
          id: `confirmed-${field.id}`,
          category: "profile",
          text: answer,
          source: "My Profile · Confirmed answer",
        },
      ],
    };
    setProfile(updatedProfile);
    setDrafts((current) => ({
      ...current,
      [field.id]: { text: "", loading: true },
    }));
    try {
      const response = await generateAnswerDraft(
        buildDraftRequest(updatedProfile, field),
      );
      setDrafts((current) => ({
        ...current,
        [field.id]: { response, text: response.draft, loading: false },
      }));
    } catch (error) {
      setDrafts((current) => ({
        ...current,
        [field.id]: { text: "", loading: false, error: errorMessage(error) },
      }));
    }
  }

  return (
    <main className="panel-shell">
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">
          AP
        </span>
        <div>
          <p className="eyebrow">Evidence-first autofill</p>
          <h1>ApplyProof</h1>
        </div>
      </header>

      <section
        className={`profile-card ${profileSelected ? "is-selected" : ""}`}
        aria-labelledby="profile-heading"
      >
        <div className="profile-heading">
          <span className="avatar" aria-hidden="true">
            MC
          </span>
          <div>
            <p className="eyebrow">1 · Trusted profile</p>
            <h2 id="profile-heading">{profile.displayName}</h2>
            <p>{profile.headline}</p>
          </div>
          {profileSelected && <span className="selected-badge">Selected</span>}
        </div>

        {profileSelected ? (
          <>
            <div className="profile-facts">
              <span>{profile.identity.email}</span>
              <span>{profile.education.degree}</span>
              <span>{profile.evidence.length} evidence records</span>
            </div>
            <details className="profile-details">
              <summary>Inspect profile evidence</summary>
              <ul>
                {profile.evidence.map((record) => (
                  <li key={record.id}>{record.text}</li>
                ))}
              </ul>
            </details>
            <button
              className="text-button"
              type="button"
              onClick={clearProfile}
            >
              Change profile
            </button>
          </>
        ) : (
          <button
            className="secondary-button"
            type="button"
            onClick={selectProfile}
          >
            Use Maya demo profile
          </button>
        )}
      </section>

      <section className="scan-hero" aria-labelledby="autofill-heading">
        <div className="scan-heading">
          <span className="stage-number">2</span>
          <div>
            <p className="eyebrow">Application</p>
            <h2 id="autofill-heading">Scan &amp; Autofill</h2>
          </div>
        </div>
        <p className="scan-copy">
          Fill direct profile matches, preserve existing answers, and route
          sensitive decisions to review.
        </p>
        <button
          className="primary-button"
          type="button"
          onClick={handleAutofill}
          disabled={!profileSelected || status === "working"}
        >
          {status === "working"
            ? "Scanning & filling…"
            : status === "complete"
              ? "Run again"
              : "Scan & Autofill"}
        </button>
        <p
          className={`scan-status ${status === "error" ? "is-error" : ""}`}
          role="status"
        >
          <span aria-hidden="true">{status === "error" ? "!" : "✓"}</span>
          {message}
        </p>
      </section>

      {status === "complete" && (
        <>
          <section className="results" aria-labelledby="results-heading">
            <div className="inventory-heading">
              <div>
                <p className="eyebrow">Outcome</p>
                <h2 id="results-heading">Autofill summary</h2>
              </div>
              <span className="privacy-pill">User initiated</span>
            </div>
            <div className="result-grid">
              <div className="result-stat is-filled">
                <strong>{filledCount}</strong>
                <span>Safely filled</span>
              </div>
              <div className="result-stat is-review">
                <strong>{reviewItems.length}</strong>
                <span>Need review</span>
              </div>
              <div className="result-stat">
                <strong>{skippedCount}</strong>
                <span>Skipped</span>
              </div>
              <div className="result-stat is-blocked">
                <strong>{blockedCount}</strong>
                <span>Blocked</span>
              </div>
            </div>
          </section>

          <section className="review-queue" aria-labelledby="review-heading">
            <div className="inventory-heading">
              <div>
                <p className="eyebrow">3 · Your attention</p>
                <h2 id="review-heading">Review queue</h2>
              </div>
              <span className="review-count">{reviewItems.length}</span>
            </div>
            {reviewItems.length ? (
              <ol className="review-list">
                {reviewItems.map((item) => {
                  const draft = drafts[item.field.id];
                  const evidence = draft?.response?.evidenceIds
                    .map((id) =>
                      profile.evidence.find((record) => record.id === id),
                    )
                    .filter((record) => record !== undefined);
                  if (item.field.kind !== "textarea") {
                    return (
                      <li key={item.field.id}>
                        <button
                          type="button"
                          onClick={() => handleFocus(item.field)}
                        >
                          <span>
                            <strong>{item.field.label}</strong>
                            <em>Needs review</em>
                            <small>{item.reason}</small>
                          </span>
                          <span aria-hidden="true">↗</span>
                        </button>
                      </li>
                    );
                  }
                  const overLimit = Boolean(
                    item.field.maxLength &&
                    (draft?.text.length ?? 0) > item.field.maxLength,
                  );
                  return (
                    <li className="answer-card" key={item.field.id}>
                      <div className="answer-heading">
                        <div>
                          <strong>{item.field.label}</strong>
                          <em>Needs review</em>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFocus(item.field)}
                        >
                          View field ↗
                        </button>
                      </div>
                      {!draft?.response && !draft?.loading && (
                        <>
                          <small>{item.reason}</small>
                          <button
                            className="draft-button"
                            type="button"
                            onClick={() => handleGenerate(item.field)}
                          >
                            Generate grounded draft
                          </button>
                        </>
                      )}
                      {draft?.loading && (
                        <p className="draft-loading">Selecting evidence…</p>
                      )}
                      {draft?.response && (
                        <>
                          <label className="draft-editor">
                            Reviewed answer
                            <textarea
                              aria-label={`Reviewed answer for ${item.field.label}`}
                              value={draft.text}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [item.field.id]: {
                                    ...current[item.field.id],
                                    text: event.target.value,
                                    error: undefined,
                                  },
                                }))
                              }
                            />
                          </label>
                          <p
                            className={`character-count ${overLimit ? "is-over" : ""}`}
                          >
                            {draft.text.length}
                            {item.field.maxLength
                              ? ` / ${item.field.maxLength}`
                              : " characters"}
                          </p>
                          {evidence?.length ? (
                            <details className="answer-evidence" open>
                              <summary>
                                Evidence used ({evidence.length})
                              </summary>
                              <ul>
                                {evidence.map((record) => (
                                  <li key={record.id}>
                                    {record.text} <span>{record.source}</span>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ) : null}
                          {draft.response.notes.map((note) => (
                            <p className="answer-note" key={note}>
                              {note}
                            </p>
                          ))}
                          {draft.response.followUpQuestion && (
                            <div className="follow-up">
                              <label>
                                {draft.response.followUpQuestion}
                                <textarea
                                  value={followUpAnswers[item.field.id] ?? ""}
                                  onChange={(event) =>
                                    setFollowUpAnswers((current) => ({
                                      ...current,
                                      [item.field.id]: event.target.value,
                                    }))
                                  }
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => confirmFollowUp(item.field)}
                              >
                                Confirm, save to My Profile &amp; regenerate
                              </button>
                            </div>
                          )}
                          <div className="answer-actions">
                            <button
                              type="button"
                              onClick={() => handleGenerate(item.field)}
                            >
                              Regenerate
                            </button>
                            <button
                              className="fill-answer"
                              type="button"
                              disabled={!draft.text.trim() || overLimit}
                              onClick={() => handleFillAnswer(item.field)}
                            >
                              Fill answer
                            </button>
                          </div>
                        </>
                      )}
                      {draft?.error && (
                        <p className="draft-error" role="alert">
                          {draft.error}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="empty-state">Nothing needs review.</p>
            )}
          </section>

          <details className="inventory-details">
            <summary>View all {fields.length} detected safe fields</summary>
            <ol className="field-list">
              {fields.map((field) => (
                <li className="field-card" key={`${field.kind}-${field.id}`}>
                  <button type="button" onClick={() => handleFocus(field)}>
                    <span className="field-card-heading">
                      <strong>{field.label}</strong>
                      <span aria-hidden="true">↗</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </details>
        </>
      )}

      <footer>
        <span>Local demo mode</span>
        <span>No automatic submission</span>
      </footer>
    </main>
  );
}
