from fastapi import APIRouter
from schemas.container import SummaryOut
from services import docker_service as ds

router = APIRouter(prefix="/api", tags=["summary"])


@router.get("/summary", response_model=SummaryOut)
async def get_summary():
    containers = ds.list_containers()
    excluded = ds.count_excluded()
    total = running = stopped = protected = unhealthy = paused = 0

    for c in containers:
        total += 1
        status = c.status
        labels = c.labels or {}

        if status == "running":
            running += 1
        elif status in ("exited", "dead", "created"):
            stopped += 1
        elif status == "paused":
            paused += 1

        if str(labels.get("com.kronborg.dashboard.protected", "false")).lower() == "true":
            protected += 1

        health = (c.attrs.get("State", {}).get("Health", {}) or {}).get("Status", "")
        if health == "unhealthy":
            unhealthy += 1

    return SummaryOut(
        total=total,
        running=running,
        stopped=stopped,
        excluded=excluded,
        protected=protected,
        updates_available=0,  # Frontend fetches this separately from /api/updates
        paused=paused,
        unhealthy=unhealthy,
    )
