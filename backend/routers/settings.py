from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List

from database.engine import get_db
from database.models import ContainerSettings, AppConfig
from schemas.container import ContainerSettingsOut, ContainerSettingsPatch, AppConfigOut, AppConfigPatch

router = APIRouter(prefix="/api/settings", tags=["settings"])

_VALID_RETENTION_DAYS = {30, 60, 90}


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


# ── App-wide config ───────────────────────────────────────────────────────────

@router.get("/config/app", response_model=AppConfigOut)
async def get_app_config(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppConfig).where(AppConfig.key == "data_retention_days"))
    row = result.scalar_one_or_none()
    days = int(row.value) if row else 90
    return AppConfigOut(data_retention_days=days)


@router.patch("/config/app", response_model=AppConfigOut)
async def patch_app_config(patch: AppConfigPatch, db: AsyncSession = Depends(get_db)):
    if patch.data_retention_days not in _VALID_RETENTION_DAYS:
        raise HTTPException(status_code=422, detail="data_retention_days must be 30, 60, or 90")

    result = await db.execute(select(AppConfig).where(AppConfig.key == "data_retention_days"))
    row = result.scalar_one_or_none()
    if row is None:
        row = AppConfig(key="data_retention_days", value=str(patch.data_retention_days))
        db.add(row)
    else:
        row.value = str(patch.data_retention_days)

    await db.commit()
    return AppConfigOut(data_retention_days=patch.data_retention_days)
