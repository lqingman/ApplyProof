import type {
  AnswerDraftRequest,
  CandidateProfile,
  EvidenceRecord,
  NormalizedField,
  PageJobContext,
} from "@applyproof/shared-types";

export const northstarJob = {
  company: "Northstar Labs",
  role: "Junior Software Engineer",
  requirements: ["React", "TypeScript", "accessibility", "automated testing"],
};

const strategies: Record<string, string[]> = {
  motivation: ["interest-accessible-products", "project-campus-map"],
  project: ["project-campus-map"],
  strengths: ["education-ubc", "experience-coop", "skills-stack"],
};

const aiWorkflowPattern = /\b(?:ai|artificial intelligence|copilot|llm)\b/i;
const answerCharacterLimit = 20_000;

type DraftBuildOptions = {
  additionalPrompt?: string;
  job?: PageJobContext;
  manualJobDescription?: string;
  resumeText?: string;
};

const resumeSectionPattern =
  /^(summary|profile|experience|work experience|professional experience|employment|education|projects?|skills?|certifications?|awards?|volunteering)$/i;

function resumeCategory(section: string): EvidenceRecord["category"] {
  if (/project/i.test(section)) return "project";
  if (/experience|employment/i.test(section)) return "experience";
  if (/education/i.test(section)) return "education";
  if (/skills?/i.test(section)) return "skill";
  return "profile";
}

export function evidenceFromResumeText(
  resumeText: string | undefined,
  query: string,
) {
  if (!resumeText?.trim()) return [];
  let section = "Resume";
  const records: EvidenceRecord[] = [];
  for (const rawLine of resumeText.replace(/\r/g, "").split("\n")) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (resumeSectionPattern.test(line)) {
      section = line;
      continue;
    }
    if (
      line.length < 20 ||
      /^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(line) ||
      /^(?:https?:\/\/|www\.)/i.test(line)
    )
      continue;
    records.push({
      id: `resume-source-${records.length + 1}`,
      category: resumeCategory(section),
      text: line.slice(0, 2000),
      source: `Saved resume · ${section}`.slice(0, 300),
    });
    if (records.length >= 80) break;
  }
  const words = new Set(query.toLowerCase().match(/[a-z]{3,}/g) ?? []);
  return records
    .map((record, index) => ({
      record,
      index,
      score: (record.text.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter(
        (word) => words.has(word),
      ).length,
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, 12)
    .map(({ record }) => record);
}

export function selectEvidence(
  profile: CandidateProfile,
  field: NormalizedField,
  additionalPrompt?: string,
): EvidenceRecord[] {
  // A user instruction such as “use the campus map project” may refer to any
  // resume section. Give the model the verified profile records to choose from;
  // the server still validates every returned evidence ID.
  if (additionalPrompt?.trim()) return profile.evidence.slice(0, 20);

  const selectedIds = strategies[field.id];
  if (field.id === "ai-workflow" || aiWorkflowPattern.test(field.label)) {
    const resumeIds = new Set([
      "project-campus-map",
      "experience-coop",
      "skills-stack",
    ]);
    const selected = profile.evidence.filter((record) =>
      resumeIds.has(record.id),
    );
    if (selected.length > 0) return selected;
  }
  if (selectedIds) {
    const selected = selectedIds
      .map((id) => profile.evidence.find((record) => record.id === id))
      .filter((record): record is EvidenceRecord => record !== undefined);
    if (selected.length > 0) return selected;
  }

  const words = new Set(
    `${field.label} ${northstarJob.requirements.join(" ")}`
      .toLowerCase()
      .match(/[a-z]{3,}/g) ?? [],
  );
  const ranked = profile.evidence
    .map((record) => ({
      record,
      score: (record.text.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter(
        (word) => words.has(word),
      ).length,
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map((item) => item.record);
  return ranked.length > 0 ? ranked : profile.evidence.slice(0, 4);
}

export function buildDraftRequest(
  profile: CandidateProfile,
  field: NormalizedField,
  input?: string | DraftBuildOptions,
): AnswerDraftRequest {
  const options: DraftBuildOptions =
    typeof input === "string" ? { additionalPrompt: input } : (input ?? {});
  const instruction = options.additionalPrompt?.trim();
  const manualDescription = options.manualJobDescription?.trim();
  const pageJob = options.job;
  const description = manualDescription || pageJob?.description;
  const job =
    pageJob || manualDescription
      ? {
          company: pageJob?.company ?? "the hiring company",
          role: pageJob?.role ?? "this role",
          requirements: [],
          ...(description ? { description: description.slice(0, 12000) } : {}),
        }
      : northstarJob;
  const profileEvidence = selectEvidence(profile, field, instruction);
  const resumeEvidence = evidenceFromResumeText(
    options.resumeText,
    `${field.label} ${description ?? ""}`,
  );
  const evidence = [...profileEvidence, ...resumeEvidence]
    .filter(
      (record, index, all) =>
        all.findIndex((candidate) => candidate.text === record.text) === index,
    )
    .slice(0, 20);
  const maxCharacters = field.maxLength
    ? Math.min(field.maxLength, answerCharacterLimit)
    : undefined;
  return {
    field: {
      id: field.id,
      question: field.label,
      ...(maxCharacters ? { maxCharacters } : {}),
    },
    job,
    evidence,
    ...(instruction ? { additionalPrompt: instruction } : {}),
  };
}
