"""Application configuration loaded from environment variables."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


class ConfigError(RuntimeError):
    """Raised when a required environment variable is missing."""


def _require(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ConfigError(
            f"Missing required environment variable: {name}. "
            "Set it in your .env file or hosting dashboard."
        )
    return value


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_key: str
    gemini_api_key: str


def load_settings() -> Settings:
    return Settings(
        supabase_url=_require("SUPABASE_URL"),
        supabase_key=_require("SUPABASE_KEY"),
        gemini_api_key=_require("GEMINI_API_KEY"),
    )


settings = load_settings()

SUPABASE_URL = settings.supabase_url
SUPABASE_KEY = settings.supabase_key
GEMINI_API_KEY = settings.gemini_api_key