"""
SQLAlchemy engine + session factory.

Import `Base` in every model file so Alembic / create_all can discover
all tables. Import `get_db` as a FastAPI dependency for a request-scoped
session.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Yields a DB session and guarantees it's closed after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
