import { mayaProfile } from "@applyproof/sample-data";
import { describe, expect, it } from "vitest";

import { buildDraftRequest, selectEvidence } from "./evidence";

const field = {
  id: "project",
  label: "Describe a relevant project.",
  kind: "textarea" as const,
  required: true,
  value: "",
  options: [],
  maxLength: 700,
};

describe("answer evidence selection", () => {
  it("selects only the relevant project record and limited job context", () => {
    const request = buildDraftRequest(mayaProfile, field);
    expect(request.evidence.map((record) => record.id)).toEqual([
      "project-campus-map",
    ]);
    expect(request.field.maxCharacters).toBe(700);
    expect(request.job).toMatchObject({
      company: "Northstar Labs",
      role: "Junior Software Engineer",
    });
  });

  it("uses relevant resume evidence for an AI workflow draft", () => {
    expect(
      selectEvidence(mayaProfile, {
        ...field,
        id: "ai-workflow",
        label: "How do you use AI in your development workflow?",
      }).map((record) => record.id),
    ).toEqual(["project-campus-map", "experience-coop", "skills-stack"]);
  });

  it("passes an extra instruction and all verified evidence for user-directed selection", () => {
    const request = buildDraftRequest(
      mayaProfile,
      field,
      "Use the campus map project from my resume",
    );

    expect(request.additionalPrompt).toBe(
      "Use the campus map project from my resume",
    );
    expect(request.evidence).toEqual(mayaProfile.evidence);
  });
});
