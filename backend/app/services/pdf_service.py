"""PDF text extraction utilities."""

import io
import logging
import re
import unicodedata

from PyPDF2 import PdfReader
from PyPDF2.errors import PdfReadError

logger = logging.getLogger(__name__)

MIN_TEXT_LENGTH = 50  # below this, the PDF is likely scanned/image-only


class PDFExtractionError(Exception):
    """Raised when text cannot be extracted from a PDF."""


def _clean_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = unicodedata.normalize("NFKC", text)  # fixes ligatures like "ﬁ" -> "fi"
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)  # re-join hyphenated line breaks
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" ?\n ?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract and clean raw text from PDF bytes.

    Raises:
        PDFExtractionError: if the file is invalid, encrypted, or has no
        extractable text (e.g., a scanned image PDF).
    """
    if not file_bytes:
        raise PDFExtractionError("The uploaded file is empty.")

    try:
        reader = PdfReader(io.BytesIO(file_bytes))

        if reader.is_encrypted and not reader.decrypt(""):
            raise PDFExtractionError("The PDF is password-protected.")

        pages = []
        for index, page in enumerate(reader.pages):
            try:
                pages.append(page.extract_text() or "")
            except Exception:  # one bad page should not fail the whole file
                logger.warning("Could not extract text from page %d", index + 1)
    except PDFExtractionError:
        raise
    except PdfReadError as exc:
        raise PDFExtractionError("The file is not a valid or readable PDF.") from exc
    except Exception as exc:
        logger.exception("Unexpected error while reading PDF")
        raise PDFExtractionError("Failed to process the PDF file.") from exc

    text = _clean_text("\n".join(pages))

    if len(text) < MIN_TEXT_LENGTH:
        raise PDFExtractionError(
            "No readable text found. The PDF may be a scanned image; "
            "please upload a text-based PDF."
        )

    return text