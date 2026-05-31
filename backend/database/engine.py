from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from config import settings
from pathlib import Path


Path(settings.config_dir).mkdir(parents=True, exist_ok=True)

engine = create_async_engine(
    f"sqlite+aiosqlite:///{settings.db_path}",
    echo=False,
    connect_args={"check_same_thread": False},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    from database import models  # noqa: F401 — registers models
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migrate: add group_id column to container_settings if it doesn't exist
        result = await conn.execute(text("PRAGMA table_info(container_settings)"))
        cols = [row[1] for row in result.fetchall()]
        if "group_id" not in cols:
            await conn.execute(
                text("ALTER TABLE container_settings ADD COLUMN group_id INTEGER")
            )
