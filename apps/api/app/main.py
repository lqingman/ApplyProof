import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .contracts import AnswerDraftRequest, AnswerDraftResponse, empty_response
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
        candidate = configured_provider().generate(request)
        if not candidate.draft.strip():
            candidate = resume_based_ai_fallback(request) or candidate
        return validate_draft(request, candidate)
    except Exception:
        logger.exception("Answer draft generation failed")
        return empty_response(
            request,
            "Drafting is temporarily unavailable. You can still write this answer manually.",
        )
