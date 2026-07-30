from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import ai, auth, complaints, users
from app.core.config import settings
from app.db.database import Base, engine
from app import models  # noqa: F401  (ensures models are registered on Base.metadata)

# For this learning project we create tables directly from the models.
# In a production setup, replace this with Alembic migrations.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for logging, tracking, and resolving pharmaceutical product complaints.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)
app.include_router(complaints.router, prefix=settings.API_V1_PREFIX)
app.include_router(ai.router, prefix=settings.API_V1_PREFIX)
app.include_router(ai.intake_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["health"])
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}
