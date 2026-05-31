from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel


class NetworkInfo(BaseModel):
    network_name: str
    ip: str
    mac: str


class ContainerOut(BaseModel):
    id: str
    short_id: str
    name: str
    status: str           # running/exited/paused/restarting/dead/created
    health: str           # healthy/unhealthy/starting/none
    image: str
    image_tag: str
    image_id: str
    created_at: Optional[datetime]
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    uptime_seconds: Optional[int]
    networks: List[NetworkInfo]
    ports: Dict[str, Any]
    labels: Dict[str, str]
    managed: bool
    protected: bool
    cpu_percent: float
    mem_usage_mb: float
    mem_limit_mb: float
    mem_percent: float
    net_rx_bytes: float
    net_tx_bytes: float
    restart_policy: str
    command: Optional[str]
    hostname: str


class ContainerDetail(ContainerOut):
    inspect_raw: Dict[str, Any]
    env_vars: List[str]
    mounts: List[Dict[str, Any]]
    devices: List[str]
    cap_add: List[str]
    privileged: bool
    user: str
    working_dir: str
    entrypoint: Optional[Any]
    network_mode: str


class LogsOut(BaseModel):
    container_id: str
    container_name: str
    logs: str


class StatsHistoryPoint(BaseModel):
    recorded_at: datetime
    cpu_percent: float
    mem_usage_mb: float
    mem_percent: float
    net_rx_bytes: float
    net_tx_bytes: float
    block_read_bytes: float
    block_write_bytes: float
    pids: int


class ContainerEventOut(BaseModel):
    id: int
    container_id: str
    container_name: str
    event_type: str
    status: Optional[str]
    message: Optional[str]
    has_inspect: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UpdateStatusOut(BaseModel):
    container_id: str
    container_name: str
    image: str
    status: str           # up_to_date/update_available/unknown/error
    local_digest: Optional[str]
    remote_digest: Optional[str]
    message: Optional[str]


class UpdateResultOut(BaseModel):
    container_id: str
    container_name: str
    dry_run: bool
    status: str
    steps: List[str]
    message: Optional[str]


class BackupOut(BaseModel):
    id: int
    container_id: str
    container_name: str
    file_path: Optional[str]
    trigger: str
    created_at: datetime

    class Config:
        from_attributes = True


class SummaryOut(BaseModel):
    total: int
    running: int
    stopped: int
    excluded: int
    protected: int
    updates_available: int
    paused: int
    unhealthy: int
