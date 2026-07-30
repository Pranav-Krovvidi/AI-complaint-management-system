"""
Best-effort text extraction from uploaded intake documents (PDF, image, or
plain text/email export) so the AI intake pipeline has raw text to work with.

Per the assignment brief, production-grade OCR/document parsing is explicitly
NOT required — this module does a reasonable best effort and degrades
gracefully instead of failing the request:

- .pdf   -> extract embedded text via pypdf (works well for text-based PDFs,
            e.g. a complaint letter exported to PDF or typed up for the demo)
- .png/.jpg/.jpeg -> OCR via pytesseract if the tesseract binary is
            available on the host; otherwise returns a clear placeholder so
            the caller can ask the user to paste the text instead
- .txt/.eml/anything else -> decoded as plain text (covers a pasted/exported
            email)
"""
import io
import os

from pypdf import PdfReader

try:
    import pytesseract
    from PIL import Image

    _OCR_AVAILABLE = True
except ImportError:  # Pillow/pytesseract not installed
    _OCR_AVAILABLE = False


class DocumentParseError(Exception):
    """Raised when a file's content genuinely cannot be turned into any text."""


def _extract_pdf_text(content: bytes) -> str:
    reader = PdfReader(io.BytesIO(content))
    pages_text = [page.extract_text() or "" for page in reader.pages]
    text = "\n".join(pages_text).strip()
    if not text:
        raise DocumentParseError(
            "This PDF has no extractable text (it may be a scanned image). "
            "Try pasting the complaint text directly instead."
        )
    return text


def _extract_image_text(content: bytes) -> str:
    if not _OCR_AVAILABLE:
        raise DocumentParseError(
            "OCR is not available on this server (tesseract not installed). "
            "Please paste the complaint text directly instead of uploading an image."
        )
    try:
        image = Image.open(io.BytesIO(content))
        text = pytesseract.image_to_string(image).strip()
    except Exception as exc:  # noqa: BLE001 - OCR/tesseract runtime failures vary widely
        raise DocumentParseError(f"Could not read text from this image: {exc}") from exc

    if not text:
        raise DocumentParseError(
            "No text could be read from this image. Try a clearer image or paste the "
            "complaint text directly instead."
        )
    return text


def _extract_plain_text(content: bytes) -> str:
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1", errors="ignore")
    text = text.strip()
    if not text:
        raise DocumentParseError("This file appears to be empty.")
    return text


def extract_text_from_upload(filename: str, content: bytes, content_type: str | None = None) -> str:
    """
    Dispatches to the right extraction strategy based on file extension.
    Raises DocumentParseError with a user-facing message on failure — callers
    should surface that message rather than a raw 500.
    """
    ext = os.path.splitext(filename or "")[1].lower()

    if ext == ".pdf":
        return _extract_pdf_text(content)
    if ext in {".png", ".jpg", ".jpeg"}:
        return _extract_image_text(content)
    # .txt, .eml, or anything else not otherwise handled: treat as plain text
    return _extract_plain_text(content)
