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
import {
  enableInlineAssistants,
  fillActivePage,
  scanActivePage,
} from "./browser";

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
      {
        id: "accuracyConfirmation",
        label: "I confirm this application is accurate",
        kind: "checkbox",
        required: true,
        value: "",
        options: [],
      },
    ],
  }),
  fillActivePage: vi.fn().mockResolvedValue([
    { fieldId: "email", status: "filled" },
    { fieldId: "work-authorization", status: "filled" },
    { fieldId: "gender", status: "filled" },
    { fieldId: "accuracyConfirmation", status: "filled" },
  ]),
  enableInlineAssistants: vi.fn().mockResolvedValue(0),
  focusField: vi.fn().mockResolvedValue(undefined),
}));

describe("profile-first autofill workflow", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

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

  it("keeps the completed workflow compact after autofill", async () => {
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Use Maya demo profile" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Scan & Autofill" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Autofill complete"),
    );
    expect(
      screen.queryByRole("heading", { name: "Autofill summary" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Review queue" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/View all .* detected safe fields/),
    ).not.toBeInTheDocument();
    expect(fillActivePage).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          fieldId: "work-authorization",
          value: "Authorized to work in Canada",
        },
        { fieldId: "gender", value: "woman" },
        { fieldId: "accuracyConfirmation", value: "true" },
      ]),
    );
  });

  it("routes open questions to the page without rendering a side-panel queue", async () => {
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
    vi.mocked(fillActivePage).mockResolvedValueOnce([]);
    vi.mocked(enableInlineAssistants).mockResolvedValueOnce(1);
    render(<App />);

    fireEvent.click(
      screen.getByRole("button", { name: "Use Maya demo profile" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Scan & Autofill" }));
    await waitFor(() =>
      expect(enableInlineAssistants).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "project" })]),
      ),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Some fields still need your attention on the page",
    );
    expect(
      screen.queryByRole("heading", { name: "Review queue" }),
    ).not.toBeInTheDocument();
  });

  it("generates page requests with the user's extra instruction", async () => {
    const addListener = vi.fn();
    vi.stubGlobal("chrome", {
      runtime: {
        onMessage: {
          addListener,
          removeListener: vi.fn(),
        },
      },
    });
    vi.mocked(generateAnswerDraft).mockResolvedValue({
      fieldId: "project",
      draft: "A grounded project answer.",
      evidenceIds: ["project-campus-map"],
      notes: [],
      followUpQuestion: null,
      characterCount: 26,
      fitsLimit: true,
    });
    render(<App />);
    const listener = addListener.mock.calls[0]?.[0] as (
      message: unknown,
      sender: unknown,
      sendResponse: (response: unknown) => void,
    ) => boolean;
    const sendResponse = vi.fn();

    expect(
      listener(
        {
          type: "APPLYPROOF_GENERATE_INLINE_DRAFT",
          field: {
            id: "project",
            label: "Describe a relevant project.",
            kind: "textarea",
            required: true,
            value: "",
            options: [],
          },
          additionalPrompt: "Use my campus map project",
        },
        {},
        sendResponse,
      ),
    ).toBe(true);
    await waitFor(() =>
      expect(generateAnswerDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalPrompt: "Use my campus map project",
        }),
      ),
    );
    await waitFor(() =>
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ ok: true }),
      ),
    );
  });
});
