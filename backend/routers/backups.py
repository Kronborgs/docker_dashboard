from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from typing import List

from database.engine import AsyncSessionLocal
from database.models import Backup
from schemas.container import BackupOut

router = APIRouter(prefix="/api/backups", tags=["backups"])


@router.get("", response_model=List[BackupOut])
async def list_all_backups():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Backup).order_by(Backup.created_at.desc()).limit(500)
        )
        return result.scalars().all()


@router.get("/{container_name}", response_model=List[BackupOut])
async def list_backups_for_container(container_name: str):
    clean = container_name.lstrip("/")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Backup)
            .where(Backup.container_name == clean)
            .order_by(Backup.created_at.desc())
        )
        rows = result.scalars().all()
    if not rows:
        raise HTTPException(status_code=404, detail=f"No backups found for '{clean}'.")
    return rows
