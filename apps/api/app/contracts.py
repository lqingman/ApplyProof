import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class DraftField(ApiModel):
    id: str = Field(min_length=1, max_length=120)
    question: str = Field(min_length=1, max_length=1000)
    max_characters: int | None = Field(default=None, alias="maxCharacters", ge=1, le=20000)


class JobContext(ApiModel):
    company: str = Field(min_length=1, max_length=200)
    role: str = Field(min_length=1, max_length=200)
    requirements: list[str] = Field(max_length=20)
    description: str | None = Field(default=None, min_length=1, max_length=12000)


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


class ExtractedEducation(ApiModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    school: str = Field(min_length=1, max_length=300)
    degree: str = Field(min_length=1, max_length=300)
    start_date: str | None = Field(alias="startDate", max_length=50)
    graduation_date: str | None = Field(alias="graduationDate", max_length=50)


class ExtractedExperience(ApiModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    company: str = Field(min_length=1, max_length=300)
    title: str = Field(min_length=1, max_length=300)
    location: str | None = Field(max_length=300)
    start_date: str | None = Field(alias="startDate", max_length=50)
    end_date: str | None = Field(alias="endDate", max_length=50)
    description: str | None = Field(
        max_length=12000,
        description=(
            "The complete work-description or bullet text copied from the resume without "
            "summarizing, rephrasing, polishing, or adding facts. Preserve the original "
            "wording and bullet order, separated by newlines."
        ),
    )


class ExtractionReview(ApiModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    field_path: str = Field(alias="fieldPath", min_length=1, max_length=200)
    source_text: str = Field(alias="sourceText", min_length=1, max_length=1000)
    confidence: Literal["high", "medium", "low"]


class ResumeExtraction(ApiModel):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    first_name: str | None = Field(alias="firstName", max_length=120)
    last_name: str | None = Field(alias="lastName", max_length=120)
    email: str | None = Field(max_length=320)
    phone: str | None = Field(max_length=80)
    location: str | None = Field(max_length=300)
    portfolio: str | None = Field(max_length=2000)
    linkedin: str | None = Field(max_length=2000)
    education: list[ExtractedEducation] = Field(max_length=20)
    experience: list[ExtractedExperience] = Field(max_length=30)
    evidence: list[str] = Field(max_length=30)
    reviews: list[ExtractionReview] = Field(max_length=100)
    notes: list[str] = Field(max_length=20)

    @model_validator(mode="after")
    def validate_and_deduplicate(self) -> "ResumeExtraction":
        if self.email and not re.fullmatch(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", self.email):
            raise ValueError("Extracted email is invalid")
        for value in (self.portfolio, self.linkedin):
            if value and not value.lower().startswith(("http://", "https://")):
                raise ValueError("Extracted URLs must use HTTP or HTTPS")
        self.education = list(
            {
                (entry.school.casefold(), entry.degree.casefold()): entry
                for entry in self.education
            }.values()
        )
        self.experience = list(
            {
                (entry.company.casefold(), entry.title.casefold()): entry
                for entry in self.experience
            }.values()
        )
        self.evidence = list(dict.fromkeys(item.strip() for item in self.evidence if item.strip()))
        return self


class ResumeExtractionRequest(ApiModel):
    text: str = Field(min_length=1, max_length=120000)
    baseline: ResumeExtraction


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
