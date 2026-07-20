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
import { mayaProfile } from "@applyproof/sample-data";
import {
  enableInlineAssistants,
  fillActivePage,
  scanActivePage,
} from "./browser";
import {
  loadMyProfile,
  loadRememberedAnswers,
  resetMyProfile,
  saveMyProfile,
} from "./profileStorage";
import { importResumeFile } from "./resumeImport";

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
        label: "Are you legally authorized to work in Canada?",
        kind: "select",
        required: true,
        value: "",
        options: ["Yes", "No"],
      },
      {
        id: "sponsorship",
        label: "Will you require sponsorship now or in the future?",
        kind: "select",
        required: true,
        value: "",
        options: ["Yes", "No"],
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
    { fieldId: "sponsorship", status: "filled" },
    { fieldId: "gender", status: "filled" },
    { fieldId: "accuracyConfirmation", status: "filled" },
  ]),
  enableInlineAssistants: vi.fn().mockResolvedValue(0),
  focusField: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./profileStorage", () => ({
  loadMyProfile: vi.fn(),
  loadRememberedAnswers: vi.fn(),
  saveMyProfile: vi.fn(),
  resetMyProfile: vi.fn(),
}));

vi.mock("./resumeImport", () => ({ importResumeFile: vi.fn() }));

describe("profile-first autofill workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadMyProfile).mockResolvedValue(null);
    vi.mocked(loadRememberedAnswers).mockResolvedValue([]);
    vi.mocked(saveMyProfile).mockImplementation(async (profile) => profile);
    vi.mocked(resetMyProfile).mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads demo data into the single persistent profile before autofill", async () => {
    render(<App />);

    expect(
      screen.getByRole("button", { name: "Scan & Autofill" }),
    ).toBeDisabled();
    fireEvent.click(
      await screen.findByRole("button", { name: "Load Maya demo data" }),
    );
    await waitFor(() =>
      expect(saveMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({ id: "my-profile", displayName: "Maya Chen" }),
      ),
    );
    expect(
      screen.getByRole("button", { name: "Scan & Autofill" }),
    ).toBeEnabled();
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("starts a blank profile directly from the From scratch action", async () => {
    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", { name: "From scratch" }),
    );

    expect(
      screen.getByRole("heading", { name: "Create profile" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveValue("");
    expect(importResumeFile).not.toHaveBeenCalled();
  });

  it("keeps the completed workflow compact after autofill", async () => {
    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Load Maya demo data" }),
    );
    await screen.findByText("Saved");
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
          value: "Yes",
        },
        { fieldId: "sponsorship", value: "No" },
        { fieldId: "gender", value: "Woman" },
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
      await screen.findByRole("button", { name: "Load Maya demo data" }),
    );
    await screen.findByText("Saved");
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
    vi.mocked(loadMyProfile).mockResolvedValue(mayaProfile);
    render(<App />);
    await screen.findByText("Saved");
    await waitFor(() => expect(addListener).toHaveBeenCalled());
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

  it("edits and saves My Profile for subsequent fills", async () => {
    vi.mocked(loadMyProfile).mockResolvedValue(mayaProfile);
    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Edit profile" }),
    );
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new.email@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save My Profile" }));

    await waitFor(() =>
      expect(saveMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "my-profile",
          identity: expect.objectContaining({ email: "new.email@example.com" }),
        }),
      ),
    );
    expect(
      await screen.findByText("new.email@example.com"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Scan & Autofill" }));
    await waitFor(() =>
      expect(fillActivePage).toHaveBeenCalledWith(
        expect.arrayContaining([
          { fieldId: "email", value: "new.email@example.com" },
        ]),
      ),
    );
  });

  it("imports editable profile fields from a Word resume", async () => {
    vi.mocked(importResumeFile).mockResolvedValue({
      firstName: "Jordan",
      lastName: "Lee",
      email: "jordan@example.com",
      phone: "+1 604 555 0100",
      location: "Vancouver, BC",
      portfolio: "https://github.com/jordanlee",
      linkedin: "https://www.linkedin.com/in/jordanlee",
      education: [
        {
          school: "University of British Columbia",
          degree: "BSc Computer Science",
          startDate: "2022-09-01",
          graduationDate: "2026-05-01",
        },
        {
          school: "Langara College",
          degree: "Diploma in Web Development",
          startDate: "2021-09-01",
          graduationDate: "2023-05-01",
        },
      ],
      experience: [
        {
          company: "Example Labs",
          title: "Software Developer",
          startDate: "May 2024",
          endDate: "Present",
          description: "Built a tested TypeScript application.",
        },
      ],
      evidence: ["Built a tested TypeScript application."],
    });
    render(<App />);

    const file = new File(["docx bytes"], "jordan-resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    fireEvent.click(await screen.findByRole("button", { name: "From resume" }));
    fireEvent.change(screen.getByLabelText("Resume file"), {
      target: { files: [file] },
    });

    await waitFor(() =>
      expect(screen.getByLabelText("Email")).toHaveValue("jordan@example.com"),
    );
    expect(importResumeFile).toHaveBeenCalledWith(file);
    expect(screen.getByLabelText("First name")).toHaveValue("Jordan");
    expect(screen.queryByLabelText("Headline")).not.toBeInTheDocument();
    expect(screen.getByLabelText("LinkedIn URL")).toHaveValue(
      "https://www.linkedin.com/in/jordanlee",
    );
    expect(screen.getAllByLabelText("School")).toHaveLength(2);
    expect(screen.getAllByLabelText("Degree or program")).toHaveLength(2);
    expect(screen.getAllByLabelText("Start date")[0]).toHaveValue("2022-09-01");
    expect(screen.getByLabelText("Job title")).toHaveValue(
      "Software Developer",
    );
    expect(screen.getByLabelText("Company")).toHaveValue("Example Labs");
    expect(screen.getByLabelText("One verified fact per line")).toHaveValue(
      "Built a tested TypeScript application.",
    );
    expect(
      screen.getByLabelText("Are you legally authorized to work in Canada?"),
    ).toHaveValue("");
    expect(
      screen.getByLabelText(
        "Will you now or in the future require employment sponsorship?",
      ),
    ).toHaveValue("");
    expect(
      screen.getByText(/Review every field before saving/),
    ).toHaveTextContent("Review every field before saving");
  });

  it("deletes the locally saved profile through the reset control", async () => {
    vi.mocked(loadMyProfile).mockResolvedValue(mayaProfile);
    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Reset local data" }),
    );

    await waitFor(() => expect(resetMyProfile).toHaveBeenCalledOnce());
    expect(
      screen.getByRole("button", { name: "From scratch" }),
    ).toBeInTheDocument();
  });

  it("offers recovery when saved local data is unreadable", async () => {
    vi.mocked(loadRememberedAnswers).mockRejectedValue(
      new Error("Saved application preferences could not be read."),
    );
    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Delete unreadable local data",
      }),
    );

    await waitFor(() => expect(resetMyProfile).toHaveBeenCalledOnce());
  });
});
