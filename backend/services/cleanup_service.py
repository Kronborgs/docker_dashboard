"""
Periodic data-retention cleanup — runs once per hour.
Deletes ContainerStats and ContainerEvents older than the configured
data_retention_days value stored in app_config.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, text

from database.engine import AsyncSessionLocal
from database.models import AppConfig, ContainerStats, ContainerEvent

logger = logging.getLogger(__name__)

_CLEANUP_INTERVAL_SECONDS = 3600  # 1 hour


async def _get_retention_days() -> int:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AppConfig).where(AppConfig.key == "data_retention_days")
        )
        row = result.scalar_one_or_none()
        if row is None:
            return 90
        try:
            return int(row.value)
        except ValueError:
            return 90


async def _cleanup_once() -> None:
    retention_days = await _get_retention_days()
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    # SQLite stores datetimes without timezone; strip tz for comparison
    cutoff_naive = cutoff.replace(tzinfo=None)

    async with AsyncSessionLocal() as session:
        stats_result = await session.execute(
            delete(ContainerStats).where(ContainerStats.recorded_at < cutoff_naive)
        )
        events_result = await session.execute(
            delete(ContainerEvent).where(ContainerEvent.created_at < cutoff_naive)
        )
        await session.commit()

    stats_deleted = stats_result.rowcount
    events_deleted = events_result.rowcount
    if stats_deleted or events_deleted:
        logger.info(
            f"Cleanup: removed {stats_deleted} stats rows and {events_deleted} event rows "
            f"older than {retention_days} days"
        )


async def run_cleanup_service() -> None:
    """Run forever — call as asyncio.create_task."""
    logger.info("Data-retention cleanup service started")
    while True:
        try:
            await _cleanup_once()
        except Exception as exc:
            logger.warning(f"Cleanup error: {exc}")
        await asyncio.sleep(_CLEANUP_INTERVAL_SECONDS)
