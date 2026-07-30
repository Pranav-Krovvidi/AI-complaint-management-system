"""
Thin, provider-agnostic client for OpenAI-compatible chat completion APIs.

Works unmodified with Groq, Together AI, or a local Ollama server exposing
an OpenAI-compatible /chat/completions route — only LLM_API_BASE_URL /
LLM_API_KEY / model names in .env need to change.

Responsible for:
- Calling the chat completions endpoint
- Extracting JSON from the response (handling ```json fences models often add)
- Validating the JSON against a given Pydantic schema
- Retrying across models (primary -> fallback) on failure
- Failing fast with a clear error when no API key is configured at all,
  instead of retrying pointlessly
"""
import json
import re

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import settings


class LLMError(Exception):
    """Raised when no usable structured response could be obtained from any model."""


def _extract_json(text: str) -> dict:
    """Strip markdown code fences (```json ... ```) and parse the remaining JSON."""
    cleaned = text.strip()
    fence_match = re.search(r"```(?:json)?\s*(.*?)\s*```", cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1).strip()
    return json.loads(cleaned)


def _call_model(model: str, system_prompt: str, user_prompt: str) -> str:
    response = httpx.post(
        f"{settings.LLM_API_BASE_URL}/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.LLM_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
        },
        timeout=settings.LLM_REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


def get_structured_completion(
    system_prompt: str,
    user_prompt: str,
    schema: type[BaseModel],
) -> BaseModel:
    """
    Calls the LLM and returns a validated instance of `schema`.

    Tries the primary model first, then the fallback model, each up to
    LLM_MAX_RETRIES_PER_MODEL times, before raising LLMError. If no API key
    is configured at all, fails immediately with one clear error instead of
    burning through every retry for a call that can never succeed.
    """
    if not settings.LLM_API_KEY:
        raise LLMError(
            "No LLM_API_KEY configured — set it in .env (see .env.example) "
            "to enable AI analysis. Skipping retries since this call cannot succeed."
        )

    models_to_try = [settings.LLM_PRIMARY_MODEL, settings.LLM_FALLBACK_MODEL]
    last_error: Exception | None = None

    for model in models_to_try:
        for attempt in range(settings.LLM_MAX_RETRIES_PER_MODEL):
            try:
                raw_content = _call_model(model, system_prompt, user_prompt)
                parsed = _extract_json(raw_content)
                return schema.model_validate(parsed)
            except (httpx.HTTPError, json.JSONDecodeError, ValidationError, KeyError) as exc:
                last_error = exc
                continue

    raise LLMError(
        f"All models failed after retries (primary={settings.LLM_PRIMARY_MODEL}, "
        f"fallback={settings.LLM_FALLBACK_MODEL}). Last error: {last_error}"
    )
