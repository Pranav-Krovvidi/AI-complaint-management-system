"""
Centralized application configuration.

All environment-dependent values (DB connection, JWT secret, CORS, etc.)
are read here so the rest of the app never touches os.environ directly.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Pharmaceutical Complaint Management System"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "sqlite:///./dev.db"

    SECRET_KEY: str = "dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_UPLOAD_EXTENSIONS: set[str] = {".pdf", ".png", ".jpg", ".jpeg"}

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # --- AI / LangGraph settings ---
    # Provider-agnostic: works with any OpenAI-compatible chat completions endpoint
    # (Groq, Together AI, local Ollama, etc.) by swapping the base URL + API key.
    LLM_API_BASE_URL: str = "https://api.groq.com/openai/v1"
    LLM_API_KEY: str = ""
    # gemma2-9b-it is the assignment's required model; llama-3.3-70b-versatile
    # is used as the fallback for extra context/quality if the primary call fails.
    LLM_PRIMARY_MODEL: str = "gemma2-9b-it"
    LLM_FALLBACK_MODEL: str = "llama-3.3-70b-versatile"
    LLM_REQUEST_TIMEOUT_SECONDS: int = 30
    LLM_MAX_RETRIES_PER_MODEL: int = 2

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
