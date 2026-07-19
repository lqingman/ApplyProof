import { useEffect, useState } from "react";
import { mayaProfile } from "@applyproof/sample-data";
import type { FillResult, NormalizedField } from "@applyproof/shared-types";

import { planAutofill, type FieldDecision } from "./autofill";
import {
  enableInlineAssistants,
  fillActivePage,
  scanActivePage,
} from "./browser";
import { generateAnswerDraft } from "./answerApi";
import { buildDraftRequest } from "./evidence";

type WorkflowStatus = "idle" | "working" | "complete" | "error";
const genderLabels = {
  woman: "Woman",
  man: "Man",
  nonbinary: "Non-binary",
  decline: "Prefer not to say",
} as const;

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
  const profile = mayaProfile;
  const [status, setStatus] = useState<WorkflowStatus>("idle");
  const [message, setMessage] = useState(
    "Choose a trusted profile before scanning this application.",
  );

  function selectProfile() {
    setProfileSelected(true);
    setMessage("Maya's verified profile is ready for safe autofill.");
  }

  function clearProfile() {
    setProfileSelected(false);
    setStatus("idle");
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
      const mountedCount = await enableInlineAssistants(scan.fields);
      setStatus("complete");
      const needsAttention = completed.some((item) => item.action === "review");
      setMessage(
        `Autofill complete. ${needsAttention ? "Some fields still need your attention on the page. " : "Review the application on the page. "}${mountedCount ? `Blank open ${mountedCount === 1 ? "answer is" : "answers are"} generating now.` : ""}`,
      );
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
    }
  }

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.runtime?.onMessage) return;
    const listener = (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: unknown) => void,
    ) => {
      const update = message as {
        type?: string;
        field?: NormalizedField;
        additionalPrompt?: string;
      };
      if (update.type === "APPLYPROOF_GENERATE_INLINE_DRAFT" && update.field) {
        void generateAnswerDraft(
          buildDraftRequest(profile, update.field, update.additionalPrompt),
        )
          .then((response) => {
            const sources = response.evidenceIds
              .map(
                (id) =>
                  profile.evidence.find((record) => record.id === id)?.source,
              )
              .filter((source): source is string => Boolean(source));
            sendResponse({ ok: true, response, sources });
          })
          .catch((error) =>
            sendResponse({ ok: false, error: errorMessage(error) }),
          );
        return true;
      }
      if (update.type !== "APPLYPROOF_INLINE_DRAFT_FILLED") return;
      setMessage(
        "The generated answer is now in the application. Review it before submitting.",
      );
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [profile]);

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
              {profile.workAuthorization?.canada === "authorized" && (
                <span>Authorized to work in Canada</span>
              )}
              {profile.demographics?.genderIdentity && (
                <span>
                  Gender: {genderLabels[profile.demographics.genderIdentity]}
                </span>
              )}
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
          Fill saved profile answers and draft open questions directly on the
          page.
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

      <footer>
        <span>Local demo mode</span>
      </footer>
    </main>
  );
}
