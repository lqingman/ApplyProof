import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { generateAnswerDraft } from "./answerApi";
import { fillActivePage, scanActivePage } from "./browser";

vi.mock("./answerApi", () => ({ generateAnswerDraft: vi.fn() }));

vi.mock("./browser", () => ({
  scanActivePage: vi.fn().mockResolvedValue({
    blockedCount: 1,
    fields: [
      {
        id: "email",
        label: "Email address",
        kind: "email",
        required: true,
        value: "",
        options: [],
      },
      {
        id: "work-authorization",
        label: "Work authorization",
        kind: "select",
        required: true,
        value: "",
        options: ["Authorized"],
      },
      {
        id: "gender",
        label: "Gender identity",
        kind: "radio",
        required: false,
        value: "",
        options: ["Woman"],
      },
    ],
  }),
  fillActivePage: vi
    .fn()
    .mockResolvedValue([{ fieldId: "email", status: "filled" }]),
  focusField: vi.fn().mockResolvedValue(undefined),
}));

describe("profile-first autofill workflow", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("requires profile selection before autofill", () => {
    render(<App />);

    expect(
      screen.getByRole("button", { name: "Scan & Autofill" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Use Maya demo profile" }),
    );
    expect(
      screen.getByRole("button", { name: "Scan & Autofill" }),
    ).toBeEnabled();
    expect(screen.getByText("Selected")).toBeInTheDocument();
  });

  it("prioritizes outcomes and review exceptions after autofill", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Use Maya demo profile" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Scan & Autofill" }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Autofill summary" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Safely filled").previousSibling).toHaveTextContent(
      "1",
    );
    expect(screen.getByText("Need review").previousSibling).toHaveTextContent(
      "1",
    );
    expect(screen.getByText("Skipped").previousSibling).toHaveTextContent("1");
    expect(screen.getByText("Blocked").previousSibling).toHaveTextContent("1");
    expect(
      screen.getByText(
        "Work authorization is high risk and must be confirmed by you.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("View all 3 detected safe fields"),
    ).toBeInTheDocument();
  });

  it("keeps a draft in review until the user fills the exact text", async () => {
    vi.mocked(scanActivePage).mockResolvedValueOnce({
      blockedCount: 0,
      fields: [
        {
          id: "project",
          label: "Describe a relevant project.",
          kind: "textarea",
          required: true,
          value: "",
          options: [],
          maxLength: 700,
        },
      ],
    });
    vi.mocked(fillActivePage)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ fieldId: "project", status: "filled" }]);
    vi.mocked(generateAnswerDraft).mockResolvedValueOnce({
      fieldId: "project",
      draft: "A grounded project answer.",
      evidenceIds: ["project-campus-map"],
      notes: ["No measurable outcome is recorded."],
      followUpQuestion: null,
      characterCount: 26,
      fitsLimit: true,
    });
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Use Maya demo profile" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Scan & Autofill" }));
    await screen.findByRole("button", { name: "Generate grounded draft" });
    fireEvent.click(
      screen.getByRole("button", { name: "Generate grounded draft" }),
    );

    const editor = await screen.findByLabelText(
      "Reviewed answer for Describe a relevant project.",
    );
    expect(editor).toHaveValue("A grounded project answer.");
    expect(screen.getByText("Need review").previousSibling).toHaveTextContent(
      "1",
    );
    fireEvent.change(editor, {
      target: { value: "My reviewed exact answer." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fill answer" }));

    await waitFor(() =>
      expect(fillActivePage).toHaveBeenLastCalledWith([
        { fieldId: "project", value: "My reviewed exact answer." },
      ]),
    );
    expect(screen.getByText("Need review").previousSibling).toHaveTextContent(
      "0",
    );
    expect(screen.getByText("Safely filled").previousSibling).toHaveTextContent(
      "1",
    );
  });
});
