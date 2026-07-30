from datetime import datetime

from pydantic import BaseModel


class DuplicateCandidate(BaseModel):
    id: str
    complaint_number: str
    product_name: str
    batch_number: str | None = None
    created_at: datetime
    similarity: float
    same_batch_number: bool


class IntakeExtractionResponse(BaseModel):
    fields: dict
    duplicates: list[DuplicateCandidate] = []
    error: str | None = None
    raw_text_preview: str


class AIAnalysisResponse(BaseModel):
    summary: dict | None = None
    risk: dict | None = None
    category: dict | None = None
    root_cause: dict | None = None
    capa: dict | None = None
    completeness: dict | None = None
    errors: list[str] = []


class ApplyAISuggestionsRequest(BaseModel):
    apply_category: bool = False
    apply_severity: bool = False
    apply_root_cause: bool = False
    apply_capa_notes: bool = False
