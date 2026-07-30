import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.crud import crud_complaint
from app.db.database import get_db
from app.models.attachment import Attachment
from app.models.complaint import Complaint, ComplaintCategory, ComplaintSeverity, ComplaintStatus
from app.models.user import User
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintRead,
    ComplaintUpdate,
    DashboardStats,
    PaginatedComplaints,
)

router = APIRouter(prefix="/complaints", tags=["complaints"])


def _get_complaint_or_404(db: Session, complaint_id: str) -> Complaint:
    complaint = crud_complaint.get_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    return complaint


@router.post("", response_model=ComplaintRead, status_code=status.HTTP_201_CREATED)
def create_complaint(
    complaint_in: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_complaint.create_complaint(db, complaint_in, reported_by_id=current_user.id)


@router.get("", response_model=PaginatedComplaints)
def list_complaints(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: ComplaintStatus | None = Query(None, alias="status"),
    category: ComplaintCategory | None = None,
    severity: ComplaintSeverity | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = crud_complaint.list_complaints(
        db,
        page=page,
        page_size=page_size,
        status=status_filter,
        category=category,
        severity=severity,
        search=search,
    )
    return PaginatedComplaints(total=total, page=page, page_size=page_size, items=items)


@router.get("/dashboard", response_model=DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return crud_complaint.get_dashboard_stats(db)


@router.get("/{complaint_id}", response_model=ComplaintRead)
def get_complaint(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_complaint_or_404(db, complaint_id)


@router.put("/{complaint_id}", response_model=ComplaintRead)
def update_complaint(
    complaint_id: str,
    complaint_in: ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = _get_complaint_or_404(db, complaint_id)
    return crud_complaint.update_complaint(db, complaint, complaint_in)


@router.delete("/{complaint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_complaint(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = _get_complaint_or_404(db, complaint_id)
    crud_complaint.delete_complaint(db, complaint)
    return None


@router.post("/{complaint_id}/attachments", response_model=ComplaintRead, status_code=status.HTTP_201_CREATED)
def upload_attachment(
    complaint_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = _get_complaint_or_404(db, complaint_id)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Allowed: {sorted(settings.ALLOWED_UPLOAD_EXTENSIONS)}",
        )

    contents = file.file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds max size of {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    stored_filename = f"{uuid.uuid4()}{ext}"
    stored_path = os.path.join(settings.UPLOAD_DIR, stored_filename)
    with open(stored_path, "wb") as f:
        f.write(contents)

    attachment = Attachment(
        complaint_id=complaint.id,
        original_filename=file.filename,
        stored_filename=stored_filename,
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(contents),
    )
    db.add(attachment)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    file_path = os.path.join(settings.UPLOAD_DIR, attachment.stored_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing on server")

    return FileResponse(
        path=file_path,
        media_type=attachment.content_type,
        filename=attachment.original_filename,
    )
