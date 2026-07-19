import { useState } from "react";
import type { NormalizedField } from "@applyproof/shared-types";

import { focusField, scanActivePage } from "./browser";

const otherStages = [
  { name: "Profile", state: "Phase 3" },
  { name: "Review", state: "Phase 4" },
  { name: "Audit", state: "Phase 5" },
] as const;

function readableKind(kind: NormalizedField["kind"]) {
  return kind === "textarea"
    ? "Long answer"
    : kind.charAt(0).toUpperCase() + kind.slice(1);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "The page could not be scanned. Refresh it and try again.";
}

export function App() {
  const [fields, setFields] = useState<NormalizedField[]>([]);
  const [status, setStatus] = useState<
    "idle" | "scanning" | "complete" | "error"
  >("idle");
  const [message, setMessage] = useState(
    "Only normalized form metadata stays in the extension.",
  );

  async function handleScan() {
    setStatus("scanning");
    setMessage("Reading form controls and accessible labels…");
    try {
      const nextFields = await scanActivePage();
      setFields(nextFields);
      setStatus("complete");
      setMessage(
        nextFields.length
          ? `Found ${nextFields.length} safe fields. Blocked sensitive fields were excluded.`
          : "No supported fields were found on this page.",
      );
    } catch (error) {
      setFields([]);
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

      <section className="scan-hero" aria-labelledby="analyze-heading">
        <div className="scan-heading">
          <span className="stage-number">2</span>
          <div>
            <p className="eyebrow">Analyze</p>
            <h2 id="analyze-heading">Understand this application</h2>
          </div>
        </div>
        <p className="scan-copy">
          Detect supported form fields, labels, requirements, and answer limits
          without collecting the rest of the page.
        </p>
        <button
          className="primary-button"
          type="button"
          onClick={handleScan}
          disabled={status === "scanning"}
        >
          {status === "scanning"
            ? "Scanning…"
            : fields.length
              ? "Scan again"
              : "Scan application"}
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
        <section className="inventory" aria-labelledby="inventory-heading">
          <div className="inventory-heading">
            <div>
              <p className="eyebrow">Field inventory</p>
              <h2 id="inventory-heading">{fields.length} safe fields</h2>
            </div>
            <span className="privacy-pill">Page-local scan</span>
          </div>

          {fields.length ? (
            <ol className="field-list">
              {fields.map((field) => (
                <li className="field-card" key={`${field.kind}-${field.id}`}>
                  <button
                    type="button"
                    onClick={() => handleFocus(field)}
                    aria-label={`Show ${field.label} on page`}
                  >
                    <span className="field-card-heading">
                      <strong>{field.label}</strong>
                      <span aria-hidden="true">↗</span>
                    </span>
                    <span className="field-meta">
                      <span>{readableKind(field.kind)}</span>
                      <span>{field.required ? "Required" : "Optional"}</span>
                      {field.maxLength && <span>{field.maxLength} chars</span>}
                      {field.options.length > 0 && (
                        <span>{field.options.length} options</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty-state">
              <strong>No supported fields yet</strong>
              <p>Open the Northstar Labs application, then scan again.</p>
            </div>
          )}
        </section>
      )}

      <nav aria-label="ApplyProof workflow">
        <ol className="compact-stage-list">
          {otherStages.map((stage, index) => (
            <li key={stage.name}>
              <span>{index === 0 ? 1 : index + 2}</span>
              <strong>{stage.name}</strong>
              <small>{stage.state}</small>
            </li>
          ))}
        </ol>
      </nav>

      <footer>
        <span>Local demo mode</span>
        <span>No automatic submission</span>
      </footer>
    </main>
  );
}
