"""FastAPI application entry point."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config  # noqa: F401  (validates environment variables at startup)
from app.routers import analyze, history

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

app = FastAPI(
    title="ResuMatch AI API",
    description="Intelligent Resume-JD Gap Analysis & Career Coaching System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # must be False when allow_origins is "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(history.router)


@app.get("/health", tags=["System"])
def health_check() -> dict:
    return {"status": "ok"}