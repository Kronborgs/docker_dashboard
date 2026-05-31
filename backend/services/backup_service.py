"""
Backup service — saves container inspect JSON to file + DB before destructive ops.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from config import settings
from database.engine import AsyncSessionLocal
from database.models import Backup

logger = logging.getLogger(__name__)


async def create_backup(
    container_id: str,
    container_name: str,
    inspect_data: dict,
    trigger: str = "manual",
) -> Backup:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    clean_name = container_name.lstrip("/")
    filename = f"{clean_name}-{ts}.json"

    backup_dir = settings.backups_dir
    backup_dir.mkdir(parents=True, exist_ok=True)

    file_path = backup_dir / filename
    try:
        file_path.write_text(json.dumps(inspect_data, indent=2), encoding="utf-8")
    except Exception as exc:
        logger.warning(f"Could not write backup file {file_path}: {exc}")
        file_path = None

    row = Backup(
        container_id=container_id,
        container_name=clean_name,
        file_path=str(file_path) if file_path else None,
        inspect_json=json.dumps(inspect_data),
        trigger=trigger,
    )
    async with AsyncSessionLocal() as session:
        session.add(row)
        await session.commit()
        await session.refresh(row)

    logger.info(f"Backup created for {clean_name} (trigger={trigger})")
    return row


async def get_backups_for_container(container_name: str) -> list[Backup]:
    from sqlalchemy import select
    clean_name = container_name.lstrip("/")
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Backup)
            .where(Backup.container_name == clean_name)
            .order_by(Backup.created_at.desc())
        )
        return result.scalars().all()


async def get_backup_by_id(backup_id: int) -> Backup | None:
    from sqlalchemy import select
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Backup).where(Backup.id == backup_id))
        return result.scalar_one_or_none()
