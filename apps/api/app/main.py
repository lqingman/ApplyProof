import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .contracts import (
    AnswerDraftRequest,
    AnswerDraftResponse,
    ResumeExtraction,
    ResumeExtractionRequest,
    empty_response,
)
from .providers import configured_provider, resume_based_ai_fallback
from .validation import validate_draft

logger = logging.getLogger(__name__)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


app = FastAPI(
    title="ApplyProof API",
    description="Evidence-grounded job application analysis and answer generation.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="applyproof-api", version=app.version)


@app.post(
    "/v1/answer-drafts",
    response_model=AnswerDraftResponse,
    response_model_by_alias=True,
    tags=["answers"],
)
def answer_draft(request: AnswerDraftRequest) -> AnswerDraftResponse:
    try:
        provider = configured_provider()
        candidate = provider.generate(request)
        limit = request.field.max_characters
        if limit is not None and len(candidate.draft.strip()) > limit:
            instruction = (
                f"The previous draft exceeded the field limit. Return no more than {limit} "
                "characters, including spaces. Keep the strongest resume-grounded details."
            )
            if request.additional_prompt:
                instruction = f"{request.additional_prompt}\n\n{instruction}"
            retry_request = request.model_copy(update={"additional_prompt": instruction})
            candidate = provider.generate(retry_request)
        if not candidate.draft.strip():
            candidate = resume_based_ai_fallback(request) or candidate
        return validate_draft(request, candidate)
    except Exception:
        logger.exception("Answer draft generation failed")
        return empty_response(
            request,
            "Drafting is temporarily unavailable. You can still write this answer manually.",
        )


@app.post(
    "/v1/resume-extractions",
    response_model=ResumeExtraction,
    response_model_by_alias=True,
    tags=["resumes"],
)
def resume_extraction(request: ResumeExtractionRequest) -> ResumeExtraction:
    try:
        return configured_provider().extract_resume(request)
    except Exception:
        logger.exception("AI resume extraction failed; using deterministic baseline")
        return request.baseline.model_copy(
            update={
                "notes": [
                    *request.baseline.notes,
                    "AI extraction was unavailable; deterministic extraction was used.",
                ]
            }
        )
