from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.complaint import ComplaintCategory, ComplaintSeverity, ComplaintStatus


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    original_filename: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime


class ComplaintBase(BaseModel):
    product_name: str
    batch_number: str | None = None
    customer_name: str | None = None
    customer_contact: str | None = None
    description: str
    category: ComplaintCategory = ComplaintCategory.OTHER
    severity: ComplaintSeverity = ComplaintSeverity.MEDIUM


class ComplaintCreate(ComplaintBase):
    pass


class ComplaintUpdate(BaseModel):
    product_name: str | None = None
    batch_number: str | None = None
    customer_name: str | None = None
    customer_contact: str | None = None
    description: str | None = None
    category: ComplaintCategory | None = None
    severity: ComplaintSeverity | None = None
    status: ComplaintStatus | None = None
    root_cause: str | None = None
    capa_notes: str | None = None


class ComplaintRead(ComplaintBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    complaint_number: str
    status: ComplaintStatus
    root_cause: str | None
    capa_notes: str | None
    reported_by_id: str
    created_at: datetime
    updated_at: datetime
    attachments: list[AttachmentRead] = []


class ComplaintListItem(BaseModel):
    """Lighter-weight shape used for the paginated list view."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    complaint_number: str
    product_name: str
    category: ComplaintCategory
    severity: ComplaintSeverity
    status: ComplaintStatus
    created_at: datetime


class PaginatedComplaints(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[ComplaintListItem]


class DashboardStats(BaseModel):
    total_complaints: int
    open_complaints: int
    critical_complaints: int
    by_status: dict[str, int]
    by_category: dict[str, int]
    by_severity: dict[str, int]
