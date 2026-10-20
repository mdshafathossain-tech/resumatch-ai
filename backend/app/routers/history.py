"""History endpoints backed by the Supabase `analysis_history` table."""

import logging
from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.concurrency import run_in_threadpool

from app.database import supabase
from app.schemas import AnalysisDetail, HistoryItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["History"])

TABLE = "analysis_history"
LIST_COLUMNS = "id,resume_filename,job_title,overall_match_score,created_at"


def _fetch_history(limit: int, offset: int) -> List[Dict[str, Any]]:
    result = (
        supabase.table(TABLE)
        .select(LIST_COLUMNS)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data or []


def _fetch_one(analysis_id: str) -> List[Dict[str, Any]]:
    result = supabase.table(TABLE).select("*").eq("id", analysis_id).limit(1).execute()
    return result.data or []


@router.get("/history", response_model=List[HistoryItem])
async def list_history(
    limit: int = Query(50, ge=1, le=100, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Records to skip (pagination)"),
) -> List[HistoryItem]:
    try:
        rows = await run_in_threadpool(_fetch_history, limit, offset)
    except Exception:
        logger.exception("Failed to fetch history")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not load history.")
    return [HistoryItem.model_validate(row) for row in rows]


@router.get("/history/{analysis_id}", response_model=AnalysisDetail)
async def get_analysis(analysis_id: UUID) -> AnalysisDetail:
    try:
        rows = await run_in_threadpool(_fetch_one, str(analysis_id))
    except Exception:
        logger.exception("Failed to fetch analysis %s", analysis_id)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not load the analysis.")
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Analysis not found.")
    return AnalysisDetail.model_validate(rows[0])