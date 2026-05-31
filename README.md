# Docker Dashboard

A self-hosted Docker management dashboard designed for Unraid — built with FastAPI + React + SQLite.

## Features

- **Read-only by default** — only containers with labels can be controlled
- **Label-based security** — managed/protected labels control access
- **Historical data** — all events + stats stored in SQLite from day one
- **Update checker** — compares local and remote image digests
- **Backup/rollback** — inspect JSON saved before every update
- **Multi-registry** — Docker Hub, ghcr.io, lscr.io, private registries
- **Dark mode UI** — container table, charts, logs, events timeline

---

## Security Model

> **IMPORTANT:** This dashboard has write access to the Docker socket. Read this section before deploying.

### Docker Socket Risk

The Docker socket (`/var/run/docker.sock`) gives full control over all containers on the host. Anyone with access to the dashboard URL can potentially control containers.

**Mitigations built into this dashboard:**
- Write operations are restricted to containers with `com.kronborg.dashboard.managed=true`
- Protected containers (`com.kronborg.dashboard.protected=true`) can never be stopped, restarted, or updated
- Volumes and bind mounts are never deleted — ever
- Images are never automatically deleted

**You must also:**
- **Only expose on your internal network** — do NOT put this behind a public reverse proxy without authentication
- **Do not use a public-facing port** — Unraid's Docker networking keeps this on your LAN by default
- **Consider adding Basic Auth** via the `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` environment variables (v2 feature — currently logged in warning only, implement nginx/Caddy auth in front for now)
- **Use a dedicated network** for the dashboard if possible

---

## Deployment on Unraid

### Using docker-compose

```bash
cd /mnt/user/appdata/docker-dashboard
docker-compose up -d
```

### Using Unraid Docker UI

Add a new container with these settings:

| Setting | Value |
|---------|-------|
| Repository | `docker-dashboard:latest` (or build locally) |
| Port | `8088:8088` |
| Volume 1 | `/var/run/docker.sock` → `/var/run/docker.sock` |
| Volume 2 | `/mnt/user/appdata/docker-dashboard` → `/config` |

---

## Adding Labels to Containers

### In Unraid Docker Template (Extra Parameters)

To make a container **manageable** (allow start/stop/restart/update):
```
--label com.kronborg.dashboard.managed=true
```

To make a container **protected** (visible but never modifiable):
```
--label com.kronborg.dashboard.protected=true
```

Both labels can be combined — protected takes precedence:
```
--label com.kronborg.dashboard.managed=true --label com.kronborg.dashboard.protected=true
```

### In docker-compose.yml

```yaml
services:
  my-app:
    image: someimage:latest
    labels:
      - "com.kronborg.dashboard.managed=true"
      # - "com.kronborg.dashboard.protected=true"
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STATS_INTERVAL_SECONDS` | `30` | How often to collect CPU/RAM/net stats |
| `PRIVATE_REGISTRY_URL` | `` | Hostname of your private registry |
| `PRIVATE_REGISTRY_TOKEN` | `` | Bearer token for private registry |
| `DASHBOARD_USERNAME` | `` | Username for Basic Auth (not yet enforced in API) |
| `DASHBOARD_PASSWORD` | `` | Password for Basic Auth |

---

## Data Storage

All data is stored in `/config/dashboard.db` (SQLite):

- `container_events` — all Docker lifecycle events with full inspect JSON
- `container_stats` — CPU/RAM/network snapshots every 30 seconds (kept forever)
- `update_history` — record of all update attempts
- `backups` — backup metadata + inline inspect JSON

Backup files (JSON) are stored at `/config/backups/<container-name>-<timestamp>.json`.

**No data is ever automatically deleted.** The SQLite file will grow over time.

---

## Supported Registries

| Registry | Auth method |
|----------|-------------|
| `docker.io` | Token via auth.docker.io |
| `ghcr.io` | Anonymous token |
| `lscr.io` | Token via lscr.io/token |
| Private | `PRIVATE_REGISTRY_TOKEN` env var |

---

## API Reference

```
GET  /api/containers                    List all containers with live stats
GET  /api/containers/{id}               Container detail + inspect
GET  /api/containers/{id}/logs          Logs (tail=200)
GET  /api/containers/{id}/stats/history Historical stats (hours=24)
GET  /api/containers/{id}/events        Lifecycle events
POST /api/containers/{id}/start         Start (managed only)
POST /api/containers/{id}/stop          Stop (managed, non-protected only)
POST /api/containers/{id}/restart       Restart (managed, non-protected only)
GET  /api/updates                       Check all managed containers for updates
POST /api/containers/{id}/update        Update container (dry_run=true for preview)
POST /api/containers/{id}/rollback      Rollback to latest backup
GET  /api/backups                       List all backups
GET  /api/backups/{container_name}      Backups for specific container
GET  /api/summary                       Dashboard summary counts
GET  /api/events                        All events across all containers
```

---

## Building Locally

```bash
# Build and start
docker-compose up --build -d

# View logs
docker-compose logs -f docker-dashboard

# Open dashboard
open http://localhost:8088
```

---

## Unraid Config Preservation

When updating or rolling back, the dashboard preserves **all** container settings:

- ✅ Bind mounts and named volumes (never deleted)
- ✅ Environment variables
- ✅ Network mode (bridge, host, macvlan, custom)
- ✅ Static IP addresses on custom networks
- ✅ Labels (including managed/protected)
- ✅ Restart policy
- ✅ Privileged mode, cap_add, cap_drop, devices
- ✅ User, working_dir, command, entrypoint
- ✅ Port bindings
- ✅ Macvlan network settings and fixed IPs
- ✅ DNS, extra_hosts, security_opt
- ✅ Memory and CPU limits
- ✅ Log driver configuration

---

## Roadmap (v2)

- [ ] Auto-update schedule (cron-based Watchtower alternative)
- [ ] HTTP Basic Auth middleware
- [ ] Email/webhook notifications on updates
- [ ] Multi-host support
- [ ] Stats retention policy configuration
- [ ] Image cleanup (manual, with confirmation)
