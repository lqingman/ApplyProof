import asyncio
import json

import pytest
from httpx import ASGITransport, AsyncClient, Response

import app.main as main_module
from app.contracts import ResumeExtraction, ResumeExtractionRequest
from app.main import app
from app.providers import GeminiProvider, OpenRouterProvider


def extraction_body() -> dict[str, object]:
    baseline = {
        "firstName": "Maya",
        "lastName": "Chen",
        "email": "maya@example.com",
        "phone": None,
        "location": "Vancouver, BC",
        "portfolio": None,
        "linkedin": "https://linkedin.com/in/maya",
        "education": [
            {
                "school": "University of British Columbia",
                "degree": "BSc Computer Science",
                "startDate": "2022-09-01",
                "graduationDate": "2026-05-01",
            }
        ],
        "experience": [],
        "evidence": ["Built an accessible React application."],
        "reviews": [],
        "notes": ["Deterministic extraction completed locally."],
    }
    return {
        "text": "Maya Chen\nVancouver, BC\nUniversity of British Columbia",
        "baseline": baseline,
    }


def post_extraction(body: dict[str, object]) -> Response:
    async def post() -> Response:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.post("/v1/resume-extractions", json=body)

    return asyncio.run(post())


def test_fixture_mode_returns_the_validated_local_baseline(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ANSWER_GENERATION_MODE", "fixture")

    response = post_extraction(extraction_body())

    assert response.status_code == 200
    assert response.json()["firstName"] == "Maya"
    assert response.json()["education"][0]["startDate"] == "2022-09-01"


def test_provider_failure_returns_the_deterministic_baseline(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FailingProvider:
        def extract_resume(self, request: ResumeExtractionRequest) -> ResumeExtraction:
            raise RuntimeError("provider unavailable")

    monkeypatch.setattr(main_module, "configured_provider", lambda: FailingProvider())

    response = post_extraction(extraction_body())

    assert response.status_code == 200
    assert response.json()["firstName"] == "Maya"
    assert "deterministic extraction was used" in response.json()["notes"][-1]


class FakeResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, object]:
        return self.payload


class FakeClient:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload
        self.kwargs: dict[str, object] = {}
        self.url = ""

    def post(self, url: str, **kwargs: object) -> FakeResponse:
        self.url = url
        self.kwargs = kwargs
        return FakeResponse(self.payload)


def extraction_json() -> str:
    return ResumeExtraction.model_validate(extraction_body()["baseline"]).model_dump_json(
        by_alias=True
    )


def test_openrouter_resume_extraction_uses_a_strict_schema() -> None:
    client = FakeClient(
        {
            "output": [
                {
                    "type": "message",
                    "content": [{"type": "output_text", "text": extraction_json()}],
                }
            ]
        }
    )
    provider = OpenRouterProvider(client=client, api_key="key", base_url="https://test/v1")

    result = provider.extract_resume(ResumeExtractionRequest.model_validate(extraction_body()))

    assert result.first_name == "Maya"
    body = client.kwargs["json"]
    assert isinstance(body, dict)
    assert body["text"]["format"]["name"] == "applyproof_resume_extraction"  # type: ignore[index]
    assert body["text"]["format"]["strict"] is True  # type: ignore[index]
    assert "Do not rephrase" in body["instructions"]  # type: ignore[operator]
    assert "resumeText" not in json.dumps(body)


def test_gemini_resume_extraction_uses_a_strict_schema() -> None:
    client = FakeClient({"choices": [{"message": {"content": extraction_json()}}]})
    provider = GeminiProvider(client=client, api_key="key", base_url="https://test/v1")

    result = provider.extract_resume(ResumeExtractionRequest.model_validate(extraction_body()))

    assert result.first_name == "Maya"
    body = client.kwargs["json"]
    assert isinstance(body, dict)
    assert body["response_format"]["json_schema"]["strict"] is True  # type: ignore[index]
    assert "Do not rephrase" in body["messages"][0]["content"]  # type: ignore[index]
