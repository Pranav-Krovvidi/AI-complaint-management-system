import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.ai.document_parser import DocumentParseError, extract_text_from_upload
from app.ai.service import run_ai_analysis, run_intake_extraction
from app.api.deps import get_current_user
from app.api.routes.complaints import _get_complaint_or_404
from app.core.config import settings
from app.crud import crud_complaint
from app.db.database import get_db
from app.models.complaint import ComplaintCategory, ComplaintSeverity
from app.models.user import User
from app.schemas.ai import AIAnalysisResponse, ApplyAISuggestionsRequest, IntakeExtractionResponse
from app.schemas.complaint import ComplaintRead

router = APIRouter(prefix="/complaints", tags=["ai"])

# Separate prefix: intake extraction happens *before* a complaint record
# exists, so it doesn't belong under /complaints/{complaint_id}/...
intake_router = APIRouter(prefix="/ai", tags=["ai"])


@intake_router.post("/extract-intake", response_model=IntakeExtractionResponse)
async def extract_intake(
    text: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI-assisted complaint intake: accepts pasted email/complaint text and/or
    an uploaded PDF/image, extracts structured fields to pre-fill the Log
    Complaint form, and flags any likely duplicate complaints already on file.
    """
    if not text and not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide pasted complaint text and/or upload a file.",
        )

    raw_text = (text or "").strip()

    if file:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS and ext not in {".txt", ".eml"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '{ext}' not supported for intake extraction.",
            )
        contents = await file.read()
        try:
            extracted = extract_text_from_upload(file.filename, contents, file.content_type)
        except DocumentParseError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
        raw_text = f"{raw_text}\n\n{extracted}".strip() if raw_text else extracted

    if not raw_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No text could be found to analyze."
        )

    result = run_intake_extraction(raw_text)
    fields = result.get("fields") or {}

    duplicates = crud_complaint.find_potential_duplicates(
        db,
        product_name=fields.get("product_name"),
        batch_number=fields.get("batch_number"),
        description=fields.get("description"),
    )

    return IntakeExtractionResponse(
        fields=fields,
        duplicates=duplicates,
        error=result.get("error"),
        raw_text_preview=raw_text[:1000],
    )


@router.post("/{complaint_id}/ai-analysis", response_model=AIAnalysisResponse)
def analyze_complaint(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = _get_complaint_or_404(db, complaint_id)
    result = run_ai_analysis(complaint)
    return AIAnalysisResponse(**result)


@router.post("/{complaint_id}/ai-analysis/apply", response_model=ComplaintRead)
def apply_ai_suggestions(
    complaint_id: str,
    payload: ApplyAISuggestionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Re-runs the analysis and applies the requested suggestions directly onto
    the complaint record (category, severity, root cause, CAPA notes).
    Only fields explicitly flagged in the request are overwritten, and only
    if the corresponding AI node succeeded (no error) with a valid value.
    """
    complaint = _get_complaint_or_404(db, complaint_id)
    result = run_ai_analysis(complaint)

    if payload.apply_category:
        category_result = result.get("category") or {}
        candidate = category_result.get("category")
        if candidate in ComplaintCategory._value2member_map_:
            complaint.category = ComplaintCategory(candidate)

    if payload.apply_severity:
        risk_result = result.get("risk") or {}
        candidate = risk_result.get("risk_level")
        if candidate in ComplaintSeverity._value2member_map_:
            complaint.severity = ComplaintSeverity(candidate)

    if payload.apply_root_cause:
        root_cause_result = result.get("root_cause") or {}
        causes = root_cause_result.get("likely_root_causes") or []
        if causes:
            complaint.root_cause = "\n".join(f"- {c}" for c in causes)

    if payload.apply_capa_notes:
        capa_result = result.get("capa") or {}
        corrective = capa_result.get("corrective_actions") or []
        preventive = capa_result.get("preventive_actions") or []
        if corrective or preventive:
            notes = ""
            if corrective:
                notes += "Corrective actions:\n" + "\n".join(f"- {c}" for c in corrective)
            if preventive:
                notes += ("\n\n" if notes else "") + "Preventive actions:\n" + "\n".join(
                    f"- {p}" for p in preventive
                )
            complaint.capa_notes = notes

    db.commit()
    db.refresh(complaint)
    return complaint
