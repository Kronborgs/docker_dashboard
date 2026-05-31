from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import asyncio

from database.engine import get_db
from database.models import ContainerStats, ContainerEvent
from schemas.container import (
    ContainerOut, ContainerDetail, LogsOut,
    StatsHistoryPoint, ContainerEventOut,
)
from services import docker_service as ds

router = APIRouter(prefix="/api/containers", tags=["containers"])


@router.get("", response_model=List[ContainerOut])
async def list_containers():
    containers = ds.list_containers()
    result = []
    for c in containers:
        try:
            c.reload()
            stats = ds.get_live_stats(c) if c.status == "running" else None
            result.append(ds.get_container_summary(c, stats))
        except Exception:
            pass
    return result


@router.get("/{container_id}", response_model=ContainerDetail)
async def get_container(container_id: str):
    container = ds.get_container(container_id)
    container.reload()
    stats = ds.get_live_stats(container) if container.status == "running" else None
    return ds.get_container_detail(container, stats)


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
async def start_container(container_id: str):
    ds.start_container(container_id)
    return {"status": "started", "container_id": container_id}


@router.post("/{container_id}/stop")
async def stop_container(container_id: str):
    ds.stop_container(container_id)
    return {"status": "stopped", "container_id": container_id}


@router.post("/{container_id}/restart")
async def restart_container(container_id: str):
    ds.restart_container(container_id)
    return {"status": "restarted", "container_id": container_id}
