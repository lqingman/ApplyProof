import { describe, expect, it, vi } from "vitest";
import type { AnswerDraftRequest } from "@applyproof/shared-types";

import { generateAnswerDraft } from "./answerApi";

describe("answer drafting client", () => {
  it("returns a friendly local error instead of exposing schema details", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const request = {
      field: {
        id: "cover_letter",
        question: "Cover letter",
        maxCharacters: 200_000,
      },
      job: {
        company: "Example Labs",
        role: "Frontend Engineer",
        requirements: [],
        description: "Build accessible products.",
      },
      evidence: [],
    } as AnswerDraftRequest;

    await expect(generateAnswerDraft(request)).rejects.toThrow(
      "ApplyProof could not prepare this draft",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
