"""
Docker event listener — streams Docker events and records lifecycle events to DB.
Captures full inspect JSON at each event for historical record.
"""

import asyncio
import json
import logging
from datetime import datetime

import docker
from docker.errors import DockerException

from database.engine import AsyncSessionLocal
from database.models import ContainerEvent

logger = logging.getLogger(__name__)

TRACKED_EVENTS = {
    "create", "start", "restart", "stop", "kill", "die",
    "pause", "unpause", "destroy", "rename", "update",
    "health_status",
}


def _get_inspect_safe(client: docker.DockerClient, container_id: str) -> str | None:
    try:
        container = client.containers.get(container_id)
        return json.dumps(container.attrs)
    except Exception:
        return None


async def run_event_listener():
    """Run forever — reconnects on Docker socket errors."""
    logger.info("Docker event listener started")
    while True:
        try:
            client = docker.from_env()
            event_gen = client.events(decode=True)

            # Run blocking generator in thread executor
            loop = asyncio.get_event_loop()

            def _iter_events():
                for event in event_gen:
                    if event.get("Type") == "container":
                        action = event.get("Action", "")
                        # health_status:healthy → normalize
                        if action.startswith("health_status"):
                            action = "health_status"
                        if action in TRACKED_EVENTS:
                            yield event

            async def _process():
                for event in await loop.run_in_executor(None, list):
                    pass

            # Use async iterator pattern via thread
            queue: asyncio.Queue = asyncio.Queue()

            def _feed_queue():
                try:
                    for event in client.events(decode=True):
                        if event.get("Type") == "container":
                            action = event.get("Action", "")
                            if action.startswith("health_status"):
                                action = "health_status"
                            if action in TRACKED_EVENTS:
                                asyncio.run_coroutine_threadsafe(
                                    queue.put(event), loop
                                )
                except Exception as exc:
                    asyncio.run_coroutine_threadsafe(
                        queue.put({"_error": str(exc)}), loop
                    )

            import threading
            t = threading.Thread(target=_feed_queue, daemon=True)
            t.start()

            while True:
                event = await queue.get()
                if "_error" in event:
                    logger.warning(f"Event listener error: {event['_error']}")
                    break

                actor = event.get("Actor", {})
                container_id = actor.get("ID", "")
                attrs = actor.get("Attributes", {})
                container_name = attrs.get("name", "")
                action = event.get("Action", "")
                if action.startswith("health_status"):
                    action = "health_status"

                inspect_json = _get_inspect_safe(client, container_id)

                row = ContainerEvent(
                    container_id=container_id,
                    container_name=container_name,
                    event_type=action,
                    status="recorded",
                    message=json.dumps(attrs),
                    inspect_json=inspect_json,
                )
                try:
                    async with AsyncSessionLocal() as session:
                        session.add(row)
                        await session.commit()
                except Exception as db_exc:
                    logger.error(f"DB write error for event: {db_exc}")

        except DockerException as exc:
            logger.error(f"Docker connection lost: {exc}. Reconnecting in 10s…")
            await asyncio.sleep(10)
        except Exception as exc:
            logger.error(f"Event listener unexpected error: {exc}. Reconnecting in 10s…")
            await asyncio.sleep(10)
