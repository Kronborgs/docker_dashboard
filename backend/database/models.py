from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, func
from database.engine import Base


class ContainerEvent(Base):
    __tablename__ = "container_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    container_id = Column(String(64), nullable=False, index=True)
    container_name = Column(String(256), nullable=False, index=True)
    event_type = Column(String(64), nullable=False)  # start/stop/die/restart/update/rollback/create/destroy
    status = Column(String(64))                       # success/error/dry_run
    message = Column(Text)
    inspect_json = Column(Text)                       # full inspect snapshot at event time
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)


class ContainerStats(Base):
    __tablename__ = "container_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    container_id = Column(String(64), nullable=False, index=True)
    container_name = Column(String(256), nullable=False)
    cpu_percent = Column(Float, default=0.0)
    mem_usage_mb = Column(Float, default=0.0)
    mem_limit_mb = Column(Float, default=0.0)
    mem_percent = Column(Float, default=0.0)
    net_rx_bytes = Column(Float, default=0.0)
    net_tx_bytes = Column(Float, default=0.0)
    block_read_bytes = Column(Float, default=0.0)
    block_write_bytes = Column(Float, default=0.0)
    pids = Column(Integer, default=0)
    recorded_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)


class UpdateHistory(Base):
    __tablename__ = "update_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    container_id = Column(String(64), nullable=False, index=True)
    container_name = Column(String(256), nullable=False)
    image = Column(String(512))
    old_digest = Column(String(256))
    new_digest = Column(String(256))
    status = Column(String(64))      # success/error/dry_run/rolled_back
    message = Column(Text)
    dry_run = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)


class Backup(Base):
    __tablename__ = "backups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    container_id = Column(String(64), nullable=False, index=True)
    container_name = Column(String(256), nullable=False, index=True)
    file_path = Column(String(1024))
    inspect_json = Column(Text, nullable=False)
    trigger = Column(String(64))   # manual/pre_update/pre_rollback
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)


class ContainerSettings(Base):
    __tablename__ = "container_settings"

    container_name = Column(String(256), primary_key=True)
    protected = Column(Boolean, nullable=True)   # None = defer to Docker label
    excluded = Column(Boolean, nullable=True)    # None = defer to Docker label
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
