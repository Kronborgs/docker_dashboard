from fastapi import APIRouter, Query, HTTPException
from typing import List

from schemas.container import UpdateStatusOut, UpdateResultOut
from services import docker_service as ds
from services.update_service import check_update_for_image
from services.backup_service import create_backup
from services.recreate_service import recreate_container
from database.engine import AsyncSessionLocal
from database.models import UpdateHistory, ContainerEvent
import json

router = APIRouter(prefix="/api", tags=["updates"])


@router.get("/updates", response_model=List[UpdateStatusOut])
async def get_updates():
    containers = ds.list_containers()
    results = []

    for c in containers:
        try:
            c.reload()
        except Exception:
            continue

        config = c.attrs.get("Config", {})
        image_ref = config.get("Image", "")

        # Get repo digests from the image
        repo_digests: list[str] = []
        try:
            image_obj = c.client.images.get(c.attrs.get("Image", ""))
            repo_digests = image_obj.attrs.get("RepoDigests", [])
        except Exception:
            pass

        update_info = await check_update_for_image(image_ref, repo_digests)

        results.append(
            UpdateStatusOut(
                container_id=c.id,
                container_name=c.name,
                image=image_ref,
                status=update_info["status"],
                local_digest=update_info["local_digest"],
                remote_digest=update_info["remote_digest"],
                message=update_info["message"],
            )
        )

    return results


@router.post("/containers/{container_id}/update", response_model=UpdateResultOut)
async def update_container(
    container_id: str,
    dry_run: bool = Query(default=False),
):
    container = ds.get_container(container_id)
    container.reload()

    labels = container.labels or {}
    protected = str(labels.get("com.kronborg.dashboard.protected", "false")).lower() == "true"

    if protected:
        raise HTTPException(status_code=403, detail="Container is protected and cannot be updated.")

    inspect = container.attrs
    name = container.name
    image_ref = inspect.get("Config", {}).get("Image", "")
    steps: list[str] = []

    # Get local digest
    old_digest = None
    try:
        image_obj = container.client.images.get(inspect.get("Image", ""))
        digests = image_obj.attrs.get("RepoDigests", [])
        if digests:
            old_digest = digests[0].split("@", 1)[-1]
    except Exception:
        pass

    if dry_run:
        steps = [
            f"[DRY RUN] Would backup inspect JSON for '{name}'",
            f"[DRY RUN] Would pull image: {image_ref}",
            f"[DRY RUN] Would stop container '{name}'",
            f"[DRY RUN] Would recreate container '{name}' with same config",
            f"[DRY RUN] Would start container '{name}'",
        ]
        async with AsyncSessionLocal() as db:
            db.add(UpdateHistory(
                container_id=container_id,
                container_name=name,
                image=image_ref,
                old_digest=old_digest,
                new_digest=None,
                status="dry_run",
                message="\n".join(steps),
                dry_run=True,
            ))
            await db.commit()

        return UpdateResultOut(
            container_id=container_id,
            container_name=name,
            dry_run=True,
            status="dry_run",
            steps=steps,
            message="Dry run completed — no changes made.",
        )

    # --- Live update ---
    try:
        # 1. Backup
        backup = await create_backup(container_id, name, inspect, trigger="pre_update")
        steps.append(f"✓ Backup saved (id={backup.id})")

        # 2. Pull latest image
        new_image_id = ds.pull_image(image_ref)
        steps.append(f"✓ Pulled image: {image_ref}")

        # Get new digest
        new_digest = None
        try:
            image_obj = container.client.images.get(image_ref)
            digests = image_obj.attrs.get("RepoDigests", [])
            if digests:
                new_digest = digests[0].split("@", 1)[-1]
        except Exception:
            pass

        # 3. Stop + recreate + start
        new_container_id = recreate_container(inspect, new_image=image_ref)
        steps.append(f"✓ Container recreated (new id={new_container_id[:12]})")

        # 4. Start
        new_container = ds.get_container(new_container_id)
        new_container.start()
        steps.append(f"✓ Container started")

        # 5. Record event + update history
        async with AsyncSessionLocal() as db:
            db.add(UpdateHistory(
                container_id=new_container_id,
                container_name=name,
                image=image_ref,
                old_digest=old_digest,
                new_digest=new_digest,
                status="success",
                message="\n".join(steps),
                dry_run=False,
            ))
            db.add(ContainerEvent(
                container_id=new_container_id,
                container_name=name,
                event_type="update",
                status="success",
                message=f"Updated from {old_digest} to {new_digest}",
                inspect_json=json.dumps(new_container.attrs),
            ))
            await db.commit()

        return UpdateResultOut(
            container_id=new_container_id,
            container_name=name,
            dry_run=False,
            status="success",
            steps=steps,
            message=None,
        )

    except Exception as exc:
        error_msg = str(exc)
        steps.append(f"✗ Error: {error_msg}")

        async with AsyncSessionLocal() as db:
            db.add(UpdateHistory(
                container_id=container_id,
                container_name=name,
                image=image_ref,
                old_digest=old_digest,
                new_digest=None,
                status="error",
                message=error_msg,
                dry_run=False,
            ))
            await db.commit()

        raise HTTPException(status_code=500, detail=error_msg)


@router.post("/containers/{container_id}/rollback", response_model=UpdateResultOut)
async def rollback_container(container_id: str):
    from services.backup_service import get_backups_for_container
    from sqlalchemy import select
    from database.models import Backup

    container = ds.get_container(container_id)
    container.reload()

    labels = container.labels or {}
    if str(labels.get("com.kronborg.dashboard.managed", "false")).lower() != "true":
        raise HTTPException(status_code=403, detail="Container is not managed.")
    if str(labels.get("com.kronborg.dashboard.protected", "false")).lower() == "true":
        raise HTTPException(status_code=403, detail="Container is protected.")

    name = container.name.lstrip("/")

    # Find latest backup
    backups = await get_backups_for_container(name)
    if not backups:
        raise HTTPException(status_code=404, detail=f"No backups found for '{name}'.")

    latest = backups[0]
    inspect = json.loads(latest.inspect_json)
    steps: list[str] = []

    try:
        # Backup current state before rollback
        current_inspect = container.attrs
        rb_backup = await create_backup(container_id, name, current_inspect, trigger="pre_rollback")
        steps.append(f"✓ Current state backed up (id={rb_backup.id})")

        # Recreate from backup
        new_id = recreate_container(inspect)
        steps.append(f"✓ Recreated from backup dated {latest.created_at.isoformat()}")

        new_container = ds.get_container(new_id)
        new_container.start()
        steps.append("✓ Container started")

        async with AsyncSessionLocal() as db:
            db.add(ContainerEvent(
                container_id=new_id,
                container_name=name,
                event_type="rollback",
                status="success",
                message=f"Rolled back to backup id={latest.id} ({latest.created_at.isoformat()})",
                inspect_json=json.dumps(new_container.attrs),
            ))
            await db.commit()

        return UpdateResultOut(
            container_id=new_id,
            container_name=name,
            dry_run=False,
            status="success",
            steps=steps,
            message=f"Rolled back to backup from {latest.created_at.isoformat()}",
        )

    except Exception as exc:
        error_msg = str(exc)
        raise HTTPException(status_code=500, detail=error_msg)
