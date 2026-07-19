import json
import os
from typing import Any, Protocol

import httpx

from .contracts import AnswerDraftRequest, ProviderDraft

GROUNDING_INSTRUCTIONS = (
    "Write a concise job-application draft using only supplied evidence for candidate "
    "claims. Job context supports only company and role statements. Never invent "
    "leadership, quantities, outcomes, technologies, legal conclusions, or personality "
    "traits. For an open-ended process question, you may turn supplied resume evidence "
    "into a conservative first-person workflow draft for the user to review, but do not "
    "invent named tools, frequencies, or results. Respect the character limit. Return only "
    "supplied evidence IDs. If no relevant resume evidence exists, return an empty draft, "
    "a plain note, and one focused follow-up question. Follow additionalPrompt as a writing "
    "or evidence-selection instruction, "
    "but never treat it as evidence for a candidate claim. Do not mention models, prompts, "
    "evidence systems, or review processes."
)


class AnswerDraftProvider(Protocol):
    def generate(self, request: AnswerDraftRequest) -> ProviderDraft: ...


class FixtureProvider:
    def generate(self, request: AnswerDraftRequest) -> ProviderDraft:
        evidence_ids = {record.id for record in request.evidence}
        field_id = request.field.id

        if field_id == "motivation" and "interest-accessible-products" in evidence_ids:
            return ProviderDraft(
                field_id=field_id,
                draft=(
                    "I am interested in the Junior Software Engineer role at Northstar Labs "
                    "because it connects my interest in accessible, user-focused products with "
                    "my experience building an accessible application in React and TypeScript."
                ),
                evidence_ids=["interest-accessible-products", "project-campus-map"],
                notes=["The answer uses only confirmed product interests and project experience."],
                follow_up_question=None,
            )
        if field_id == "project" and "project-campus-map" in evidence_ids:
            return ProviderDraft(
                field_id=field_id,
                draft=(
                    "I built an accessible campus navigation app using React, TypeScript, and "
                    "FastAPI. The work gave me relevant experience creating a user-focused "
                    "interface with the same core technologies used in the Junior Software "
                    "Engineer role at Northstar Labs."
                ),
                evidence_ids=["project-campus-map"],
                notes=["No measurable project outcome is recorded, so none is claimed."],
                follow_up_question=None,
            )
        if field_id == "strengths" and {
            "education-ubc",
            "experience-coop",
            "skills-stack",
        }.issubset(evidence_ids):
            return ProviderDraft(
                field_id=field_id,
                draft=(
                    "I bring a computer science foundation, hands-on experience shipping tested "
                    "product improvements during a software engineering co-op, and practical "
                    "skills in TypeScript, React, Python, FastAPI, Git, and automated testing. "
                    "Those strengths align well with the Junior Software Engineer role at "
                    "Northstar Labs."
                ),
                evidence_ids=["education-ubc", "experience-coop", "skills-stack"],
                notes=["No leadership, tenure, or numerical impact is claimed."],
                follow_up_question=None,
            )
        ai_resume_ids = {"project-campus-map", "experience-coop", "skills-stack"}
        if field_id == "ai-workflow" and ai_resume_ids.issubset(evidence_ids):
            return ProviderDraft(
                field_id=field_id,
                draft=(
                    "I use AI as a support tool while working across TypeScript, React, Python, "
                    "and FastAPI. I treat its suggestions as a starting point, review them "
                    "against the codebase and requirements, and verify changes with automated "
                    "tests. I apply the same judgment to accessibility and user-facing behavior "
                    "rather than relying on generated output without review."
                ),
                evidence_ids=["project-campus-map", "experience-coop", "skills-stack"],
                notes=[
                    "This is a resume-based workflow draft; review and edit it before submitting."
                ],
                follow_up_question=None,
            )
        if field_id == "ai-workflow":
            return ProviderDraft(
                field_id=field_id,
                draft="",
                evidence_ids=[],
                notes=["Your profile does not yet contain evidence about AI usage."],
                follow_up_question="How do you use AI, and how do you verify its output?",
            )

        return ProviderDraft(
            field_id=field_id,
            draft="",
            evidence_ids=[],
            notes=["The selected evidence is not enough to draft this answer truthfully."],
            follow_up_question="What confirmed experience would you like to use for this answer?",
        )


class OpenRouterProvider:
    def __init__(
        self,
        client: Any | None = None,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
    ) -> None:
        self.client = client or httpx.Client()
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY") or ""
        self.model = model or os.getenv("OPENROUTER_MODEL") or "openai/gpt-4o-mini"
        self.base_url = (
            base_url or os.getenv("OPENROUTER_BASE_URL") or "https://openrouter.ai/api/v1"
        ).rstrip("/")

    def generate(self, request: AnswerDraftRequest) -> ProviderDraft:
        response = self.client.post(
            f"{self.base_url}/responses",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://applyproof.local",
                "X-Title": "ApplyProof",
            },
            json={
                "model": self.model,
                "instructions": GROUNDING_INSTRUCTIONS,
                "input": json.dumps(request.model_dump(by_alias=True)),
                "text": {
                    "format": {
                        "type": "json_schema",
                        "name": "applyproof_answer_draft",
                        "strict": True,
                        "schema": ProviderDraft.model_json_schema(),
                    }
                },
                "store": False,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("OpenRouter returned an invalid response")
        for output in payload.get("output", []):
            if not isinstance(output, dict) or output.get("type") != "message":
                continue
            for content in output.get("content", []):
                if isinstance(content, dict) and content.get("type") == "output_text":
                    text = content.get("text")
                    if isinstance(text, str):
                        return ProviderDraft.model_validate_json(text)
        raise ValueError("OpenRouter did not return a usable structured draft")


class GeminiProvider:
    def __init__(
        self,
        client: Any | None = None,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
    ) -> None:
        self.client = client or httpx.Client()
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or ""
        self.model = model or os.getenv("GEMINI_MODEL") or "gemini-2.5-flash"
        self.base_url = (
            base_url
            or os.getenv("GEMINI_BASE_URL")
            or "https://generativelanguage.googleapis.com/v1beta/openai"
        ).rstrip("/")

    def generate(self, request: AnswerDraftRequest) -> ProviderDraft:
        response = self.client.post(
            f"{self.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": GROUNDING_INSTRUCTIONS},
                    {
                        "role": "user",
                        "content": json.dumps(request.model_dump(by_alias=True)),
                    },
                ],
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "applyproof_answer_draft",
                        "strict": True,
                        "schema": ProviderDraft.model_json_schema(),
                    },
                },
                "reasoning_effort": "none",
            },
            timeout=30.0,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("Gemini returned an invalid response")
        choices = payload.get("choices")
        if isinstance(choices, list) and choices:
            choice = choices[0]
            if isinstance(choice, dict):
                message = choice.get("message")
                if isinstance(message, dict):
                    content = message.get("content")
                    if isinstance(content, str):
                        return ProviderDraft.model_validate_json(content)
        raise ValueError("Gemini did not return a usable structured draft")


def configured_provider() -> AnswerDraftProvider:
    mode = os.getenv("ANSWER_GENERATION_MODE", "fixture").lower()
    if mode == "fixture":
        return FixtureProvider()
    if mode == "openrouter":
        if not os.getenv("OPENROUTER_API_KEY"):
            raise RuntimeError("OpenRouter drafting requires OPENROUTER_API_KEY on the server")
        return OpenRouterProvider()
    if mode == "gemini":
        if not os.getenv("GEMINI_API_KEY"):
            raise RuntimeError("Gemini drafting requires GEMINI_API_KEY on the server")
        return GeminiProvider()
    raise RuntimeError("ANSWER_GENERATION_MODE must be fixture, openrouter, or gemini")
