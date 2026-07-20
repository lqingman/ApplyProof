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
  attachResumeToActivePage,
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
import {
  deleteSavedResumeFile,
  loadSavedResumeFile,
  loadSavedResumeMetadata,
  loadSavedResumeText,
  saveResumeFile,
} from "./resumeFileStorage";

vi.mock("./answerApi", () => ({ generateAnswerDraft: vi.fn() }));

vi.mock("./browser", () => ({
  attachResumeToActivePage: vi.fn().mockResolvedValue("attached"),
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
vi.mock("./resumeFileStorage", () => ({
  deleteSavedResumeFile: vi.fn(),
  loadSavedResumeFile: vi.fn(),
  loadSavedResumeMetadata: vi.fn(),
  loadSavedResumeText: vi.fn(),
  saveResumeFile: vi.fn(),
}));

describe("profile-first autofill workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadMyProfile).mockResolvedValue(null);
    vi.mocked(loadRememberedAnswers).mockResolvedValue([]);
    vi.mocked(loadSavedResumeMetadata).mockResolvedValue(null);
    vi.mocked(loadSavedResumeFile).mockResolvedValue(null);
    vi.mocked(loadSavedResumeText).mockResolvedValue(null);
    vi.mocked(saveMyProfile).mockImplementation(async (profile) => profile);
    vi.mocked(resetMyProfile).mockResolvedValue(undefined);
    vi.mocked(deleteSavedResumeFile).mockResolvedValue(undefined);
    vi.mocked(saveResumeFile).mockImplementation(async (file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      savedAt: "2026-07-19T20:00:00.000Z",
    }));
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

  it("attaches the locally saved resume during user-initiated autofill", async () => {
    const file = new File(["resume"], "maya.pdf", {
      type: "application/pdf",
    });
    vi.mocked(loadMyProfile).mockResolvedValue(mayaProfile);
    vi.mocked(loadSavedResumeMetadata).mockResolvedValue({
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      savedAt: "2026-07-19T20:00:00.000Z",
    });
    vi.mocked(loadSavedResumeFile).mockResolvedValue(file);
    render(<App />);
    await screen.findByText("Saved");
    expect(screen.queryByText("maya.pdf")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Scan & Autofill" }));

    await waitFor(() =>
      expect(attachResumeToActivePage).toHaveBeenCalledWith(file),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Saved resume attached",
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
        undefined,
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
    vi.mocked(loadSavedResumeText).mockResolvedValue(
      "PROJECTS\nBuilt a React accessibility dashboard with automated tests.",
    );
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit profile" }),
    );
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
          job: {
            company: "Example Labs",
            role: "Frontend Engineer",
            description: "Build accessible React products.",
          },
        },
        {},
        sendResponse,
      ),
    ).toBe(true);
    await waitFor(() =>
      expect(generateAnswerDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalPrompt: "Use my campus map project",
          job: expect.objectContaining({
            company: "Example Labs",
            role: "Frontend Engineer",
          }),
          evidence: expect.arrayContaining([
            expect.objectContaining({
              text: "Built a React accessibility dashboard with automated tests.",
              source: "Saved resume · PROJECTS",
            }),
          ]),
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
      reviews: [],
      notes: ["AI extraction completed."],
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
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Built a tested TypeScript application.",
    );
    expect(screen.queryByLabelText("Summary")).not.toBeInTheDocument();
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

  it("replaces existing education with the latest AI resume extraction", async () => {
    vi.mocked(loadMyProfile).mockResolvedValue(mayaProfile);
    vi.mocked(importResumeFile).mockResolvedValue({
      education: [
        {
          school: "Simon Fraser University",
          degree: "Master of Applied Science",
          startDate: "2025-09-01",
          graduationDate: "2027-05-01",
        },
      ],
      experience: [],
      evidence: [],
      reviews: [
        {
          fieldPath: "education.0.school",
          sourceText: "Simon Fraser University",
          confidence: "high",
        },
      ],
      notes: ["AI extraction completed."],
    });
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit profile" }),
    );

    fireEvent.change(screen.getByLabelText("Choose Word or PDF resume"), {
      target: {
        files: [
          new File(["updated resume"], "updated.pdf", {
            type: "application/pdf",
          }),
        ],
      },
    });

    await waitFor(() =>
      expect(screen.getByLabelText("School")).toHaveValue(
        "Simon Fraser University",
      ),
    );
    expect(screen.getAllByLabelText("School")).toHaveLength(1);
    expect(screen.getByLabelText("Degree or program")).toHaveValue(
      "Master of Applied Science",
    );
    expect(
      screen.queryByDisplayValue("University of British Columbia"),
    ).not.toBeInTheDocument();
  });

  it("replaces My resume file without changing profile fields", async () => {
    vi.mocked(loadMyProfile).mockResolvedValue(mayaProfile);
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit profile" }),
    );
    const file = new File(["replacement"], "replacement.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(screen.getByLabelText("Replace My resume file"), {
      target: { files: [file] },
    });

    await waitFor(() => expect(saveResumeFile).toHaveBeenCalledWith(file));
    expect(saveMyProfile).not.toHaveBeenCalled();
    expect(await screen.findByText("replacement.pdf")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("maya.chen@example.com");
  });

  it("deletes My resume file without deleting parsed profile data", async () => {
    vi.mocked(loadMyProfile).mockResolvedValue(mayaProfile);
    vi.mocked(loadSavedResumeMetadata).mockResolvedValue({
      name: "maya.pdf",
      type: "application/pdf",
      size: 100,
      lastModified: 123,
      savedAt: "2026-07-19T20:00:00.000Z",
    });
    render(<App />);
    expect(screen.queryByText("maya.pdf")).not.toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit profile" }),
    );
    await screen.findByText("maya.pdf");

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteSavedResumeFile).toHaveBeenCalledOnce());
    expect(screen.getByText("No resume uploaded")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("maya.chen@example.com");
    expect(saveMyProfile).not.toHaveBeenCalled();
  });

  it("saves an imported resume file only when the edited profile is saved", async () => {
    vi.mocked(loadMyProfile).mockResolvedValue(mayaProfile);
    vi.mocked(importResumeFile).mockResolvedValue({
      education: [],
      experience: [],
      evidence: [],
      reviews: [],
      notes: ["AI extraction completed."],
      sourceText: "PROJECTS\nBuilt an accessibility dashboard.",
    });
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit profile" }),
    );
    const file = new File(["updated resume"], "updated.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(screen.getByLabelText("Choose Word or PDF resume"), {
      target: { files: [file] },
    });
    await screen.findByText(/updated.pdf is not saved yet/);
    expect(saveResumeFile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save My Profile" }));

    await waitFor(() =>
      expect(saveResumeFile).toHaveBeenCalledWith(
        file,
        "PROJECTS\nBuilt an accessibility dashboard.",
      ),
    );
    expect(screen.queryByText("updated.pdf")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit profile" }));
    expect(await screen.findByText("updated.pdf")).toBeInTheDocument();
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
