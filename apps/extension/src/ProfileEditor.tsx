import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  candidateProfileSchema,
  type CandidateProfile,
  type EvidenceRecord,
  type ResumeExtraction,
} from "@applyproof/shared-types";

import type { ParsedResume } from "./resumeTextParser";

type ProfileEditorProps = {
  profile: CandidateProfile | null;
  initialResumeFile?: File | null;
  onCancel: () => void;
  onSave: (profile: CandidateProfile, importedResume?: File) => Promise<void>;
};

type EducationDraft = {
  id: string;
  school: string;
  degree: string;
  startDate: string;
  graduationDate: string;
};

type ExperienceDraft = {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
};

type ProfileDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  portfolio: string;
  linkedin: string;
  education: EducationDraft[];
  experience: ExperienceDraft[];
  startDate: string;
  relocation: "" | "yes" | "no";
  workAuthorized:
    "" | CandidateProfile["workAuthorization"]["canada"]["authorized"];
  sponsorship:
    "" | CandidateProfile["workAuthorization"]["canada"]["sponsorship"];
  genderIdentity: "" | CandidateProfile["demographics"]["genderIdentity"];
  raceEthnicity: "" | CandidateProfile["demographics"]["raceEthnicity"];
  disabilityStatus: "" | CandidateProfile["demographics"]["disabilityStatus"];
  lgbtqIdentity: "" | CandidateProfile["demographics"]["lgbtqIdentity"];
  veteranStatus: "" | CandidateProfile["demographics"]["veteranStatus"];
  evidenceText: string;
};

let entrySequence = 0;
function entryId(prefix: string) {
  entrySequence += 1;
  return `${prefix}-${entrySequence}`;
}

function blankEducation(): EducationDraft {
  return {
    id: entryId("education"),
    school: "",
    degree: "",
    startDate: "",
    graduationDate: "",
  };
}

function blankExperience(): ExperienceDraft {
  return {
    id: entryId("experience"),
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    description: "",
  };
}

function draftFrom(profile: CandidateProfile | null): ProfileDraft {
  return {
    firstName: profile?.identity.firstName ?? "",
    lastName: profile?.identity.lastName ?? "",
    email: profile?.identity.email ?? "",
    phone: profile?.identity.phone ?? "",
    location: profile?.identity.location ?? "",
    portfolio: profile?.links.portfolio ?? "",
    linkedin: profile?.links.linkedin ?? "",
    education: profile?.education.map((entry) => ({
      ...entry,
      startDate: entry.startDate ?? "",
      graduationDate: entry.graduationDate ?? "",
    })) ?? [blankEducation()],
    experience:
      profile?.experience.map((entry) => ({
        ...entry,
        location: entry.location ?? "",
        startDate: entry.startDate ?? "",
        endDate: entry.endDate ?? "",
        description: entry.description ?? "",
      })) ?? [],
    startDate: profile?.availability.startDate ?? "",
    relocation: profile?.availability.relocation ?? "",
    workAuthorized: profile?.workAuthorization.canada.authorized ?? "",
    sponsorship: profile?.workAuthorization.canada.sponsorship ?? "",
    genderIdentity: profile?.demographics.genderIdentity ?? "",
    raceEthnicity: profile?.demographics.raceEthnicity ?? "",
    disabilityStatus: profile?.demographics.disabilityStatus ?? "",
    lgbtqIdentity: profile?.demographics.lgbtqIdentity ?? "",
    veteranStatus: profile?.demographics.veteranStatus ?? "",
    evidenceText:
      profile?.evidence.map((record) => record.text).join("\n") ?? "",
  };
}

function evidenceFrom(
  evidenceText: string,
  existing: EvidenceRecord[],
): EvidenceRecord[] {
  return evidenceText
    .split("\n")
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) =>
      existing.find((record) => record.text === text)
        ? (existing.find((record) => record.text === text) as EvidenceRecord)
        : {
            id: `profile-evidence-${index + 1}`,
            category: "profile" as const,
            text,
            source: "My Profile",
          },
    );
}

function profileFromDraft(
  draft: ProfileDraft,
  existing: CandidateProfile | null,
) {
  return candidateProfileSchema.parse({
    id: "my-profile",
    displayName: `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim(),
    identity: {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      location: draft.location.trim(),
    },
    links: {
      ...(draft.portfolio.trim() ? { portfolio: draft.portfolio.trim() } : {}),
      ...(draft.linkedin.trim() ? { linkedin: draft.linkedin.trim() } : {}),
    },
    education: draft.education.map((entry) => ({
      id: entry.id,
      school: entry.school.trim(),
      degree: entry.degree.trim(),
      ...(entry.startDate ? { startDate: entry.startDate } : {}),
      ...(entry.graduationDate ? { graduationDate: entry.graduationDate } : {}),
    })),
    experience: draft.experience.map((entry) => ({
      id: entry.id,
      company: entry.company.trim(),
      title: entry.title.trim(),
      ...(entry.location.trim() ? { location: entry.location.trim() } : {}),
      ...(entry.startDate.trim() ? { startDate: entry.startDate.trim() } : {}),
      ...(entry.endDate.trim() ? { endDate: entry.endDate.trim() } : {}),
      ...(entry.description.trim()
        ? { description: entry.description.trim() }
        : {}),
    })),
    availability: {
      startDate: draft.startDate,
      relocation: draft.relocation,
    },
    workAuthorization: {
      canada: {
        authorized: draft.workAuthorized,
        sponsorship: draft.sponsorship,
      },
    },
    demographics: {
      ...(draft.genderIdentity ? { genderIdentity: draft.genderIdentity } : {}),
      ...(draft.raceEthnicity ? { raceEthnicity: draft.raceEthnicity } : {}),
      ...(draft.disabilityStatus
        ? { disabilityStatus: draft.disabilityStatus }
        : {}),
      ...(draft.lgbtqIdentity ? { lgbtqIdentity: draft.lgbtqIdentity } : {}),
      ...(draft.veteranStatus ? { veteranStatus: draft.veteranStatus } : {}),
    },
    evidence: evidenceFrom(draft.evidenceText, existing?.evidence ?? []),
  });
}

function hasEducation(entry: EducationDraft) {
  return Boolean(entry.school.trim() || entry.degree.trim());
}

function mergeResume(draft: ProfileDraft, resume: ParsedResume): ProfileDraft {
  const existingEducation = draft.education.filter(hasEducation);
  const importedEducation = resume.education
    .filter(
      (entry) =>
        !existingEducation.some(
          (current) =>
            current.school.toLowerCase() === entry.school.toLowerCase() &&
            current.degree.toLowerCase() === entry.degree.toLowerCase(),
        ),
    )
    .map((entry) => ({
      id: entryId("education"),
      school: entry.school,
      degree: entry.degree,
      startDate: entry.startDate ?? "",
      graduationDate: entry.graduationDate ?? "",
    }));
  const importedExperience = resume.experience
    .filter(
      (entry) =>
        !draft.experience.some(
          (current) =>
            current.company.toLowerCase() === entry.company.toLowerCase() &&
            current.title.toLowerCase() === entry.title.toLowerCase(),
        ),
    )
    .map((entry) => ({
      id: entryId("experience"),
      company: entry.company,
      title: entry.title,
      location: entry.location ?? "",
      startDate: entry.startDate ?? "",
      endDate: entry.endDate ?? "",
      description: entry.description ?? "",
    }));
  const currentEvidence = draft.evidenceText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const importedEvidence = resume.evidence.filter(
    (line) => !currentEvidence.includes(line),
  );
  return {
    ...draft,
    firstName: resume.firstName ?? draft.firstName,
    lastName: resume.lastName ?? draft.lastName,
    email: resume.email ?? draft.email,
    phone: resume.phone ?? draft.phone,
    location: resume.location ?? draft.location,
    portfolio: resume.portfolio ?? draft.portfolio,
    linkedin: resume.linkedin ?? draft.linkedin,
    education:
      existingEducation.length || importedEducation.length
        ? [...existingEducation, ...importedEducation]
        : draft.education,
    experience: [...draft.experience, ...importedExperience],
    evidenceText: [...currentEvidence, ...importedEvidence].join("\n"),
  };
}

export function ProfileEditor({
  profile,
  initialResumeFile,
  onCancel,
  onSave,
}: ProfileEditorProps) {
  const [draft, setDraft] = useState(() => draftFrom(profile));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importReviews, setImportReviews] = useState<
    ResumeExtraction["reviews"]
  >([]);
  const [importedResumeFile, setImportedResumeFile] = useState<File | null>(
    null,
  );
  const initialImportStarted = useRef(false);

  function set<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setEducation(id: string, update: Partial<EducationDraft>) {
    setDraft((current) => ({
      ...current,
      education: current.education.map((entry) =>
        entry.id === id ? { ...entry, ...update } : entry,
      ),
    }));
  }

  function setExperience(id: string, update: Partial<ExperienceDraft>) {
    setDraft((current) => ({
      ...current,
      experience: current.experience.map((entry) =>
        entry.id === id ? { ...entry, ...update } : entry,
      ),
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSave(
        profileFromDraft(draft, profile),
        importedResumeFile ?? undefined,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "My Profile could not be saved.",
      );
      setSaving(false);
    }
  }

  async function importResume(file: File) {
    setError("");
    setImportMessage("");
    setImportReviews([]);
    setImporting(true);
    try {
      const { importResumeFile } = await import("./resumeImport");
      const resume = await importResumeFile(file);
      setDraft((current) => mergeResume(current, resume));
      setImportedResumeFile(file);
      setImportReviews(resume.reviews);
      const factCount = Object.entries(resume).filter(
        ([key, value]) =>
          !["evidence", "education", "experience"].includes(key) &&
          Boolean(value),
      ).length;
      setImportMessage(
        `Imported ${factCount} profile fields, ${resume.education.length} education entries, ${resume.experience.length} experience entries, and ${resume.evidence.length} evidence items from ${file.name}. ${resume.notes.at(-1) ?? "Extraction completed."} ${file.name} is not saved yet; Save My Profile to store it in My resume file. Review every field before saving.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "This resume could not be read.",
      );
    } finally {
      setImporting(false);
    }
  }

  function handleResumeImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void importResume(file);
  }

  useEffect(() => {
    if (!initialResumeFile || initialImportStarted.current) return;
    initialImportStarted.current = true;
    void importResume(initialResumeFile);
  }, [initialResumeFile]);

  return (
    <form className="profile-editor" onSubmit={submit}>
      <div className="editor-heading">
        <div>
          <p className="eyebrow">My Profile</p>
          <h2>{profile ? "Edit profile" : "Create profile"}</h2>
        </div>
        <button className="text-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <fieldset className="resume-import">
        <legend>Import resume</legend>
        <p className="field-help">
          Import a Word (.docx) or text-based PDF (.pdf) resume. Extracted text
          is sent to the configured AI provider and the editable results are
          shown below. After you save My Profile, the original file stays in
          local browser storage. OCR is not used.
        </p>
        <label className={`file-button ${importing ? "is-disabled" : ""}`}>
          {importing ? "Reading resume…" : "Choose Word or PDF resume"}
          <input
            type="file"
            accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={importing}
            onChange={(event) => void handleResumeImport(event)}
          />
        </label>
        {importMessage && (
          <p className="import-status" role="status">
            {importMessage}
          </p>
        )}
        {importReviews.length > 0 && (
          <details className="import-reviews">
            <summary>Review AI extraction sources</summary>
            <ul>
              {importReviews.map((review, index) => (
                <li key={`${review.fieldPath}-${index}`}>
                  <strong>{review.fieldPath}</strong> · {review.confidence}
                  <span>{review.sourceText}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </fieldset>

      <fieldset>
        <legend>Identity and contact</legend>
        <div className="field-grid two-columns">
          <label>
            First name
            <input
              required
              value={draft.firstName}
              onChange={(event) => set("firstName", event.target.value)}
            />
          </label>
          <label>
            Last name
            <input
              required
              value={draft.lastName}
              onChange={(event) => set("lastName", event.target.value)}
            />
          </label>
        </div>
        <label>
          Email
          <input
            required
            type="email"
            value={draft.email}
            onChange={(event) => set("email", event.target.value)}
          />
        </label>
        <label>
          Phone
          <input
            required
            type="tel"
            value={draft.phone}
            onChange={(event) => set("phone", event.target.value)}
          />
        </label>
        <label>
          City and region
          <input
            required
            value={draft.location}
            onChange={(event) => set("location", event.target.value)}
          />
        </label>
        <label>
          Portfolio or GitHub URL
          <input
            type="url"
            value={draft.portfolio}
            onChange={(event) => set("portfolio", event.target.value)}
          />
        </label>
        <label>
          LinkedIn URL
          <input
            type="url"
            value={draft.linkedin}
            onChange={(event) => set("linkedin", event.target.value)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Education</legend>
        <div className="repeatable-heading">
          <span className="field-help">Add every relevant credential.</span>
          <button
            className="text-button"
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                education: [...current.education, blankEducation()],
              }))
            }
          >
            Add education
          </button>
        </div>
        {draft.education.map((entry, index) => (
          <div className="repeatable-card" key={entry.id}>
            <div className="repeatable-card-heading">
              <strong>Education {index + 1}</strong>
              {draft.education.length > 1 && (
                <button
                  className="text-button danger"
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      education: current.education.filter(
                        (item) => item.id !== entry.id,
                      ),
                    }))
                  }
                >
                  Remove
                </button>
              )}
            </div>
            <label>
              School
              <input
                required
                value={entry.school}
                onChange={(event) =>
                  setEducation(entry.id, { school: event.target.value })
                }
              />
            </label>
            <label>
              Degree or program
              <input
                required
                value={entry.degree}
                onChange={(event) =>
                  setEducation(entry.id, { degree: event.target.value })
                }
              />
            </label>
            <div className="field-grid two-columns">
              <label>
                Start date
                <input
                  type="date"
                  value={entry.startDate}
                  onChange={(event) =>
                    setEducation(entry.id, { startDate: event.target.value })
                  }
                />
              </label>
              <label>
                Graduation date
                <input
                  type="date"
                  value={entry.graduationDate}
                  onChange={(event) =>
                    setEducation(entry.id, {
                      graduationDate: event.target.value,
                    })
                  }
                />
              </label>
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset>
        <legend>Work experience</legend>
        <div className="repeatable-heading">
          <span className="field-help">Add roles you want to reuse.</span>
          <button
            className="text-button"
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                experience: [...current.experience, blankExperience()],
              }))
            }
          >
            Add experience
          </button>
        </div>
        {!draft.experience.length && (
          <p className="field-help">No work experience added.</p>
        )}
        {draft.experience.map((entry, index) => (
          <div className="repeatable-card" key={entry.id}>
            <div className="repeatable-card-heading">
              <strong>Experience {index + 1}</strong>
              <button
                className="text-button danger"
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    experience: current.experience.filter(
                      (item) => item.id !== entry.id,
                    ),
                  }))
                }
              >
                Remove
              </button>
            </div>
            <label>
              Job title
              <input
                required
                value={entry.title}
                onChange={(event) =>
                  setExperience(entry.id, { title: event.target.value })
                }
              />
            </label>
            <label>
              Company
              <input
                required
                value={entry.company}
                onChange={(event) =>
                  setExperience(entry.id, { company: event.target.value })
                }
              />
            </label>
            <label>
              Location
              <input
                value={entry.location}
                onChange={(event) =>
                  setExperience(entry.id, { location: event.target.value })
                }
              />
            </label>
            <div className="field-grid two-columns">
              <label>
                Start date
                <input
                  placeholder="May 2024"
                  value={entry.startDate}
                  onChange={(event) =>
                    setExperience(entry.id, { startDate: event.target.value })
                  }
                />
              </label>
              <label>
                End date
                <input
                  placeholder="Present"
                  value={entry.endDate}
                  onChange={(event) =>
                    setExperience(entry.id, { endDate: event.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Description
              <textarea
                rows={3}
                value={entry.description}
                onChange={(event) =>
                  setExperience(entry.id, { description: event.target.value })
                }
              />
            </label>
          </div>
        ))}
      </fieldset>

      <fieldset>
        <legend>Availability</legend>
        <label>
          Earliest start date
          <input
            required
            type="date"
            value={draft.startDate}
            onChange={(event) => set("startDate", event.target.value)}
          />
        </label>
        <label>
          Open to relocation
          <select
            required
            value={draft.relocation}
            onChange={(event) =>
              set(
                "relocation",
                event.target.value as ProfileDraft["relocation"],
              )
            }
          >
            <option value="">Choose an answer</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>Work authorization</legend>
        <p className="field-help">
          These are two separate questions on most applications. ApplyProof
          saves your explicit answers and never infers them from your resume.
        </p>
        <label>
          Are you legally authorized to work in Canada?
          <select
            required
            value={draft.workAuthorized}
            onChange={(event) =>
              set(
                "workAuthorized",
                event.target.value as ProfileDraft["workAuthorized"],
              )
            }
          >
            <option value="">Choose an answer</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="decline">Prefer not to say</option>
          </select>
        </label>
        <label>
          Will you now or in the future require employment sponsorship?
          <select
            required
            value={draft.sponsorship}
            onChange={(event) =>
              set(
                "sponsorship",
                event.target.value as ProfileDraft["sponsorship"],
              )
            }
          >
            <option value="">Choose an answer</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="decline">Prefer not to say</option>
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>Voluntary self-identification</legend>
        <p className="field-help">
          These optional questions vary by employer. Save only what you want to
          reuse; ApplyProof never derives these answers from your resume or
          identity.
        </p>
        <label>
          Gender identity
          <select
            value={draft.genderIdentity}
            onChange={(event) =>
              set(
                "genderIdentity",
                event.target.value as ProfileDraft["genderIdentity"],
              )
            }
          >
            <option value="">Not saved</option>
            <option value="woman">Woman</option>
            <option value="man">Man</option>
            <option value="nonbinary">Non-binary</option>
            <option value="self_describe">Self-describe on application</option>
            <option value="decline">Prefer not to say</option>
          </select>
        </label>
        <label>
          Race or ethnicity
          <select
            value={draft.raceEthnicity}
            onChange={(event) =>
              set(
                "raceEthnicity",
                event.target.value as ProfileDraft["raceEthnicity"],
              )
            }
          >
            <option value="">Not saved</option>
            <option value="asian">Asian</option>
            <option value="black">Black or African American</option>
            <option value="hispanic_latino">Hispanic or Latino/a/x</option>
            <option value="indigenous">Indigenous or Native American</option>
            <option value="middle_eastern_north_african">
              Middle Eastern or North African
            </option>
            <option value="pacific_islander">
              Native Hawaiian or Pacific Islander
            </option>
            <option value="white">White</option>
            <option value="multiracial">Two or more races</option>
            <option value="self_describe">Self-describe on application</option>
            <option value="decline">Prefer not to say</option>
          </select>
        </label>
        <label>
          Disability status
          <select
            value={draft.disabilityStatus}
            onChange={(event) =>
              set(
                "disabilityStatus",
                event.target.value as ProfileDraft["disabilityStatus"],
              )
            }
          >
            <option value="">Not saved</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="decline">Prefer not to say</option>
          </select>
        </label>
        <label>
          Do you identify as LGBTQ+?
          <select
            value={draft.lgbtqIdentity}
            onChange={(event) =>
              set(
                "lgbtqIdentity",
                event.target.value as ProfileDraft["lgbtqIdentity"],
              )
            }
          >
            <option value="">Not saved</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="decline">Prefer not to say</option>
          </select>
        </label>
        <label>
          Veteran or military service status
          <select
            value={draft.veteranStatus}
            onChange={(event) =>
              set(
                "veteranStatus",
                event.target.value as ProfileDraft["veteranStatus"],
              )
            }
          >
            <option value="">Not saved</option>
            <option value="yes">Veteran or military service</option>
            <option value="no">Not a veteran</option>
            <option value="decline">Prefer not to say</option>
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>Resume evidence</legend>
        <label>
          One verified fact per line
          <textarea
            rows={5}
            value={draft.evidenceText}
            onChange={(event) => set("evidenceText", event.target.value)}
          />
        </label>
      </fieldset>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save My Profile"}
      </button>
    </form>
  );
}
