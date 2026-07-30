import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base


class ComplaintStatus(str, enum.Enum):
    OPEN = "open"
    UNDER_INVESTIGATION = "under_investigation"
    PENDING_CAPA = "pending_capa"
    CLOSED = "closed"
    REJECTED = "rejected"


class ComplaintCategory(str, enum.Enum):
    PRODUCT_QUALITY = "product_quality"
    PACKAGING = "packaging"
    ADVERSE_EVENT = "adverse_event"
    LABELING = "labeling"
    DELIVERY_LOGISTICS = "delivery_logistics"
    OTHER = "other"


class ComplaintSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=True)

    customer_name: Mapped[str] = mapped_column(String(255), nullable=True)
    customer_contact: Mapped[str] = mapped_column(String(255), nullable=True)

    description: Mapped[str] = mapped_column(Text, nullable=False)

    category: Mapped[ComplaintCategory] = mapped_column(
        Enum(ComplaintCategory), default=ComplaintCategory.OTHER, nullable=False
    )
    severity: Mapped[ComplaintSeverity] = mapped_column(
        Enum(ComplaintSeverity), default=ComplaintSeverity.MEDIUM, nullable=False
    )
    status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus), default=ComplaintStatus.OPEN, nullable=False
    )

    root_cause: Mapped[str] = mapped_column(Text, nullable=True)
    capa_notes: Mapped[str] = mapped_column(Text, nullable=True)

    reported_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    reported_by: Mapped["User"] = relationship(
        "User", back_populates="complaints", foreign_keys=[reported_by_id]
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    attachments: Mapped[list["Attachment"]] = relationship(
        "Attachment", back_populates="complaint", cascade="all, delete-orphan"
    )
