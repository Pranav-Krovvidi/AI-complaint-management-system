import random
import string
from datetime import datetime
from difflib import SequenceMatcher

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.complaint import Complaint, ComplaintCategory, ComplaintSeverity, ComplaintStatus
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate


def _generate_complaint_number() -> str:
    """e.g. CMP-20260730-A1B2"""
    date_part = datetime.utcnow().strftime("%Y%m%d")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"CMP-{date_part}-{suffix}"


def create_complaint(db: Session, complaint_in: ComplaintCreate, reported_by_id: str) -> Complaint:
    complaint = Complaint(
        complaint_number=_generate_complaint_number(),
        reported_by_id=reported_by_id,
        **complaint_in.model_dump(),
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


def get_complaint(db: Session, complaint_id: str) -> Complaint | None:
    return db.query(Complaint).filter(Complaint.id == complaint_id).first()


def list_complaints(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    status: ComplaintStatus | None = None,
    category: ComplaintCategory | None = None,
    severity: ComplaintSeverity | None = None,
    search: str | None = None,
) -> tuple[list[Complaint], int]:
    query = db.query(Complaint)

    if status:
        query = query.filter(Complaint.status == status)
    if category:
        query = query.filter(Complaint.category == category)
    if severity:
        query = query.filter(Complaint.severity == severity)
    if search:
        like_pattern = f"%{search}%"
        query = query.filter(
            (Complaint.product_name.ilike(like_pattern))
            | (Complaint.complaint_number.ilike(like_pattern))
            | (Complaint.description.ilike(like_pattern))
        )

    total = query.count()
    items = (
        query.order_by(Complaint.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def update_complaint(db: Session, complaint: Complaint, complaint_in: ComplaintUpdate) -> Complaint:
    update_data = complaint_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(complaint, field, value)
    db.commit()
    db.refresh(complaint)
    return complaint


def delete_complaint(db: Session, complaint: Complaint) -> None:
    db.delete(complaint)
    db.commit()


def get_dashboard_stats(db: Session) -> dict:
    total = db.query(func.count(Complaint.id)).scalar() or 0

    by_status_rows = db.query(Complaint.status, func.count(Complaint.id)).group_by(Complaint.status).all()
    by_category_rows = db.query(Complaint.category, func.count(Complaint.id)).group_by(Complaint.category).all()
    by_severity_rows = db.query(Complaint.severity, func.count(Complaint.id)).group_by(Complaint.severity).all()

    by_status = {status.value: count for status, count in by_status_rows}
    by_category = {category.value: count for category, count in by_category_rows}
    by_severity = {severity.value: count for severity, count in by_severity_rows}

    return {
        "total_complaints": total,
        "open_complaints": by_status.get(ComplaintStatus.OPEN.value, 0)
        + by_status.get(ComplaintStatus.UNDER_INVESTIGATION.value, 0),
        "critical_complaints": by_severity.get(ComplaintSeverity.CRITICAL.value, 0),
        "by_status": by_status,
        "by_category": by_category,
        "by_severity": by_severity,
    }


def find_potential_duplicates(
    db: Session,
    product_name: str | None,
    batch_number: str | None,
    description: str | None,
    limit: int = 5,
) -> list[dict]:
    """
    Lightweight, deterministic duplicate-complaint check (bonus feature) used
    during AI intake: same batch number is an automatic strong match; same
    product name plus a similar description (via difflib text similarity)
    is a softer match. No LLM call needed — this runs directly against the
    DB so it's fast and free to run on every intake.
    """
    conditions = []
    if batch_number:
        conditions.append(Complaint.batch_number == batch_number)
    if product_name:
        conditions.append(Complaint.product_name.ilike(f"%{product_name}%"))

    if not conditions:
        return []

    candidates_query = db.query(Complaint).filter(or_(*conditions))
    candidates = candidates_query.order_by(Complaint.created_at.desc()).limit(50).all()

    scored: list[dict] = []
    for candidate in candidates:
        same_batch = bool(batch_number) and candidate.batch_number == batch_number
        similarity = 0.0
        if description and candidate.description:
            similarity = SequenceMatcher(None, description.lower(), candidate.description.lower()).ratio()

        score = 0.6 if same_batch else 0.0
        score = max(score, similarity)

        if same_batch or similarity >= 0.45:
            scored.append(
                {
                    "id": candidate.id,
                    "complaint_number": candidate.complaint_number,
                    "product_name": candidate.product_name,
                    "batch_number": candidate.batch_number,
                    "created_at": candidate.created_at,
                    "similarity": round(score, 2),
                    "same_batch_number": same_batch,
                }
            )

    scored.sort(key=lambda c: c["similarity"], reverse=True)
    return scored[:limit]
