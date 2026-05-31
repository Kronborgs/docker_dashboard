from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sa_delete
from typing import List

from database.engine import get_db
from database.models import ContainerGroup, ContainerSettings
from schemas.container import GroupOut, GroupCreate, GroupSetMembers

router = APIRouter(prefix="/api/groups", tags=["groups"])


@router.get("", response_model=List[GroupOut])
async def list_groups(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(ContainerGroup).order_by(ContainerGroup.id))).scalars().all()
    return rows


@router.post("", response_model=GroupOut, status_code=201)
async def create_group(body: GroupCreate, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(
        select(ContainerGroup).where(ContainerGroup.name == body.name)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Group name already exists")
    grp = ContainerGroup(name=body.name, color=body.color)
    db.add(grp)
    await db.commit()
    await db.refresh(grp)
    return grp


@router.patch("/{group_id}", response_model=GroupOut)
async def update_group(group_id: int, body: GroupCreate, db: AsyncSession = Depends(get_db)):
    grp = (await db.execute(
        select(ContainerGroup).where(ContainerGroup.id == group_id)
    )).scalar_one_or_none()
    if not grp:
        raise HTTPException(404, "Group not found")
    grp.name = body.name
    if body.color is not None:
        grp.color = body.color
    await db.commit()
    await db.refresh(grp)
    return grp


@router.delete("/{group_id}", status_code=204)
async def delete_group(group_id: int, db: AsyncSession = Depends(get_db)):
    # Clear group_id from all members first
    settings = (await db.execute(
        select(ContainerSettings).where(ContainerSettings.group_id == group_id)
    )).scalars().all()
    for s in settings:
        s.group_id = None
    await db.execute(sa_delete(ContainerGroup).where(ContainerGroup.id == group_id))
    await db.commit()


@router.get("/{group_id}/members")
async def get_group_members(group_id: int, db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(
        select(ContainerSettings.container_name).where(ContainerSettings.group_id == group_id)
    )).scalars().all()
    return {"container_names": list(rows)}


@router.put("/{group_id}/members", status_code=204)
async def set_group_members(
    group_id: int,
    body: GroupSetMembers,
    db: AsyncSession = Depends(get_db),
):
    grp = (await db.execute(
        select(ContainerGroup).where(ContainerGroup.id == group_id)
    )).scalar_one_or_none()
    if not grp:
        raise HTTPException(404, "Group not found")

    # Remove all current members of this group
    existing = (await db.execute(
        select(ContainerSettings).where(ContainerSettings.group_id == group_id)
    )).scalars().all()
    for s in existing:
        s.group_id = None

    # Assign new members (upsert)
    for name in body.container_names:
        row = (await db.execute(
            select(ContainerSettings).where(ContainerSettings.container_name == name)
        )).scalar_one_or_none()
        if row:
            row.group_id = group_id
        else:
            db.add(ContainerSettings(container_name=name, group_id=group_id))

    await db.commit()
