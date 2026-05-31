export interface NetworkInfo {
  network_name: string;
  ip: string;
  mac: string;
}

export interface Container {
  id: string;
  short_id: string;
  name: string;
  status: "running" | "exited" | "paused" | "restarting" | "dead" | "created" | string;
  health: "healthy" | "unhealthy" | "starting" | "none" | string;
  image: string;
  image_tag: string;
  image_id: string;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  uptime_seconds: number | null;
  networks: NetworkInfo[];
  ports: Record<string, unknown>;
  labels: Record<string, string>;
  managed: boolean;
  protected: boolean;
  cpu_percent: number;
  mem_usage_mb: number;
  mem_limit_mb: number;
  mem_percent: number;
  net_rx_bytes: number;
  net_tx_bytes: number;
  restart_policy: string;
  command: string | null;
  hostname: string;
  group_id: number | null;
}

export interface ContainerDetail extends Container {
  inspect_raw: Record<string, unknown>;
  env_vars: string[];
  mounts: Array<{
    Type: string;
    Source: string;
    Destination: string;
    Mode: string;
    RW: boolean;
  }>;
  devices: string[];
  cap_add: string[];
  privileged: boolean;
  user: string;
  working_dir: string;
  entrypoint: string[] | string | null;
  network_mode: string;
}

export interface StatsHistoryPoint {
  recorded_at: string;
  cpu_percent: number;
  mem_usage_mb: number;
  mem_percent: number;
  net_rx_bytes: number;
  net_tx_bytes: number;
  block_read_bytes: number;
  block_write_bytes: number;
  pids: number;
}

export interface ContainerEvent {
  id: number;
  container_id: string;
  container_name: string;
  event_type: string;
  status: string | null;
  message: string | null;
  has_inspect: boolean;
  created_at: string;
}

export interface UpdateStatus {
  container_id: string;
  container_name: string;
  image: string;
  status: "up_to_date" | "update_available" | "unknown" | "error";
  local_digest: string | null;
  remote_digest: string | null;
  message: string | null;
}

export interface UpdateResult {
  container_id: string;
  container_name: string;
  dry_run: boolean;
  status: string;
  steps: string[];
  message: string | null;
}

export interface Backup {
  id: number;
  container_id: string;
  container_name: string;
  file_path: string | null;
  trigger: string;
  created_at: string;
}

export interface Summary {
  total: number;
  running: number;
  stopped: number;
  excluded: number;
  protected: number;
  updates_available: number;
  paused: number;
  unhealthy: number;
}

export type FilterType =
  | "all"
  | "running"
  | "stopped"
  | "protected"
  | "updates_available";

export interface ContainerSettings {
  container_name: string;
  protected: boolean | null;
  excluded: boolean | null;
  group_id: number | null;
}

export interface ContainerGroup {
  id: number;
  name: string;
  color: string | null;
}

export type SortField =
  | "name"
  | "cpu_percent"
  | "mem_percent"
  | "net_rx_bytes"
  | "net_tx_bytes"
  | "uptime_seconds"
  | "status";

export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}
