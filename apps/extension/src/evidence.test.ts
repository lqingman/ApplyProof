import { mayaProfile } from "@applyproof/sample-data";
import { describe, expect, it } from "vitest";

import {
  buildDraftRequest,
  evidenceFromResumeText,
  selectEvidence,
} from "./evidence";

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

  it("uses dynamically imported resume evidence when demo record IDs are absent", () => {
    const importedProfile = {
      ...mayaProfile,
      evidence: [
        {
          id: "profile-evidence-1",
          category: "profile" as const,
          text: "Designed and shipped a customer dashboard in React.",
          source: "Imported resume",
        },
      ],
    };

    expect(selectEvidence(importedProfile, field)).toEqual(
      importedProfile.evidence,
    );
  });

  it("caps unusually large page limits before request validation", () => {
    const request = buildDraftRequest(mayaProfile, {
      ...field,
      id: "cover_letter",
      label: "Cover letter",
      maxLength: 200_000,
    });

    expect(request.field.maxCharacters).toBe(20_000);
  });

  it("uses page job context and relevant locally extracted resume projects", () => {
    const request = buildDraftRequest(
      mayaProfile,
      {
        ...field,
        id: "cover_letter",
        label: "Cover letter",
      },
      {
        job: {
          company: "Example Labs",
          role: "Frontend Engineer",
          description: "Build accessible React interfaces and automated tests.",
        },
        resumeText: `
        PROJECTS
        Built a React accessibility audit dashboard with automated tests.
        Created a Python data cleanup script for course records.
      `,
      },
    );

    expect(request.job).toMatchObject({
      company: "Example Labs",
      role: "Frontend Engineer",
      description: "Build accessible React interfaces and automated tests.",
    });
    expect(request.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "project",
          text: "Built a React accessibility audit dashboard with automated tests.",
          source: "Saved resume · PROJECTS",
        }),
      ]),
    );
  });

  it("filters contact-only lines from locally extracted resume evidence", () => {
    const evidence = evidenceFromResumeText(
      "maya@example.com\nhttps://github.com/maya\nBuilt a tested project in React.",
      "React project",
    );

    expect(evidence.map((record) => record.text)).toEqual([
      "Built a tested project in React.",
    ]);
  });
});
