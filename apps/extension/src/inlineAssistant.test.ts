import { afterEach, describe, expect, it, vi } from "vitest";

import {
  disposeInlineAssistants,
  mountInlineAssistants,
} from "./inlineAssistant";

const field = {
  id: "project",
  label: "Describe a relevant project.",
  kind: "textarea" as const,
  required: true,
  value: "",
  options: [],
  maxLength: 700,
};

describe("inline writing assistant", () => {
  afterEach(() => {
    disposeInlineAssistants();
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("mounts beside an open question and writes a grounded draft into the page", async () => {
    document.body.innerHTML = `
      <label for="project">Describe a relevant project.</label>
      <textarea id="project" maxlength="120"></textarea>
    `;
    const response = {
      fieldId: "project",
      draft: "I built an accessible campus navigation app.",
      evidenceIds: ["project-campus-map"],
      notes: [],
      followUpQuestion: null,
      characterCount: 47,
      fitsLimit: true,
    };
    const sendMessage = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        response,
        sources: ["Demo resume · Projects"],
      })
      .mockResolvedValueOnce(undefined);
    vi.stubGlobal("chrome", { runtime: { sendMessage } });
    const pageField = document.querySelector<HTMLTextAreaElement>("#project");
    const onInput = vi.fn();
    pageField?.addEventListener("input", onInput);

    expect(mountInlineAssistants(document, [field])).toBe(1);
    pageField?.dispatchEvent(new MouseEvent("mouseenter"));
    const host = document.querySelector<HTMLElement>(
      '[data-applyproof-inline-assistant="project"]',
    );
    expect(host?.dataset.open).toBe("true");
    const prompt = host?.shadowRoot?.querySelector("textarea");
    const button = host?.shadowRoot?.querySelector("button");
    if (!prompt || !button)
      throw new Error("Assistant controls were not mounted");
    prompt.value = "Use the campus map project from my resume";
    button.click();

    await vi.waitFor(() =>
      expect(pageField).toHaveValue(
        "I built an accessible campus navigation app.",
      ),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "APPLYPROOF_GENERATE_INLINE_DRAFT",
        additionalPrompt: "Use the campus map project from my resume",
        field: expect.objectContaining({ id: "project", maxLength: 120 }),
      }),
    );
    expect(onInput).toHaveBeenCalledOnce();
    expect(button).toHaveAccessibleName("Regenerate answer");
    expect(host?.shadowRoot?.querySelector(".heading")).not.toBeInTheDocument();
  });

  it("automatically generates blank open questions after the first scan", async () => {
    document.body.innerHTML = `<textarea id="project"></textarea>`;
    const sendMessage = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        response: {
          fieldId: "project",
          draft: "Automatically generated grounded answer.",
          evidenceIds: ["project-campus-map"],
          notes: [],
          followUpQuestion: null,
          characterCount: 40,
          fitsLimit: true,
        },
        sources: ["Demo resume · Projects"],
      })
      .mockResolvedValueOnce(undefined);
    vi.stubGlobal("chrome", { runtime: { sendMessage } });

    mountInlineAssistants(document, [field], { generateBlankFields: true });

    await vi.waitFor(() =>
      expect(document.querySelector("#project")).toHaveValue(
        "Automatically generated grounded answer.",
      ),
    );
    expect(sendMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: "APPLYPROOF_GENERATE_INLINE_DRAFT",
        field: expect.objectContaining({ id: "project" }),
      }),
    );
  });

  it("preserves the page answer when evidence is insufficient", async () => {
    document.body.innerHTML = `<textarea id="project">My existing answer</textarea>`;
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn().mockResolvedValue({
          ok: true,
          response: {
            fieldId: "project",
            draft: "",
            evidenceIds: [],
            notes: ["More evidence is needed."],
            followUpQuestion: "Which confirmed project should be used?",
            characterCount: 0,
            fitsLimit: true,
          },
          sources: [],
        }),
      },
    });

    mountInlineAssistants(document, [field]);
    const host = document.querySelector<HTMLElement>(
      '[data-applyproof-inline-assistant="project"]',
    );
    const button = host?.shadowRoot?.querySelector("button");
    button?.click();

    await vi.waitFor(() =>
      expect(host?.shadowRoot?.querySelector(".status")).toHaveTextContent(
        "Which confirmed project should be used?",
      ),
    );
    expect(document.querySelector("#project")).toHaveValue(
      "My existing answer",
    );
  });

  it("requires a pasted job description before generating a cover letter", async () => {
    document.body.innerHTML = `
      <label for="cover_letter">Cover letter</label>
      <textarea id="cover_letter" maxlength="200000"></textarea>
    `;
    const sendMessage = vi.fn().mockResolvedValue({
      ok: true,
      response: {
        fieldId: "cover_letter",
        draft: "Grounded cover letter",
        evidenceIds: ["resume-source-1"],
        notes: [],
        followUpQuestion: null,
        characterCount: 21,
        fitsLimit: true,
      },
      sources: ["Saved resume · PROJECTS"],
    });
    vi.stubGlobal("chrome", { runtime: { sendMessage } });
    const coverField = { ...field, id: "cover_letter", label: "Cover letter" };

    mountInlineAssistants(document, [coverField], {
      generateBlankFields: true,
      job: { company: "Example Labs", role: "Frontend Engineer" },
    });

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(sendMessage).not.toHaveBeenCalled();
    const host = document.querySelector<HTMLElement>(
      '[data-applyproof-inline-assistant="cover_letter"]',
    );
    expect(host?.shadowRoot?.querySelector(".status")).toHaveTextContent(
      "Job description not found",
    );
    const prompt = host?.shadowRoot?.querySelector("textarea");
    const button = host?.shadowRoot?.querySelector("button");
    if (!prompt || !button) throw new Error("Cover letter controls missing");
    expect(prompt).toHaveAttribute("maxlength", "12000");
    prompt.value = "Build accessible React products and automated tests.";
    button.click();

    await vi.waitFor(() => expect(sendMessage).toHaveBeenCalledOnce());
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        manualJobDescription:
          "Build accessible React products and automated tests.",
        field: expect.objectContaining({ maxLength: 200000 }),
      }),
    );
  });

  it("never exposes raw internal validation errors", async () => {
    document.body.innerHTML = `<textarea id="project"></textarea>`;
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi
          .fn()
          .mockRejectedValue(
            new Error('[{"code":"too_big","path":["field","maxCharacters"]}]'),
          ),
      },
    });
    mountInlineAssistants(document, [field]);
    const host = document.querySelector<HTMLElement>(
      '[data-applyproof-inline-assistant="project"]',
    );
    host?.shadowRoot?.querySelector("button")?.click();

    await vi.waitFor(() =>
      expect(host?.shadowRoot?.querySelector(".status")).toHaveTextContent(
        "ApplyProof could not generate this answer",
      ),
    );
    expect(host?.shadowRoot?.querySelector(".status")).not.toHaveTextContent(
      "too_big",
    );
  });
});
