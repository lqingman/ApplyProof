import { describe, expect, it } from "vitest";

import {
  answerDraftRequestSchema,
  answerDraftResponseSchema,
  normalizedFieldSchema,
  pageScanSchema,
  rememberedAnswerSchema,
} from "./index";

describe("shared contracts", () => {
  it("accepts normalized form metadata", () => {
    expect(
      normalizedFieldSchema.parse({
        id: "email",
        label: "Email address",
        kind: "email",
        required: true,
        value: "",
      }),
    ).toMatchObject({ options: [] });
  });

  it("uses the evidence-first answer contract without a draft status", () => {
    const response = answerDraftResponseSchema.parse({
      fieldId: "project",
      draft: "A grounded answer",
      evidenceIds: ["project-1"],
      notes: [],
      followUpQuestion: null,
      characterCount: 17,
      fitsLimit: true,
    });
    expect(response).not.toHaveProperty("status");
    expect(response).not.toHaveProperty("confidence");
  });

  it("rejects duplicate evidence IDs", () => {
    expect(() =>
      answerDraftRequestSchema.parse({
        field: { id: "project", question: "Describe a project." },
        job: { company: "Northstar Labs", role: "Engineer", requirements: [] },
        evidence: [
          { id: "same", category: "project", text: "One", source: "Resume" },
          { id: "same", category: "skill", text: "Two", source: "Resume" },
        ],
      }),
    ).toThrow();
  });

  it("accepts a metadata-only page scan", () => {
    expect(
      pageScanSchema.parse({
        fields: [
          {
            id: "name",
            label: "Name",
            kind: "text",
            required: true,
            value: "",
          },
        ],
      }),
    ).toEqual({
      blockedCount: 0,
      fields: [
        {
          id: "name",
          label: "Name",
          kind: "text",
          required: true,
          value: "",
          options: [],
        },
      ],
    });
  });

  it("validates canonical, scoped reusable answers", () => {
    expect(
      rememberedAnswerSchema.parse({
        canonicalKey: "work_authorization.canada.authorized",
        value: "Yes",
        source: "explicit_profile_choice",
        confirmedAt: "2026-07-19T20:00:00.000Z",
        scope: { country: "CA" },
        timeDependent: false,
      }),
    ).toMatchObject({ scope: { country: "CA" } });
  });
});
