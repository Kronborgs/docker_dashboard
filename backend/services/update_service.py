"""
Update service — checks remote registry digests vs local image digests.
Supports: docker.io, ghcr.io, lscr.io, custom private registries.
"""

import logging
import re
from typing import Optional

import httpx

from config import settings

logger = logging.getLogger(__name__)

# Timeout for registry API calls
_TIMEOUT = 15.0


def _parse_image_ref(image_ref: str) -> tuple[str, str, str]:
    """
    Parse image reference into (registry, repository, tag).
    Examples:
      nginx:latest           → (docker.io, library/nginx, latest)
      linuxserver/sonarr     → (docker.io, linuxserver/sonarr, latest)
      ghcr.io/org/img:1.2    → (ghcr.io, org/img, 1.2)
      lscr.io/linuxserver/x  → (lscr.io, linuxserver/x, latest)
      registry.example.com/x:tag → (registry.example.com, x, tag)
    """
    tag = "latest"
    if ":" in image_ref.split("/")[-1]:
        image_ref, tag = image_ref.rsplit(":", 1)

    known_registries = {"docker.io", "ghcr.io", "lscr.io", "registry.hub.docker.com"}
    parts = image_ref.split("/")

    if settings.private_registry_url and image_ref.startswith(settings.private_registry_url.rstrip("/")):
        registry = settings.private_registry_url.rstrip("/")
        repo = image_ref[len(registry):].lstrip("/")
        return registry, repo, tag

    # Detect registry by first part
    if "." in parts[0] or ":" in parts[0]:
        registry = parts[0]
        repo = "/".join(parts[1:])
    else:
        registry = "docker.io"
        repo = "/".join(parts)
        if "/" not in repo:
            repo = f"library/{repo}"

    return registry, repo, tag


async def _get_dockerhub_token(repo: str) -> str:
    url = f"https://auth.docker.io/token?service=registry.docker.io&scope=repository:{repo}:pull"
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json()["token"]


async def _get_ghcr_token(repo: str) -> Optional[str]:
    # Try anonymous token
    url = f"https://ghcr.io/token?scope=repository:{repo}:pull"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(url)
            if r.status_code == 200:
                return r.json().get("token")
    except Exception:
        pass
    return None


async def _fetch_manifest_digest(registry: str, repo: str, tag: str) -> Optional[str]:
    """Return the manifest digest (@sha256:...) from the registry."""
    headers = {
        "Accept": "application/vnd.docker.distribution.manifest.v2+json,"
                  "application/vnd.docker.distribution.manifest.list.v2+json,"
                  "application/vnd.oci.image.manifest.v1+json,"
                  "application/vnd.oci.image.index.v1+json",
    }

    # --- Auth ---
    if registry == "docker.io":
        try:
            token = await _get_dockerhub_token(repo)
            headers["Authorization"] = f"Bearer {token}"
        except Exception as exc:
            logger.warning(f"Docker Hub auth failed for {repo}: {exc}")
            return None
        base_url = "https://registry-1.docker.io"

    elif registry == "ghcr.io":
        token = await _get_ghcr_token(repo)
        if token:
            headers["Authorization"] = f"Bearer {token}"
        base_url = "https://ghcr.io"

    elif registry == "lscr.io":
        # lscr.io uses same auth as docker.io for its own service
        try:
            url = f"https://lscr.io/token?service=lscr.io&scope=repository:{repo}:pull"
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                r = await client.get(url)
                if r.status_code == 200:
                    headers["Authorization"] = f"Bearer {r.json().get('token','')}"
        except Exception:
            pass
        base_url = "https://lscr.io"

    elif settings.private_registry_url and registry == settings.private_registry_url.rstrip("/"):
        if settings.private_registry_token:
            headers["Authorization"] = f"Bearer {settings.private_registry_token}"
        base_url = f"https://{registry}" if not registry.startswith("http") else registry

    else:
        # Generic registry — try unauthenticated
        base_url = f"https://{registry}" if not registry.startswith("http") else registry

    manifest_url = f"{base_url}/v2/{repo}/manifests/{tag}"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
            r = await client.head(manifest_url, headers=headers)
            if r.status_code == 200:
                digest = r.headers.get("Docker-Content-Digest")
                if digest:
                    return digest
            elif r.status_code == 401:
                logger.warning(f"Registry {registry}: 401 for {repo}:{tag}")
            else:
                logger.debug(f"Registry {registry}: {r.status_code} for {repo}:{tag}")
    except Exception as exc:
        logger.warning(f"Registry request failed for {registry}/{repo}:{tag}: {exc}")

    return None


def _get_local_digest(inspect: dict, image_ref: str) -> Optional[str]:
    """Extract the local RepoDigest matching the image reference."""
    repo_digests = (
        inspect.get("ContainerConfig", {})
        or {}
    )
    # Try from image info — will be passed as part of container inspect's image attrs
    # The caller should pass the full image inspect if available, but we try what we have.
    image_id = inspect.get("Image", "")

    # container.image.attrs.RepoDigests
    # We look at the inspect of the image referenced by this container
    return None  # Will be resolved in the router using docker SDK


async def check_update_for_image(image_ref: str, repo_digests: list[str]) -> dict:
    """
    Returns a dict: {status, local_digest, remote_digest, message}
    status: up_to_date | update_available | unknown | error
    """
    try:
        registry, repo, tag = _parse_image_ref(image_ref)
    except Exception as exc:
        return {"status": "error", "local_digest": None, "remote_digest": None, "message": str(exc)}

    # Find local digest matching this repo
    local_digest = None
    for rd in repo_digests:
        # rd is like "nginx@sha256:abc..." or "docker.io/library/nginx@sha256:abc..."
        if "@" in rd:
            local_digest = rd.split("@", 1)[1]
            break

    remote_digest = await _fetch_manifest_digest(registry, repo, tag)

    if remote_digest is None:
        return {
            "status": "unknown",
            "local_digest": local_digest,
            "remote_digest": None,
            "message": "Could not fetch remote digest",
        }

    if local_digest is None:
        return {
            "status": "unknown",
            "local_digest": None,
            "remote_digest": remote_digest,
            "message": "No local digest available for comparison",
        }

    if local_digest == remote_digest:
        return {
            "status": "up_to_date",
            "local_digest": local_digest,
            "remote_digest": remote_digest,
            "message": None,
        }

    return {
        "status": "update_available",
        "local_digest": local_digest,
        "remote_digest": remote_digest,
        "message": None,
    }
