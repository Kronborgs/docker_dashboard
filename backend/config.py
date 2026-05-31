from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    config_dir: str = "/config"
    stats_interval_seconds: int = 30
    log_tail_default: int = 200
    private_registry_url: str = ""
    private_registry_token: str = ""
    dashboard_username: str = ""
    dashboard_password: str = ""

    @property
    def db_path(self) -> str:
        return str(Path(self.config_dir) / "dashboard.db")

    @property
    def backups_dir(self) -> Path:
        return Path(self.config_dir) / "backups"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
