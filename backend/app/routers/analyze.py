"""POST /api/analyze: PDF resume + job description -> AI analysis."""

import json
import logging
import os
from typing import Any, Dict, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.database import supabase
from app.schemas import AnalysisDetail
from app.services import ai_service
from app.services.ai_service import AIResponseError, AIServiceError, AIUnavailableError
from app.services.pdf_service import PDFExtractionError, extract_text_from_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Analysis"])

TABLE = "analysis_history"
MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB
MIN_JD_CHARS = 50
MAX_JD_CHARS = 10_000
ALLOWED_CONTENT_TYPES = {"application/pdf", "application/x-pdf", "application/octet-stream"}


def _derive_job_title(job_title: Optional[str], job_description: str) -> str:
    if job_title and job_title.strip():
        return job_title.strip()[:150]
    for line in job_description.splitlines():
        if line.strip():
            return line.strip()[:100]
    return "Untitled Role"


def _insert_analysis(payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        result = supabase.table(TABLE).insert(payload).execute()
        if not result.data:
            raise RuntimeError("Insert returned no data from Supabase.")
        return result.data[0]
    except Exception as exc:
        logger.error("Supabase error: %s", str(exc))
        raise exc


@router.post("/analyze", response_model=AnalysisDetail)
async def analyze_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...),
    job_title: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
) -> AnalysisDetail:
    # 1. Validate inputs ------------------------------------------------------
    filename = os.path.basename(file.filename or "").strip()
    if not filename.lower().endswith(".pdf") or (
        file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES
    ):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Only PDF files are supported.")

    job_description = job_description.strip()
    if not MIN_JD_CHARS <= len(job_description) <= MAX_JD_CHARS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Job description must be between {MIN_JD_CHARS} and {MAX_JD_CHARS} characters.",
        )

    file_bytes = await file.read(MAX_FILE_BYTES + 1)
    if not file_bytes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The uploaded file is empty.")
    if len(file_bytes) > MAX_FILE_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            "File exceeds the 5 MB limit.",
        )
    if b"%PDF-" not in file_bytes[:1024]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The file is not a valid PDF.")

    # 2. Extract text ---------------------------------------------------------
    try:
        resume_text = await run_in_threadpool(extract_text_from_pdf, file_bytes)
    except PDFExtractionError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))

    # 3. AI analysis ----------------------------------------------------------
    try:
        analysis = await run_in_threadpool(
            ai_service.analyze_resume_and_jd, resume_text, job_description
        )
    except AIUnavailableError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc))
    except AIResponseError:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "The AI returned an invalid response. Please try again.",
        )
    except AIServiceError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc))
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))

    # 4. Persist --------------------------------------------------------------
    # Model serialization to native python structure safely
    analysis_dict = json.loads(analysis.model_dump_json())

    record = {
        "resume_filename": filename[:255],
        "job_title": _derive_job_title(job_title, job_description),
        "job_description": job_description,
        **analysis_dict,
    }

    if user_id and user_id.strip():
        record["user_id"] = user_id.strip()

    try:
        row = await run_in_threadpool(_insert_analysis, record)
    except Exception as exc:
        logger.exception("Failed to store analysis in Supabase: %s", exc)
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            f"Database store error: {str(exc)}",
        )

    # 5. Respond --------------------------------------------------------------
    return AnalysisDetail.model_validate(row)