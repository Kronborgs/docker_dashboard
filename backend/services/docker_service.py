"""
Docker SDK wrapper.
- All read operations are always available.
- Write operations enforce managed/protected label checks.
"""

import json
from datetime import datetime, timezone
from typing import List, Optional
import docker
from docker.errors import DockerException, NotFound, APIError
from fastapi import HTTPException

LABEL_EXCLUDED = "com.kronborg.dashboard.excluded"
LABEL_PROTECTED = "com.kronborg.dashboard.protected"


def _get_client() -> docker.DockerClient:
    try:
        return docker.from_env()
    except DockerException as exc:
        raise HTTPException(status_code=503, detail=f"Docker socket unavailable: {exc}")


def _parse_bool_label(labels: dict, key: str) -> bool:
    return str(labels.get(key, "false")).lower() == "true"


def _assert_not_protected(container) -> None:
    labels = container.labels or {}
    if _parse_bool_label(labels, LABEL_PROTECTED):
        raise HTTPException(
            status_code=403,
            detail=f"Container '{container.name}' is protected and cannot be modified.",
        )


def _calc_cpu_percent(stats: dict) -> float:
    try:
        cpu_delta = (
            stats["cpu_stats"]["cpu_usage"]["total_usage"]
            - stats["precpu_stats"]["cpu_usage"]["total_usage"]
        )
        system_delta = (
            stats["cpu_stats"]["system_cpu_usage"]
            - stats["precpu_stats"]["system_cpu_usage"]
        )
        num_cpus = stats["cpu_stats"].get("online_cpus") or len(
            stats["cpu_stats"]["cpu_usage"].get("percpu_usage", [1])
        )
        if system_delta > 0 and cpu_delta > 0:
            return (cpu_delta / system_delta) * num_cpus * 100.0
    except (KeyError, ZeroDivisionError):
        pass
    return 0.0


def _calc_net(stats: dict) -> tuple[float, float]:
    rx = tx = 0.0
    for iface_data in stats.get("networks", {}).values():
        rx += iface_data.get("rx_bytes", 0)
        tx += iface_data.get("tx_bytes", 0)
    return rx, tx


def _calc_block(stats: dict) -> tuple[float, float]:
    read_bytes = write_bytes = 0.0
    for entry in stats.get("blkio_stats", {}).get("io_service_bytes_recursive") or []:
        if entry.get("op") == "read":
            read_bytes += entry.get("value", 0)
        elif entry.get("op") == "write":
            write_bytes += entry.get("value", 0)
    return read_bytes, write_bytes


def _parse_datetime(s: Optional[str]) -> Optional[datetime]:
    if not s or s.startswith("0001"):
        return None
    try:
        s = s.split(".")[0].replace("Z", "+00:00")
        return datetime.fromisoformat(s).replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _uptime_seconds(started_at: Optional[datetime], status: str) -> Optional[int]:
    if started_at and status == "running":
        return int((datetime.now(timezone.utc) - started_at).total_seconds())
    return None


def get_container_summary(container, live_stats: Optional[dict] = None) -> dict:
    """Return a flat dict suitable for ContainerOut."""
    inspect = container.attrs
    state = inspect.get("State", {})
    config = inspect.get("Config", {})
    net_settings = inspect.get("NetworkSettings", {})

    labels = config.get("Labels") or {}
    protected = _parse_bool_label(labels, LABEL_PROTECTED)

    # Health
    health_obj = state.get("Health", {})
    if health_obj:
        health = health_obj.get("Status", "none")
    else:
        health = "none"

    # Image
    image_full = config.get("Image", "")
    if ":" in image_full:
        image_name, image_tag = image_full.rsplit(":", 1)
    else:
        image_name, image_tag = image_full, "latest"

    # Networks
    networks = []
    for net_name, net_data in (net_settings.get("Networks") or {}).items():
        networks.append(
            {
                "network_name": net_name,
                "ip": net_data.get("IPAddress", ""),
                "mac": net_data.get("MacAddress", ""),
            }
        )

    # Ports
    ports = net_settings.get("Ports") or {}

    # Timestamps
    created_at = _parse_datetime(inspect.get("Created"))
    started_at = _parse_datetime(state.get("StartedAt"))
    finished_at = _parse_datetime(state.get("FinishedAt"))
    status = state.get("Status", "unknown")
    uptime = _uptime_seconds(started_at, status)

    # Stats
    cpu_percent = mem_usage_mb = mem_limit_mb = mem_percent = 0.0
    net_rx = net_tx = 0.0
    if live_stats:
        cpu_percent = _calc_cpu_percent(live_stats)
        mem_usage = live_stats.get("memory_stats", {}).get("usage", 0)
        mem_limit = live_stats.get("memory_stats", {}).get("limit", 0)
        mem_usage_mb = mem_usage / 1024 / 1024
        mem_limit_mb = mem_limit / 1024 / 1024
        if mem_limit > 0:
            mem_percent = (mem_usage / mem_limit) * 100.0
        net_rx, net_tx = _calc_net(live_stats)

    restart_policy = (
        inspect.get("HostConfig", {}).get("RestartPolicy", {}).get("Name", "no")
    )

    cmd = config.get("Cmd")
    command = " ".join(cmd) if isinstance(cmd, list) else (cmd or "")

    return {
        "id": container.id,
        "short_id": container.short_id,
        "name": container.name,
        "status": status,
        "health": health,
        "image": image_name,
        "image_tag": image_tag,
        "image_id": inspect.get("Image", ""),
        "created_at": created_at,
        "started_at": started_at,
        "finished_at": finished_at,
        "uptime_seconds": uptime,
        "networks": networks,
        "ports": ports,
        "labels": labels,
        "managed": True,
        "protected": protected,
        "cpu_percent": round(cpu_percent, 2),
        "mem_usage_mb": round(mem_usage_mb, 2),
        "mem_limit_mb": round(mem_limit_mb, 2),
        "mem_percent": round(mem_percent, 2),
        "net_rx_bytes": net_rx,
        "net_tx_bytes": net_tx,
        "restart_policy": restart_policy,
        "command": command,
        "hostname": config.get("Hostname", ""),
    }


def get_container_detail(container, live_stats: Optional[dict] = None) -> dict:
    inspect = container.attrs
    config = inspect.get("Config", {})
    host_config = inspect.get("HostConfig", {})

    base = get_container_summary(container, live_stats)

    # Devices
    devices = [
        d.get("PathOnHost", "")
        for d in (host_config.get("Devices") or [])
    ]
    cap_add = host_config.get("CapAdd") or []

    # Mounts
    mounts = inspect.get("Mounts", [])

    return {
        **base,
        "inspect_raw": inspect,
        "env_vars": config.get("Env") or [],
        "mounts": mounts,
        "devices": devices,
        "cap_add": cap_add,
        "privileged": host_config.get("Privileged", False),
        "user": config.get("User", ""),
        "working_dir": config.get("WorkingDir", ""),
        "entrypoint": config.get("Entrypoint"),
        "network_mode": host_config.get("NetworkMode", "bridge"),
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def list_containers() -> list:
    """Return all containers except those with the excluded label."""
    client = _get_client()
    all_containers = client.containers.list(all=True)
    return [
        c for c in all_containers
        if not _parse_bool_label(c.labels or {}, LABEL_EXCLUDED)
    ]


def count_excluded() -> int:
    """Count containers hidden via the excluded label (for summary card)."""
    client = _get_client()
    all_containers = client.containers.list(all=True)
    return sum(1 for c in all_containers if _parse_bool_label(c.labels or {}, LABEL_EXCLUDED))


def get_container(container_id: str):
    client = _get_client()
    try:
        return client.containers.get(container_id)
    except NotFound:
        raise HTTPException(status_code=404, detail=f"Container {container_id} not found.")


def get_live_stats(container) -> Optional[dict]:
    """Fetch one stats snapshot without streaming. Returns None on error."""
    try:
        return container.stats(stream=False)
    except Exception:
        return None


def get_logs(container_id: str, tail: int = 200) -> str:
    container = get_container(container_id)
    try:
        raw = container.logs(tail=tail, timestamps=True)
        return raw.decode("utf-8", errors="replace") if isinstance(raw, bytes) else raw
    except APIError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


def start_container(container_id: str) -> None:
    container = get_container(container_id)
    try:
        container.start()
    except APIError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


def stop_container(container_id: str) -> None:
    container = get_container(container_id)
    try:
        container.stop(timeout=30)
    except APIError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


def restart_container(container_id: str) -> None:
    container = get_container(container_id)
    try:
        container.restart(timeout=30)
    except APIError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


def pull_image(image_ref: str) -> str:
    """Pull image, return new image ID."""
    client = _get_client()
    try:
        image = client.images.pull(image_ref)
        return image.id
    except APIError as exc:
        raise HTTPException(status_code=500, detail=f"Image pull failed: {exc}")


def remove_container(container_id: str) -> None:
    """Remove container (not volumes). Only for non-protected."""
    container = get_container(container_id)
    try:
        container.remove(force=True, v=False)
    except APIError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


def get_inspect_json(container_id: str) -> dict:
    container = get_container(container_id)
    return container.attrs
