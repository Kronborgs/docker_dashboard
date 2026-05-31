"""
Periodic stats collector — polls all running containers every STATS_INTERVAL_SECONDS.
Runs as asyncio background task.
"""

import asyncio
import json
import logging
from datetime import datetime

from config import settings
from database.engine import AsyncSessionLocal
from database.models import ContainerStats
from services.docker_service import list_containers, get_live_stats, _calc_cpu_percent, _calc_net, _calc_block

logger = logging.getLogger(__name__)


async def _collect_once():
    try:
        containers = await asyncio.to_thread(list_containers)
    except Exception as exc:
        logger.warning(f"Stats collect: failed to list containers: {exc}")
        return

    async def _collect_one(container):
        if container.status != "running":
            return None
        try:
            await asyncio.to_thread(container.reload)
            stats = await asyncio.to_thread(get_live_stats, container)
            if not stats:
                return None

            cpu = _calc_cpu_percent(stats)
            mem_usage = stats.get("memory_stats", {}).get("usage", 0)
            mem_limit = stats.get("memory_stats", {}).get("limit", 0)
            mem_usage_mb = mem_usage / 1024 / 1024
            mem_limit_mb = mem_limit / 1024 / 1024
            mem_percent = (mem_usage / mem_limit * 100.0) if mem_limit > 0 else 0.0
            net_rx, net_tx = _calc_net(stats)
            blk_r, blk_w = _calc_block(stats)
            pids = stats.get("pids_stats", {}).get("current", 0)

            return ContainerStats(
                container_id=container.id,
                container_name=container.name,
                cpu_percent=round(cpu, 2),
                mem_usage_mb=round(mem_usage_mb, 2),
                mem_limit_mb=round(mem_limit_mb, 2),
                mem_percent=round(mem_percent, 2),
                net_rx_bytes=net_rx,
                net_tx_bytes=net_tx,
                block_read_bytes=blk_r,
                block_write_bytes=blk_w,
                pids=pids or 0,
            )
        except Exception as exc:
            logger.debug(f"Stats collect error for {container.name}: {exc}")
            return None

    results = await asyncio.gather(*[_collect_one(c) for c in containers])
    rows = [r for r in results if r is not None]

    if rows:
        async with AsyncSessionLocal() as session:
            session.add_all(rows)
            await session.commit()


async def run_stats_collector():
    """Run forever — call as asyncio.create_task."""
    logger.info(f"Stats collector started (interval={settings.stats_interval_seconds}s)")
    while True:
        await _collect_once()
        await asyncio.sleep(settings.stats_interval_seconds)
