from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from schemas.container import SummaryOut
from services import docker_service as ds
from database.engine import get_db
from database.models import ContainerSettings

router = APIRouter(prefix="/api", tags=["summary"])

LABEL_PROTECTED = "com.kronborg.dashboard.protected"
LABEL_EXCLUDED = "com.kronborg.dashboard.excluded"


@router.get("/summary", response_model=SummaryOut)
async def get_summary(db: AsyncSession = Depends(get_db)):
    containers = ds.list_containers()  # already filters label-excluded
    result = await db.execute(select(ContainerSettings))
    settings_map = {r.container_name: r for r in result.scalars().all()}

    total = running = stopped = protected = unhealthy = paused = excluded_db = 0

    for c in containers:
        row = settings_map.get(c.name)

        # Check effective excluded (DB wins)
        if row is not None and row.excluded is True:
            excluded_db += 1
            continue  # don't count in other stats

        total += 1
        status = c.status
        labels = c.labels or {}

        if status == "running":
            running += 1
        elif status in ("exited", "dead", "created"):
            stopped += 1
        elif status == "paused":
            paused += 1

        # Effective protected (DB wins)
        if row is not None and row.protected is not None:
            if row.protected:
                protected += 1
        elif str(labels.get(LABEL_PROTECTED, "false")).lower() == "true":
            protected += 1

        health = (c.attrs.get("State", {}).get("Health", {}) or {}).get("Status", "")
        if health == "unhealthy":
            unhealthy += 1

    # label-excluded count comes from docker_service; DB-excluded adds on top
    label_excluded = ds.count_excluded()

    return SummaryOut(
        total=total,
        running=running,
        stopped=stopped,
        excluded=label_excluded + excluded_db,
        protected=protected,
        updates_available=0,
        paused=paused,
        unhealthy=unhealthy,
    )
