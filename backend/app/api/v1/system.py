from __future__ import annotations

import logging
import time
import urllib.error
import urllib.request

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(prefix="/system", tags=["system"])
logger = logging.getLogger(__name__)

_GITHUB_REPO = "xoriin/netmap"
_CACHE_TTL = 3600  # 1 hour

_cached_latest: str | None = None
_cached_at: float = 0.0


def _fetch_latest_version() -> str | None:
    global _cached_latest, _cached_at
    now = time.monotonic()
    if _cached_latest is not None and (now - _cached_at) < _CACHE_TTL:
        return _cached_latest
    try:
        import json
        import re
        url = f"https://api.github.com/repos/{_GITHUB_REPO}/tags?per_page=10"
        req = urllib.request.Request(url, headers={"User-Agent": f"netmap/{settings.app_version}"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            tags = json.loads(resp.read())
        for entry in tags:
            tag = entry.get("name", "")
            version = tag.lstrip("v")
            if re.fullmatch(r"\d+\.\d+\.\d+", version):
                _cached_latest = version
                _cached_at = now
                return version
    except Exception:
        logger.debug("Could not fetch latest tag from GitHub", exc_info=True)
    return None


@router.get("/version")
def get_version() -> dict:
    current = settings.app_version.lstrip("v")
    latest = _fetch_latest_version()
    up_to_date = latest is None or latest == current
    return {
        "current": current,
        "latest": latest,
        "up_to_date": up_to_date,
        "release_url": f"https://github.com/{_GITHUB_REPO}/releases",
    }
