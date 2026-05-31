"""
Recreate service — rebuilds a container from inspect JSON preserving ALL Unraid-relevant settings.
This is the most critical and security-sensitive piece of code in the project.

Preserves:
- Bind mounts and named volumes (never deleted)
- Environment variables
- Network mode and static IPs (bridge, host, macvlan, custom networks)
- Labels (including managed/protected)
- Restart policy
- Privileged / cap_add / cap_drop / devices
- user, working_dir, command, entrypoint
- Ports (only for bridge/bridge-like mode)
- SHM size, ulimits
"""

import logging
from typing import Optional

import docker
from docker.errors import APIError, NotFound
from fastapi import HTTPException

logger = logging.getLogger(__name__)


def _get_client() -> docker.DockerClient:
    return docker.from_env()


def _build_host_config(client: docker.DockerClient, inspect: dict) -> dict:
    """Build kwargs for client.containers.create from inspect data."""
    hc = inspect.get("HostConfig", {})
    config = inspect.get("Config", {})
    net_settings = inspect.get("NetworkSettings", {})

    kwargs: dict = {}

    # --- Image ---
    kwargs["image"] = config.get("Image", "")

    # --- Name ---
    name = inspect.get("Name", "").lstrip("/")
    kwargs["name"] = name

    # --- Hostname ---
    hostname = config.get("Hostname", "")
    if hostname and hostname != name[:12]:  # avoid Docker's default short-id hostname
        kwargs["hostname"] = hostname

    # --- Domainname ---
    if config.get("Domainname"):
        kwargs["domainname"] = config["Domainname"]

    # --- User ---
    if config.get("User"):
        kwargs["user"] = config["User"]

    # --- Command / Entrypoint ---
    if config.get("Cmd"):
        kwargs["command"] = config["Cmd"]
    if config.get("Entrypoint"):
        kwargs["entrypoint"] = config["Entrypoint"]

    # --- Working directory ---
    if config.get("WorkingDir"):
        kwargs["working_dir"] = config["WorkingDir"]

    # --- Environment ---
    if config.get("Env"):
        kwargs["environment"] = config["Env"]

    # --- Labels ---
    if config.get("Labels"):
        kwargs["labels"] = config["Labels"]

    # --- Exposed ports + port bindings ---
    network_mode = hc.get("NetworkMode", "bridge")
    if network_mode not in ("host", "none") and not network_mode.startswith("container:"):
        port_bindings = hc.get("PortBindings") or {}
        if port_bindings:
            kwargs["ports"] = port_bindings

    # --- Mounts (binds + volumes) ---
    binds = []
    for mount in inspect.get("Mounts", []):
        m_type = mount.get("Type", "bind")
        source = mount.get("Source", "")
        destination = mount.get("Destination", "")
        mode = mount.get("Mode", "rw")
        if not destination:
            continue
        if m_type in ("bind",):
            binds.append(f"{source}:{destination}:{mode}")
        elif m_type == "volume":
            vol_name = mount.get("Name", source)
            binds.append(f"{vol_name}:{destination}:{mode}")
        elif m_type == "tmpfs":
            pass  # handled separately below

    if binds:
        kwargs["volumes"] = binds

    # --- tmpfs ---
    tmpfs_list = hc.get("Tmpfs") or {}
    if tmpfs_list:
        kwargs["tmpfs"] = tmpfs_list

    # --- Network mode ---
    kwargs["network_mode"] = network_mode

    # --- Restart policy ---
    rp = hc.get("RestartPolicy", {})
    rp_name = rp.get("Name", "no")
    rp_max = rp.get("MaximumRetryCount", 0)
    if rp_name and rp_name != "no":
        kwargs["restart_policy"] = {"Name": rp_name, "MaximumRetryCount": rp_max}

    # --- Privileged ---
    if hc.get("Privileged"):
        kwargs["privileged"] = True

    # --- Cap add / drop ---
    if hc.get("CapAdd"):
        kwargs["cap_add"] = hc["CapAdd"]
    if hc.get("CapDrop"):
        kwargs["cap_drop"] = hc["CapDrop"]

    # --- Devices ---
    devices = hc.get("Devices") or []
    if devices:
        kwargs["devices"] = [
            f"{d['PathOnHost']}:{d['PathInContainer']}:{d.get('CgroupPermissions','rwm')}"
            for d in devices
        ]

    # --- SHM size ---
    if hc.get("ShmSize"):
        kwargs["shm_size"] = hc["ShmSize"]

    # --- Ulimits ---
    ulimits = hc.get("Ulimits") or []
    if ulimits:
        kwargs["ulimits"] = [
            docker.types.Ulimit(
                name=u["Name"],
                soft=u["Soft"],
                hard=u["Hard"],
            )
            for u in ulimits
        ]

    # --- PID mode ---
    if hc.get("PidMode"):
        kwargs["pid_mode"] = hc["PidMode"]

    # --- IPC mode ---
    if hc.get("IpcMode"):
        kwargs["ipc_mode"] = hc["IpcMode"]

    # --- Read-only rootfs ---
    if hc.get("ReadonlyRootfs"):
        kwargs["read_only"] = True

    # --- Extra hosts ---
    extra_hosts = hc.get("ExtraHosts") or []
    if extra_hosts:
        kwargs["extra_hosts"] = extra_hosts

    # --- DNS ---
    if hc.get("Dns"):
        kwargs["dns"] = hc["Dns"]
    if hc.get("DnsSearch"):
        kwargs["dns_search"] = hc["DnsSearch"]
    if hc.get("DnsOptions"):
        kwargs["dns_opt"] = hc["DnsOptions"]

    # --- Security options ---
    if hc.get("SecurityOpt"):
        kwargs["security_opt"] = hc["SecurityOpt"]

    # --- Logging driver ---
    log_config = hc.get("LogConfig", {})
    if log_config.get("Type"):
        kwargs["log_config"] = docker.types.LogConfig(
            type=log_config["Type"],
            config=log_config.get("Config") or {},
        )

    # --- CPU / memory limits ---
    if hc.get("Memory"):
        kwargs["mem_limit"] = hc["Memory"]
    if hc.get("MemoryReservation"):
        kwargs["mem_reservation"] = hc["MemoryReservation"]
    if hc.get("CpuShares"):
        kwargs["cpu_shares"] = hc["CpuShares"]
    if hc.get("CpuPeriod"):
        kwargs["cpu_period"] = hc["CpuPeriod"]
    if hc.get("CpuQuota"):
        kwargs["cpu_quota"] = hc["CpuQuota"]
    if hc.get("CpusetCpus"):
        kwargs["cpuset_cpus"] = hc["CpusetCpus"]
    if hc.get("CpusetMems"):
        kwargs["cpuset_mems"] = hc["CpusetMems"]

    return kwargs


def _get_network_endpoints(inspect: dict) -> dict:
    """Return {network_name: {aliases, ipv4_address, ...}} for custom networks."""
    net_settings = inspect.get("NetworkSettings", {})
    hc = inspect.get("HostConfig", {})
    network_mode = hc.get("NetworkMode", "bridge")
    endpoints = {}

    for net_name, net_data in (net_settings.get("Networks") or {}).items():
        if net_name in ("bridge", "host", "none"):
            continue
        endpoint_cfg = {}

        # Static IP (macvlan, custom networks with fixed IPs)
        ip = net_data.get("IPAMConfig", {})
        if ip and ip.get("IPv4Address"):
            endpoint_cfg["ipv4_address"] = ip["IPv4Address"]
        if ip and ip.get("IPv6Address"):
            endpoint_cfg["ipv6_address"] = ip["IPv6Address"]

        aliases = net_data.get("Aliases") or []
        # Filter out Docker-generated aliases (container ID prefix)
        clean_aliases = [a for a in aliases if len(a) > 4 and not _looks_like_id(a)]
        if clean_aliases:
            endpoint_cfg["aliases"] = clean_aliases

        endpoints[net_name] = endpoint_cfg

    return endpoints


def _looks_like_id(s: str) -> bool:
    return len(s) in (12, 64) and all(c in "0123456789abcdef" for c in s)


def recreate_container(inspect: dict, new_image: Optional[str] = None) -> str:
    """
    Stop, remove, and recreate a container from its inspect JSON.
    Returns the new container ID.

    This function does NOT pull images — caller must pull before calling.
    Volumes are NEVER deleted.
    """
    client = _get_client()
    name = inspect.get("Name", "").lstrip("/")
    container_id = inspect.get("Id", "")

    if not name:
        raise HTTPException(status_code=500, detail="Cannot recreate: container name missing in inspect.")

    # Override image if a new one was pulled
    if new_image:
        inspect = {**inspect, "Config": {**inspect.get("Config", {}), "Image": new_image}}

    kwargs = _build_host_config(client, inspect)
    network_endpoints = _get_network_endpoints(inspect)
    network_mode = kwargs.get("network_mode", "bridge")

    logger.info(f"Recreating container '{name}' (network_mode={network_mode})")

    # --- Stop and remove existing container ---
    try:
        existing = client.containers.get(container_id or name)
        if existing.status == "running":
            existing.stop(timeout=30)
        existing.remove(v=False)  # Never remove volumes
        logger.info(f"Removed old container '{name}'")
    except NotFound:
        logger.info(f"Container '{name}' was already removed")
    except APIError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to remove container '{name}': {exc}")

    # --- For custom networks: disconnect from all and handle manually ---
    # We create with the primary network then connect to additional networks
    primary_network = None
    additional_networks = {}

    if network_mode not in ("host", "none") and not network_mode.startswith("container:"):
        if network_endpoints:
            # For macvlan/custom: use first custom network as primary
            nets = list(network_endpoints.items())
            primary_name, primary_cfg = nets[0]
            primary_network = (primary_name, primary_cfg)
            additional_networks = dict(nets[1:])

            # Override network_mode to use the custom network directly
            kwargs["network"] = primary_name
            kwargs.pop("network_mode", None)

            # Apply ipv4_address if set
            if primary_cfg.get("ipv4_address"):
                # docker-py accepts networking_config for static IPs
                ipam_config = docker.types.IPAMConfig()
                networking_config = client.api.create_networking_config({
                    primary_name: client.api.create_endpoint_config(
                        ipv4_address=primary_cfg.get("ipv4_address"),
                        aliases=primary_cfg.get("aliases", []),
                    )
                })
                kwargs["networking_config"] = networking_config
                kwargs.pop("network", None)
                kwargs["network"] = primary_name

    # --- Create new container ---
    try:
        new_container = client.containers.create(**kwargs)
        logger.info(f"Created new container '{name}' id={new_container.short_id}")
    except APIError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create container '{name}': {exc}")

    # --- Connect to additional custom networks with static IPs ---
    for net_name, net_cfg in additional_networks.items():
        try:
            network = client.networks.get(net_name)
            connect_kwargs = {}
            if net_cfg.get("ipv4_address"):
                connect_kwargs["ipv4_address"] = net_cfg["ipv4_address"]
            if net_cfg.get("ipv6_address"):
                connect_kwargs["ipv6_address"] = net_cfg["ipv6_address"]
            if net_cfg.get("aliases"):
                connect_kwargs["aliases"] = net_cfg["aliases"]
            network.connect(new_container, **connect_kwargs)
            logger.info(f"Connected '{name}' to network '{net_name}'")
        except Exception as exc:
            logger.warning(f"Could not connect '{name}' to network '{net_name}': {exc}")

    return new_container.id
