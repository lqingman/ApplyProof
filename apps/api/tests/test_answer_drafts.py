import asyncio
from collections.abc import Generator

import pytest
from httpx import ASGITransport, AsyncClient, Response

from app.contracts import AnswerDraftRequest, ProviderDraft
from app.main import app
from app.providers import FixtureProvider, GeminiProvider, OpenRouterProvider, configured_provider
from app.validation import validate_draft


def request_body(field_id: str = "project") -> dict[str, object]:
    evidence = {
        "project": [
            {
                "id": "project-campus-map",
                "category": "project",
                "text": (
                    "Built an accessible campus navigation app with React, TypeScript, and FastAPI."
                ),
                "source": "Demo resume · Projects",
            }
        ],
        "ai-workflow": [],
    }
    return {
        "field": {
            "id": field_id,
            "question": "Describe a relevant project.",
            "maxCharacters": 700,
        },
        "job": {
            "company": "Northstar Labs",
            "role": "Junior Software Engineer",
            "requirements": ["React", "TypeScript", "accessibility"],
        },
        "evidence": evidence.get(field_id, []),
    }


def post_draft(body: dict[str, object]) -> Response:
    async def post() -> Response:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.post("/v1/answer-drafts", json=body)

    return asyncio.run(post())


@pytest.fixture(autouse=True)
def fixture_mode(monkeypatch: pytest.MonkeyPatch) -> Generator[None]:
    monkeypatch.setenv("ANSWER_GENERATION_MODE", "fixture")
    yield


def test_fixture_returns_grounded_project_draft() -> None:
    response = post_draft(request_body())
    payload = response.json()

    assert response.status_code == 200
    assert payload["fieldId"] == "project"
    assert payload["evidenceIds"] == ["project-campus-map"]
    assert payload["characterCount"] == len(payload["draft"])
    assert payload["fitsLimit"] is True
    assert "status" not in payload
    assert "confidence" not in payload


def test_ai_question_without_evidence_returns_follow_up() -> None:
    response = post_draft(request_body("ai-workflow"))
    payload = response.json()

    assert response.status_code == 200
    assert payload["draft"] == ""
    assert payload["evidenceIds"] == []
    assert "verify" in payload["followUpQuestion"]


def test_ai_question_uses_resume_evidence_for_a_reviewable_draft() -> None:
    body = request_body("ai-workflow")
    body["evidence"] = [
        {
            "id": "project-campus-map",
            "category": "project",
            "text": (
                "Built an accessible campus navigation app with React, TypeScript, and FastAPI."
            ),
            "source": "Demo resume · Projects",
        },
        {
            "id": "experience-coop",
            "category": "experience",
            "text": "Shipped tested product improvements during a software engineering co-op.",
            "source": "Demo resume · Experience",
        },
        {
            "id": "skills-stack",
            "category": "skill",
            "text": "Uses TypeScript, React, Python, FastAPI, Git, and automated testing.",
            "source": "Demo resume · Skills",
        },
    ]

    response = post_draft(body)
    payload = response.json()

    assert response.status_code == 200
    assert payload["draft"]
    assert payload["followUpQuestion"] is None
    assert payload["evidenceIds"] == [
        "project-campus-map",
        "experience-coop",
        "skills-stack",
    ]


def test_three_fixture_answers_are_grounded_and_fit_their_limits() -> None:
    requests = {
        "motivation": [
            {
                "id": "interest-accessible-products",
                "category": "profile",
                "text": "Interested in building accessible, user-focused software products.",
                "source": "Demo profile · Interests",
            },
            request_body()["evidence"][0],  # type: ignore[index]
        ],
        "project": request_body()["evidence"],
        "strengths": [
            {
                "id": "education-ubc",
                "category": "education",
                "text": "Bachelor of Science in Computer Science, graduating May 2026.",
                "source": "Demo resume · Education",
            },
            {
                "id": "experience-coop",
                "category": "experience",
                "text": "Shipped tested product improvements during a software engineering co-op.",
                "source": "Demo resume · Experience",
            },
            {
                "id": "skills-stack",
                "category": "skill",
                "text": "Uses TypeScript, React, Python, FastAPI, Git, and automated testing.",
                "source": "Demo resume · Skills",
            },
        ],
    }
    for field_id, evidence in requests.items():
        body = request_body(field_id)
        body["evidence"] = evidence
        request = AnswerDraftRequest.model_validate(body)
        result = validate_draft(request, FixtureProvider().generate(request))
        assert result.draft
        assert set(result.evidence_ids).issubset({record.id for record in request.evidence})
        assert result.character_count <= 700


def test_duplicate_evidence_is_rejected() -> None:
    body = request_body()
    body["evidence"] = [body["evidence"][0], body["evidence"][0]]  # type: ignore[index]
    assert post_draft(body).status_code == 422


def test_additional_prompt_is_accepted_as_an_instruction() -> None:
    body = request_body()
    body["additionalPrompt"] = "Use the campus map project and keep it concise."

    response = post_draft(body)

    assert response.status_code == 200
    assert response.json()["draft"]


def test_validation_rejects_unavailable_evidence_and_claims() -> None:
    request = AnswerDraftRequest.model_validate(request_body())
    candidate = ProviderDraft(
        field_id="project",
        draft="I led 10 engineers using Kubernetes.",
        evidence_ids=["invented"],
        notes=[],
        follow_up_question=None,
    )
    result = validate_draft(request, candidate)
    assert result.draft == ""
    assert "unavailable" in result.notes[0]


class FakeResponse:
    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, object]:
        return {
            "output": [
                {
                    "type": "message",
                    "content": [
                        {
                            "type": "output_text",
                            "text": ProviderDraft(
                                field_id="project",
                                draft="Grounded draft",
                                evidence_ids=["project-campus-map"],
                                notes=[],
                                follow_up_question=None,
                            ).model_dump_json(),
                        }
                    ],
                }
            ]
        }


class FakeGeminiResponse(FakeResponse):
    def json(self) -> dict[str, object]:
        return {
            "choices": [
                {
                    "message": {
                        "content": ProviderDraft(
                            field_id="project",
                            draft="Grounded Gemini draft",
                            evidence_ids=["project-campus-map"],
                            notes=[],
                            follow_up_question=None,
                        ).model_dump_json()
                    }
                }
            ]
        }


class FakeClient:
    def __init__(self, response: FakeResponse | None = None) -> None:
        self.kwargs: dict[str, object] = {}
        self.url = ""
        self.response = response or FakeResponse()

    def post(self, url: str, **kwargs: object) -> FakeResponse:
        self.url = url
        self.kwargs = kwargs
        return self.response


def test_openrouter_provider_uses_responses_with_structured_outputs() -> None:
    client = FakeClient()
    provider = OpenRouterProvider(
        client=client,
        api_key="test-key",
        model="openai/test-model",
        base_url="https://openrouter.test/api/v1/",
    )
    result = provider.generate(AnswerDraftRequest.model_validate(request_body()))

    assert result.draft == "Grounded draft"
    assert client.url == "https://openrouter.test/api/v1/responses"
    assert client.kwargs["headers"] == {
        "Authorization": "Bearer test-key",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://applyproof.local",
        "X-Title": "ApplyProof",
    }
    body = client.kwargs["json"]
    assert isinstance(body, dict)
    assert body["model"] == "openai/test-model"
    assert body["text"]["format"]["type"] == "json_schema"  # type: ignore[index]
    assert body["text"]["format"]["strict"] is True  # type: ignore[index]
    assert body["store"] is False


def test_gemini_provider_uses_chat_completions_with_structured_outputs() -> None:
    client = FakeClient(FakeGeminiResponse())
    provider = GeminiProvider(
        client=client,
        api_key="test-key",
        model="gemini-test-model",
        base_url="https://gemini.test/v1beta/openai/",
    )
    result = provider.generate(AnswerDraftRequest.model_validate(request_body()))

    assert result.draft == "Grounded Gemini draft"
    assert client.url == "https://gemini.test/v1beta/openai/chat/completions"
    assert client.kwargs["headers"] == {
        "Authorization": "Bearer test-key",
        "Content-Type": "application/json",
    }
    body = client.kwargs["json"]
    assert isinstance(body, dict)
    assert body["model"] == "gemini-test-model"
    assert body["response_format"]["type"] == "json_schema"  # type: ignore[index]
    assert body["response_format"]["json_schema"]["strict"] is True  # type: ignore[index]
    assert body["reasoning_effort"] == "none"


def test_configured_provider_supports_gemini(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ANSWER_GENERATION_MODE", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")

    provider = configured_provider()

    assert isinstance(provider, GeminiProvider)
