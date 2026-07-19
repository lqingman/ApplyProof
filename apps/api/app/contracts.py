from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class DraftField(ApiModel):
    id: str = Field(min_length=1, max_length=120)
    question: str = Field(min_length=1, max_length=1000)
    max_characters: int | None = Field(default=None, alias="maxCharacters", ge=50, le=5000)


class JobContext(ApiModel):
    company: str = Field(min_length=1, max_length=200)
    role: str = Field(min_length=1, max_length=200)
    requirements: list[str] = Field(max_length=20)


class EvidenceRecord(ApiModel):
    id: str = Field(min_length=1, max_length=120)
    category: Literal["profile", "education", "experience", "project", "skill"]
    text: str = Field(min_length=1, max_length=2000)
    source: str = Field(min_length=1, max_length=300)


class AnswerDraftRequest(ApiModel):
    field: DraftField
    job: JobContext
    evidence: list[EvidenceRecord] = Field(max_length=20)
    additional_prompt: str | None = Field(
        default=None, alias="additionalPrompt", min_length=1, max_length=1000
    )

    @model_validator(mode="after")
    def unique_evidence_ids(self) -> "AnswerDraftRequest":
        ids = [record.id for record in self.evidence]
        if len(ids) != len(set(ids)):
            raise ValueError("Evidence IDs must be unique")
        return self


class AnswerDraftResponse(ApiModel):
    field_id: str = Field(alias="fieldId")
    draft: str
    evidence_ids: list[str] = Field(alias="evidenceIds")
    notes: list[str]
    follow_up_question: str | None = Field(alias="followUpQuestion")
    character_count: int = Field(alias="characterCount", ge=0)
    fits_limit: bool = Field(alias="fitsLimit")


class ProviderDraft(ApiModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    field_id: str
    draft: str
    evidence_ids: list[str]
    notes: list[str]
    follow_up_question: str | None


def empty_response(request: AnswerDraftRequest, note: str) -> AnswerDraftResponse:
    return AnswerDraftResponse(
        fieldId=request.field.id,
        draft="",
        evidenceIds=[],
        notes=[note],
        followUpQuestion=None,
        characterCount=0,
        fitsLimit=True,
    )
