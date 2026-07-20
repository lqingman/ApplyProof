import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { mayaProfile } from "@applyproof/sample-data";

import { planAutofill } from "../../extension/src/autofill";
import { fillDocument } from "../../extension/src/pageFill";
import { scanDocument } from "../../extension/src/scanner";
import { App } from "./App";

describe("Northstar Labs application", () => {
  afterEach(cleanup);
  it("renders the complete target form", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Junior Software Engineer" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/)).toHaveAttribute(
      "type",
      "email",
    );
    expect(
      screen.getByLabelText(/legally authorized to work in Canada/),
    ).toBeRequired();
    expect(
      screen.getByLabelText(/require employment sponsorship/),
    ).toBeRequired();
    expect(
      screen.getByLabelText(/Describe a relevant project/),
    ).toHaveAttribute("maxlength", "700");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(
      screen.getByRole("button", { name: "Submit application" }),
    ).toBeInTheDocument();
  });

  it("provides a fully labelled, safe Phase 2 scan fixture", () => {
    render(<App />);

    const fields = scanDocument(document);

    expect(fields).toHaveLength(24);
    expect(fields.every((field) => field.label.length > 2)).toBe(true);
    expect(fields.some((field) => field.id === "password")).toBe(false);
    expect(fields.find((field) => field.id === "relocation")).toMatchObject({
      label: "Are you open to relocating?",
      kind: "radio",
      options: ["Yes", "No"],
    });
    expect(fields.find((field) => field.id === "motivation")).toMatchObject({
      label: "Why are you interested in this role?",
      kind: "textarea",
      maxLength: 500,
    });
    expect(fields.find((field) => field.id === "strengths")).toMatchObject({
      maxLength: 500,
    });
  });

  it("safely autofills the complete deterministic Phase 3 mapping", () => {
    render(<App />);

    const plan = planAutofill(mayaProfile, scanDocument(document));
    const results = fillDocument(document, plan.fills);

    expect(plan.fills).toHaveLength(20);
    expect(results.every((result) => result.status === "filled")).toBe(true);
    expect(screen.getByLabelText(/First name/)).toHaveValue("Maya");
    expect(screen.getByLabelText(/Email address/)).toHaveValue(
      "maya.chen@example.com",
    );
    expect(screen.getByLabelText(/School or university/)).toHaveValue(
      "University of British Columbia",
    );
    expect(screen.getByLabelText(/Education start date/)).toHaveValue(
      "2022-09-01",
    );
    expect(
      screen.getByLabelText(/legally authorized to work in Canada/),
    ).toHaveValue("Yes");
    expect(screen.getByLabelText(/require employment sponsorship/)).toHaveValue(
      "No",
    );
    expect(screen.getByLabelText("Woman")).toBeChecked();
    expect(screen.getByLabelText("Asian")).toBeChecked();
    expect(
      document.querySelector('input[name="disability"][value="no"]'),
    ).toBeChecked();
    expect(
      document.querySelector('input[name="lgbtq"][value="decline"]'),
    ).toBeChecked();
    expect(screen.getByLabelText("Not a veteran")).toBeChecked();
    expect(screen.getByLabelText(/I confirm that I reviewed/)).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Submit application" }),
    ).not.toBeDisabled();
  });
});
