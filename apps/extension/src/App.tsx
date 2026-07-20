import { useEffect, useRef, useState } from "react";
import { mayaProfile } from "@applyproof/sample-data";
import type {
  CandidateProfile,
  FillResult,
  NormalizedField,
  PageJobContext,
  RememberedAnswer,
} from "@applyproof/shared-types";

import { planAutofill, type FieldDecision } from "./autofill";
import {
  attachResumeToActivePage,
  enableInlineAssistants,
  fillActivePage,
  scanActivePage,
} from "./browser";
import { generateAnswerDraft } from "./answerApi";
import { buildDraftRequest } from "./evidence";
import { ProfileEditor } from "./ProfileEditor";
import {
  loadMyProfile,
  loadRememberedAnswers,
  resetMyProfile,
  saveMyProfile,
} from "./profileStorage";
import {
  deleteSavedResumeFile,
  loadSavedResumeFile,
  loadSavedResumeMetadata,
  loadSavedResumeText,
  saveResumeFile,
  type SavedResumeMetadata,
} from "./resumeFileStorage";

type WorkflowStatus = "idle" | "working" | "complete" | "error";

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
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [initialResumeFile, setInitialResumeFile] = useState<File | null>(null);
  const [savedResume, setSavedResume] = useState<SavedResumeMetadata | null>(
    null,
  );
  const [rememberedAnswers, setRememberedAnswers] = useState<
    RememberedAnswer[]
  >([]);
  const [status, setStatus] = useState<WorkflowStatus>("idle");
  const [message, setMessage] = useState("Loading My Profile…");
  const resumeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void Promise.all([
      loadMyProfile(),
      loadRememberedAnswers(),
      loadSavedResumeMetadata(),
    ])
      .then(([saved, answers, resume]) => {
        setProfile(saved);
        setRememberedAnswers(answers);
        setSavedResume(resume);
        setMessage(
          saved
            ? "My Profile is ready for safe autofill."
            : "Start My Profile from a resume or from scratch.",
        );
      })
      .catch((error) => {
        setStatus("error");
        setMessage(errorMessage(error));
      })
      .finally(() => setProfileLoading(false));
  }, []);

  async function handleProfileSave(
    updated: CandidateProfile,
    importedResume?: File,
    importedResumeText?: string,
  ) {
    const saved = await saveMyProfile(updated);
    const resume = importedResume
      ? await saveResumeFile(importedResume, importedResumeText)
      : savedResume;
    const answers = await loadRememberedAnswers();
    setProfile(saved);
    setSavedResume(resume);
    setRememberedAnswers(answers);
    setEditingProfile(false);
    setInitialResumeFile(null);
    setStatus("idle");
    setMessage(
      importedResume
        ? `My Profile and ${importedResume.name} were saved locally.`
        : "My Profile was saved locally and is ready for autofill.",
    );
  }

  async function loadDemoData() {
    setStatus("working");
    try {
      const saved = await saveMyProfile({ ...mayaProfile, id: "my-profile" });
      const answers = await loadRememberedAnswers();
      setProfile(saved);
      setRememberedAnswers(answers);
      setEditingProfile(false);
      setInitialResumeFile(null);
      setStatus("idle");
      setMessage("Maya demo data was loaded into My Profile.");
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
      throw error;
    }
  }

  async function handleReset() {
    try {
      await Promise.all([resetMyProfile(), deleteSavedResumeFile()]);
      setProfile(null);
      setSavedResume(null);
      setRememberedAnswers([]);
      setEditingProfile(false);
      setInitialResumeFile(null);
      setStatus("idle");
      setMessage("Local profile data was deleted from this browser.");
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
      throw error;
    }
  }

  async function handleResumeFileReplacement(file: File) {
    try {
      const metadata = await saveResumeFile(file);
      setSavedResume(metadata);
      setStatus("idle");
      setMessage(
        `${file.name} replaced My resume file. Other profile details were not changed.`,
      );
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
    }
  }

  async function handleResumeFileDelete() {
    try {
      await deleteSavedResumeFile();
      setSavedResume(null);
      setStatus("idle");
      setMessage(
        "My resume file was deleted. Other profile details were not changed.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
    }
  }

  async function handleAutofill() {
    if (!profile) return;
    setStatus("working");
    setMessage("Scanning fields and applying verified profile data…");
    try {
      const scan = await scanActivePage();
      const plan = planAutofill(profile, scan.fields, rememberedAnswers);
      const results = await fillActivePage(plan.fills);
      const completed = applyFillResults(plan.decisions, results);
      let resumeNote = "";
      if (savedResume) {
        try {
          const file = await loadSavedResumeFile();
          if (file) {
            const attachment = await attachResumeToActivePage(file);
            resumeNote =
              attachment === "attached"
                ? " Saved resume attached."
                : attachment === "skipped_existing"
                  ? " Existing resume selection was preserved."
                  : " Attach the saved resume manually if this application requires it.";
          }
        } catch {
          resumeNote =
            " Attach the saved resume manually if this application requires it.";
        }
      }
      const mountedCount = await enableInlineAssistants(scan.fields, scan.job);
      setStatus("complete");
      const needsAttention = completed.some((item) => item.action === "review");
      setMessage(
        `Autofill complete. ${needsAttention ? "Some fields still need your attention on the page. " : "Review the application on the page. "}${mountedCount ? `Blank open ${mountedCount === 1 ? "answer is" : "answers are"} generating now.` : ""}${resumeNote}`,
      );
    } catch (error) {
      setStatus("error");
      setMessage(errorMessage(error));
    }
  }

  useEffect(() => {
    if (!profile) return;
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
        manualJobDescription?: string;
        job?: PageJobContext;
      };
      if (update.type === "APPLYPROOF_GENERATE_INLINE_DRAFT" && update.field) {
        const field = update.field;
        void loadSavedResumeText()
          .then((resumeText) =>
            generateAnswerDraft(
              buildDraftRequest(profile, field, {
                additionalPrompt: update.additionalPrompt,
                job: update.job,
                manualJobDescription: update.manualJobDescription,
                resumeText: resumeText ?? undefined,
              }),
            ),
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
          .catch(() =>
            sendResponse({
              ok: false,
              error:
                "ApplyProof could not prepare this draft. Your answer was not changed.",
            }),
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
        className={`profile-card ${profile ? "is-selected" : ""}`}
        aria-labelledby="profile-heading"
      >
        {editingProfile ? (
          <ProfileEditor
            profile={profile}
            initialResumeFile={initialResumeFile}
            savedResume={savedResume}
            onCancel={() => {
              setEditingProfile(false);
              setInitialResumeFile(null);
            }}
            onResumeFileDelete={handleResumeFileDelete}
            onResumeFileReplace={handleResumeFileReplacement}
            onSave={handleProfileSave}
          />
        ) : profile ? (
          <>
            <div className="profile-heading">
              <span className="avatar" aria-hidden="true">
                {profile.identity.firstName.charAt(0)}
                {profile.identity.lastName.charAt(0)}
              </span>
              <div>
                <p className="eyebrow">1 · My Profile</p>
                <h2 id="profile-heading">{profile.displayName}</h2>
                <p>{profile.identity.location}</p>
              </div>
              <span className="selected-badge">Saved</span>
            </div>
            <div className="profile-facts">
              <span>{profile.identity.email}</span>
              {profile.education[0]?.degree && (
                <span>{profile.education[0].degree}</span>
              )}
              <span>{profile.education.length} education entries</span>
              <span>{profile.experience.length} experience entries</span>
              <span>Work authorization answers saved</span>
              <span>
                {Object.values(profile.demographics).filter(Boolean).length}{" "}
                voluntary answers saved
              </span>
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
            <div className="profile-actions">
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setInitialResumeFile(null);
                  setEditingProfile(true);
                }}
              >
                Edit profile
              </button>
              <button
                className="text-button danger"
                type="button"
                onClick={() => void handleReset()}
              >
                Reset local data
              </button>
            </div>
          </>
        ) : (
          <div className="empty-profile">
            <div className="profile-heading">
              <span className="avatar" aria-hidden="true">
                +
              </span>
              <div>
                <p className="eyebrow">1 · My Profile</p>
                <h2 id="profile-heading">Set up your profile</h2>
                <p>Saved only in this browser.</p>
              </div>
            </div>
            <div className="profile-creation-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => resumeInputRef.current?.click()}
                disabled={profileLoading}
              >
                From resume
              </button>
              <input
                ref={resumeInputRef}
                aria-label="Resume file"
                type="file"
                accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={profileLoading}
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setInitialResumeFile(file);
                  setEditingProfile(true);
                }}
              />
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setInitialResumeFile(null);
                  setEditingProfile(true);
                }}
                disabled={profileLoading}
              >
                From scratch
              </button>
            </div>
            <button
              className="text-button demo-seed-button"
              type="button"
              onClick={() => void loadDemoData()}
              disabled={profileLoading || status === "working"}
            >
              Load Maya demo data
            </button>
            {status === "error" && (
              <button
                className="text-button danger demo-seed-button"
                type="button"
                onClick={() => void handleReset()}
              >
                Delete unreadable local data
              </button>
            )}
          </div>
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
          disabled={!profile || editingProfile || status === "working"}
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
        <span>Profile data stays local</span>
      </footer>
    </main>
  );
}
