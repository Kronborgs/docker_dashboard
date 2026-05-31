import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database.engine import init_db
from routers import containers, updates, backups, summary, settings, groups
from services.stats_collector import run_stats_collector
from services.event_listener import run_event_listener

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

FRONTEND_DIST = Path(__file__).parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    logger.info("Database initialized")

    tasks = [
        asyncio.create_task(run_stats_collector(), name="stats_collector"),
        asyncio.create_task(run_event_listener(), name="event_listener"),
    ]
    logger.info("Background tasks started")

    yield

    # Shutdown
    for task in tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    logger.info("Background tasks stopped")


app = FastAPI(
    title="Docker Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

# Routers
app.include_router(containers.router)
app.include_router(updates.router)
app.include_router(backups.router)
app.include_router(summary.router)
app.include_router(settings.router)
app.include_router(groups.router)


# History endpoint — all events across all containers
from fastapi import Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database.engine import get_db
from database.models import ContainerEvent
from schemas.container import ContainerEventOut
from typing import List


@app.get("/api/events", response_model=List[ContainerEventOut], tags=["events"])
async def get_all_events(
    limit: int = Query(default=200, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContainerEvent)
        .order_by(ContainerEvent.created_at.desc())
        .limit(limit)
    )
    rows = result.scalars().all()
    return [
        ContainerEventOut(
            id=r.id,
            container_id=r.container_id,
            container_name=r.container_name,
            event_type=r.event_type,
            status=r.status,
            message=r.message,
            has_inspect=bool(r.inspect_json),
            created_at=r.created_at,
        )
        for r in rows
    ]


# Serve React frontend
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        return FileResponse(str(index))
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return {"message": "Docker Dashboard API running. Frontend not built yet."}
