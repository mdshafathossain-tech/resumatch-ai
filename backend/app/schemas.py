"""Pydantic models for API requests and responses."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class RewrittenBullet(BaseModel):
    original: str = Field(..., description="Original resume bullet point")
    suggested: str = Field(..., description="AI-enhanced, JD-aligned bullet point")


class AnalysisResponse(BaseModel):
    overall_match_score: int = Field(..., ge=0, le=100)
    hard_skills_score: int = Field(..., ge=0, le=100)
    soft_skills_score: int = Field(..., ge=0, le=100)
    missing_keywords: List[str] = Field(default_factory=list)
    skill_gaps: List[str] = Field(default_factory=list)
    rewritten_bullets: List[RewrittenBullet] = Field(default_factory=list)


class HistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    resume_filename: str
    job_title: str
    overall_match_score: int = Field(..., ge=0, le=100)
    created_at: datetime


class AnalysisDetail(AnalysisResponse):
    """AnalysisResponse plus the stored record's metadata."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    resume_filename: str
    job_title: str
    job_description: Optional[str] = None
    created_at: datetime