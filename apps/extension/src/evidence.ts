import type {
  AnswerDraftRequest,
  CandidateProfile,
  EvidenceRecord,
  NormalizedField,
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
    return profile.evidence.filter((record) => resumeIds.has(record.id));
  }
  if (selectedIds) {
    return selectedIds
      .map((id) => profile.evidence.find((record) => record.id === id))
      .filter((record): record is EvidenceRecord => record !== undefined);
  }

  const words = new Set(
    `${field.label} ${northstarJob.requirements.join(" ")}`
      .toLowerCase()
      .match(/[a-z]{3,}/g) ?? [],
  );
  return profile.evidence
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
}

export function buildDraftRequest(
  profile: CandidateProfile,
  field: NormalizedField,
  additionalPrompt?: string,
): AnswerDraftRequest {
  const instruction = additionalPrompt?.trim();
  return {
    field: {
      id: field.id,
      question: field.label,
      ...(field.maxLength ? { maxCharacters: field.maxLength } : {}),
    },
    job: northstarJob,
    evidence: selectEvidence(profile, field, instruction),
    ...(instruction ? { additionalPrompt: instruction } : {}),
  };
}
