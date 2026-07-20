import { describe, expect, it } from "vitest";
import { mayaProfile } from "@applyproof/sample-data";
import type { NormalizedField } from "@applyproof/shared-types";

import { planAutofill } from "./autofill";

function field(
  id: string,
  overrides: Partial<NormalizedField> = {},
): NormalizedField {
  return {
    id,
    label: id,
    kind: "text",
    required: false,
    value: "",
    options: [],
    ...overrides,
  };
}

describe("safe autofill planning", () => {
  it("maps deterministic profile fields", () => {
    const { fills } = planAutofill(mayaProfile, [
      field("first-name"),
      field("email", { kind: "email" }),
      field("school"),
      field("education-start-date", { kind: "date" }),
      field("graduation-date", { kind: "date" }),
      field("relocation", { kind: "radio", options: ["Yes", "No"] }),
      field("work-authorization", {
        kind: "select",
        options: ["Yes", "No"],
      }),
      field("sponsorship", {
        label: "Will you now or in the future require sponsorship?",
        kind: "select",
        options: ["Yes", "No"],
      }),
      field("gender", {
        kind: "radio",
        options: ["Woman", "Man", "Non-binary", "Prefer not to say"],
      }),
      field("accuracyConfirmation", { kind: "checkbox", required: true }),
    ]);

    expect(fills).toEqual([
      { fieldId: "first-name", value: "Maya" },
      { fieldId: "email", value: "maya.chen@example.com" },
      { fieldId: "school", value: "University of British Columbia" },
      { fieldId: "education-start-date", value: "2022-09-01" },
      { fieldId: "graduation-date", value: "2026-05-15" },
      { fieldId: "relocation", value: "yes" },
      {
        fieldId: "work-authorization",
        value: "Yes",
      },
      { fieldId: "sponsorship", value: "No" },
      { fieldId: "gender", value: "Woman" },
      { fieldId: "accuracyConfirmation", value: "true" },
    ]);
  });

  it("preserves existing values and routes open answers to review", () => {
    const { decisions, fills } = planAutofill(mayaProfile, [
      field("email", { value: "existing@example.com" }),
      field("motivation", { kind: "textarea", required: true }),
      field("accuracyConfirmation", { kind: "checkbox", required: true }),
    ]);

    expect(fills).toEqual([{ fieldId: "accuracyConfirmation", value: "true" }]);
    expect(
      decisions.map(({ field: item, action }) => [item.id, action]),
    ).toEqual([
      ["email", "review"],
      ["motivation", "review"],
      ["accuracyConfirmation", "fill"],
    ]);
  });

  it("autofills a saved prefer-not-to-say demographic choice", () => {
    const profile = {
      ...mayaProfile,
      demographics: { genderIdentity: "decline" as const },
    };
    const { fills } = planAutofill(profile, [
      field("gender", { kind: "radio" }),
    ]);

    expect(fills).toEqual([{ fieldId: "gender", value: "Prefer not to say" }]);
  });

  it("maps explicitly saved voluntary answers by question meaning", () => {
    const { fills } = planAutofill(mayaProfile, [
      field("question-101", {
        label: "Race or ethnicity",
        kind: "radio",
        options: ["Asian", "Black or African American", "White"],
      }),
      field("question-102", {
        label: "Disability status",
        kind: "select",
        options: ["Yes", "No", "Prefer not to say"],
      }),
      field("question-103", {
        label: "Veteran or military service status",
        kind: "radio",
        options: ["Veteran", "Not a veteran", "Prefer not to say"],
      }),
    ]);

    expect(fills).toEqual([
      { fieldId: "question-101", value: "Asian" },
      { fieldId: "question-102", value: "No" },
      { fieldId: "question-103", value: "Not a veteran" },
    ]);
  });

  it("autofills an explicit prefer-not-to-say authorization choice", () => {
    const profile = {
      ...mayaProfile,
      workAuthorization: {
        canada: {
          authorized: "decline" as const,
          sponsorship: "decline" as const,
        },
      },
    };
    const { fills } = planAutofill(profile, [
      field("work-authorization", { kind: "select" }),
    ]);

    expect(fills).toEqual([
      { fieldId: "work-authorization", value: "Prefer not to say" },
    ]);
  });

  it("reuses a scoped answer only for a high-confidence equivalent question", () => {
    const remembered = [
      {
        canonicalKey: "work_authorization.canada.authorized",
        value: "Yes",
        source: "explicit_profile_choice" as const,
        confirmedAt: "2026-07-19T20:00:00.000Z",
        scope: { country: "CA" },
        timeDependent: false,
      },
    ];
    const { fills } = planAutofill(
      mayaProfile,
      [
        field("eligibility-question", {
          label: "Are you legally authorized to work in Canada?",
          kind: "select",
          options: ["Yes", "No"],
        }),
        field("us-eligibility", {
          label: "Are you legally authorized to work in the United States?",
          kind: "select",
        }),
      ],
      remembered,
    );

    expect(fills).toEqual([{ fieldId: "eligibility-question", value: "Yes" }]);
  });
});
