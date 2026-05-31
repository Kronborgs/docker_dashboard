from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List

from database.engine import get_db
from database.models import ContainerSettings
from schemas.container import ContainerSettingsOut, ContainerSettingsPatch

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=List[ContainerSettingsOut])
async def get_all_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ContainerSettings))
    return result.scalars().all()


@router.get("/{container_name}", response_model=ContainerSettingsOut)
async def get_settings(container_name: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ContainerSettings).where(ContainerSettings.container_name == container_name)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return ContainerSettingsOut(container_name=container_name, protected=None, excluded=None)
    return row


@router.patch("/{container_name}", response_model=ContainerSettingsOut)
async def patch_settings(
    container_name: str,
    patch: ContainerSettingsPatch,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContainerSettings).where(ContainerSettings.container_name == container_name)
    )
    row = result.scalar_one_or_none()
    if row is None:
        row = ContainerSettings(container_name=container_name)
        db.add(row)

    # Only update fields that were explicitly provided in the request body
    if "protected" in patch.model_fields_set:
        row.protected = patch.protected
    if "excluded" in patch.model_fields_set:
        row.excluded = patch.excluded
    if "group_id" in patch.model_fields_set:
        row.group_id = patch.group_id

    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/{container_name}", status_code=204)
async def delete_settings(container_name: str, db: AsyncSession = Depends(get_db)):
    await db.execute(
        delete(ContainerSettings).where(ContainerSettings.container_name == container_name)
    )
    await db.commit()
