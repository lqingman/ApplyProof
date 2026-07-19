import {
  answerDraftRequestSchema,
  answerDraftResponseSchema,
  type AnswerDraftRequest,
  type AnswerDraftResponse,
} from "@applyproof/shared-types";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function generateAnswerDraft(
  request: AnswerDraftRequest,
): Promise<AnswerDraftResponse> {
  const response = await fetch(`${apiBaseUrl}/v1/answer-drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(answerDraftRequestSchema.parse(request)),
  });
  if (!response.ok) {
    throw new Error("Drafting is unavailable. Your answer was not changed.");
  }
  return answerDraftResponseSchema.parse(await response.json());
}
