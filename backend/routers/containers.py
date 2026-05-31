from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import asyncio

from database.engine import get_db
from database.models import ContainerStats, ContainerEvent, ContainerSettings
from schemas.container import (
    ContainerOut, ContainerDetail, LogsOut,
    StatsHistoryPoint, ContainerEventOut,
)
from services import docker_service as ds

router = APIRouter(prefix="/api/containers", tags=["containers"])

LABEL_PROTECTED = "com.kronborg.dashboard.protected"


async def _load_settings_map(db: AsyncSession) -> dict:
    """Return {container_name: ContainerSettings row} for all DB overrides."""
    result = await db.execute(select(ContainerSettings))
    return {r.container_name: r for r in result.scalars().all()}


def _effective_protected(container_name: str, label_protected: bool, settings_map: dict) -> bool:
    """DB setting wins over Docker label. None in DB → use label."""
    row = settings_map.get(container_name)
    if row is not None and row.protected is not None:
        return row.protected
    return label_protected


async def _assert_modifiable(container_name: str, label_protected: bool, db: AsyncSession) -> None:
    """Raise 403 if the container is effectively protected."""
    result = await db.execute(
        select(ContainerSettings).where(ContainerSettings.container_name == container_name)
    )
    row = result.scalar_one_or_none()
    if row is not None and row.protected is not None:
        protected = row.protected
    else:
        protected = label_protected
    if protected:
        raise HTTPException(
            status_code=403,
            detail=f"Container '{container_name}' is protected and cannot be modified.",
        )


@router.get("", response_model=List[ContainerOut])
async def list_containers(db: AsyncSession = Depends(get_db)):
    containers = ds.list_containers()
    settings_map = await _load_settings_map(db)

    async def _summarize(c):
        try:
            await asyncio.to_thread(c.reload)
            # Check DB exclusion override
            row = settings_map.get(c.name)
            if row is not None and row.excluded is True:
                return None
            stats = await asyncio.to_thread(ds.get_live_stats, c) if c.status == "running" else None
            summary = ds.get_container_summary(c, stats)
            # Merge DB protected override
            if row is not None and row.protected is not None:
                summary["protected"] = row.protected
            return summary
        except Exception:
            return None

    summaries = await asyncio.gather(*[_summarize(c) for c in containers])
    return [s for s in summaries if s is not None]


@router.get("/{container_id}", response_model=ContainerDetail)
async def get_container(container_id: str, db: AsyncSession = Depends(get_db)):
    container = ds.get_container(container_id)
    await asyncio.to_thread(container.reload)
    stats = await asyncio.to_thread(ds.get_live_stats, container) if container.status == "running" else None
    detail = ds.get_container_detail(container, stats)
    # Merge DB protected override
    result = await db.execute(
        select(ContainerSettings).where(ContainerSettings.container_name == container.name)
    )
    row = result.scalar_one_or_none()
    if row is not None and row.protected is not None:
        detail["protected"] = row.protected
    return detail


@router.get("/{container_id}/logs", response_model=LogsOut)
async def get_logs(
    container_id: str,
    tail: int = Query(default=200, ge=1, le=5000),
):
    container = ds.get_container(container_id)
    logs = ds.get_logs(container_id, tail=tail)
    return LogsOut(
        container_id=container.id,
        container_name=container.name,
        logs=logs,
    )


@router.get("/{container_id}/stats/history", response_model=List[StatsHistoryPoint])
async def get_stats_history(
    container_id: str,
    hours: Optional[int] = Query(default=24, ge=1),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone, timedelta
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    result = await db.execute(
        select(ContainerStats)
        .where(ContainerStats.container_id == container_id)
        .where(ContainerStats.recorded_at >= since)
        .order_by(ContainerStats.recorded_at.asc())
    )
    rows = result.scalars().all()
    return [
        StatsHistoryPoint(
            recorded_at=r.recorded_at,
            cpu_percent=r.cpu_percent,
            mem_usage_mb=r.mem_usage_mb,
            mem_percent=r.mem_percent,
            net_rx_bytes=r.net_rx_bytes,
            net_tx_bytes=r.net_tx_bytes,
            block_read_bytes=r.block_read_bytes,
            block_write_bytes=r.block_write_bytes,
            pids=r.pids,
        )
        for r in rows
    ]


@router.get("/{container_id}/events", response_model=List[ContainerEventOut])
async def get_container_events(
    container_id: str,
    limit: int = Query(default=100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContainerEvent)
        .where(ContainerEvent.container_id == container_id)
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


@router.post("/{container_id}/start")
async def start_container(container_id: str, db: AsyncSession = Depends(get_db)):
    container = ds.get_container(container_id)
    label_protected = str((container.labels or {}).get(LABEL_PROTECTED, "false")).lower() == "true"
    await _assert_modifiable(container.name, label_protected, db)
    ds.start_container(container_id)
    return {"status": "started", "container_id": container_id}


@router.post("/{container_id}/stop")
async def stop_container(container_id: str, db: AsyncSession = Depends(get_db)):
    container = ds.get_container(container_id)
    label_protected = str((container.labels or {}).get(LABEL_PROTECTED, "false")).lower() == "true"
    await _assert_modifiable(container.name, label_protected, db)
    ds.stop_container(container_id)
    return {"status": "stopped", "container_id": container_id}


@router.post("/{container_id}/restart")
async def restart_container(container_id: str, db: AsyncSession = Depends(get_db)):
    container = ds.get_container(container_id)
    label_protected = str((container.labels or {}).get(LABEL_PROTECTED, "false")).lower() == "true"
    await _assert_modifiable(container.name, label_protected, db)
    ds.restart_container(container_id)
    return {"status": "restarted", "container_id": container_id}
