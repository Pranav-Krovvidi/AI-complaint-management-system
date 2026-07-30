"""
Structured output schemas for each AI node in the complaint-analysis graph.

Each node prompts the LLM to return JSON matching one of these shapes.
Keeping them as separate Pydantic models (rather than one giant schema)
means each node can be tested, retried, and fall back independently.
"""
from pydantic import BaseModel, Field


class SummaryResult(BaseModel):
    summary: str = Field(..., description="2-4 sentence plain-language summary of the complaint")


class RiskClassificationResult(BaseModel):
    risk_level: str = Field(..., description="One of: low, medium, high, critical")
    rationale: str = Field(..., description="Brief justification for the assigned risk level")


class CategoryResult(BaseModel):
    category: str = Field(
        ...,
        description=(
            "One of: product_quality, packaging, adverse_event, labeling, "
            "delivery_logistics, other"
        ),
    )
    confidence: float = Field(..., ge=0.0, le=1.0)


class RootCauseResult(BaseModel):
    likely_root_causes: list[str] = Field(..., description="Ranked list of 1-3 plausible root causes")
    reasoning: str = Field(..., description="Short explanation tying the complaint details to the causes")


class CapaResult(BaseModel):
    corrective_actions: list[str] = Field(..., description="Immediate corrective actions")
    preventive_actions: list[str] = Field(..., description="Longer-term preventive actions")


class CompletenessResult(BaseModel):
    is_complete: bool
    missing_fields: list[str] = Field(default_factory=list)
    notes: str = Field(default="", description="Any additional guidance on what's missing or unclear")


# Maps a node name to its expected output schema — used by the LLM client
# to validate/parse the model's JSON response.
class IntakeExtractionResult(BaseModel):
    """
    Structured fields the intake node pulls out of a raw complaint document
    (pasted email text, or text extracted from an uploaded PDF/image). These
    map directly onto the Log Complaint form fields so the form can be
    pre-filled for the user to review before submitting.
    """

    product_name: str = Field(default="", description="Product name/description, empty string if not found")
    batch_number: str = Field(default="", description="Batch/lot number, empty string if not found")
    customer_name: str = Field(default="", description="Customer or reporter's name, empty string if not found")
    customer_contact: str = Field(
        default="", description="Customer email/phone/contact info, empty string if not found"
    )
    description: str = Field(
        default="", description="Clear, well-written complaint description synthesized from the source text"
    )
    category: str = Field(
        default="other",
        description=(
            "Best-guess category: one of product_quality, packaging, adverse_event, "
            "labeling, delivery_logistics, other"
        ),
    )
    severity: str = Field(default="medium", description="Best-guess severity: one of low, medium, high, critical")


NODE_SCHEMAS: dict[str, type[BaseModel]] = {
    "summary": SummaryResult,
    "risk": RiskClassificationResult,
    "category": CategoryResult,
    "root_cause": RootCauseResult,
    "capa": CapaResult,
    "completeness": CompletenessResult,
    "intake_extraction": IntakeExtractionResult,
}
