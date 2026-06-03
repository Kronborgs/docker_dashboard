import axios from "axios";
import type {
  Container,
  ContainerDetail,
  StatsHistoryPoint,
  ContainerEvent,
  UpdateStatus,
  UpdateResult,
  Backup,
  Summary,
  ContainerSettings,
  ContainerGroup,
  AppConfig,
} from "../types";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// Containers
export const fetchContainers = (): Promise<Container[]> =>
  api.get<Container[]>("/containers").then((r) => r.data);

export const fetchContainer = (id: string): Promise<ContainerDetail> =>
  api.get<ContainerDetail>(`/containers/${id}`).then((r) => r.data);

export const fetchLogs = (id: string, tail = 200): Promise<string> =>
  api
    .get<{ logs: string }>(`/containers/${id}/logs`, { params: { tail } })
    .then((r) => r.data.logs);

export const fetchStatsHistory = (
  id: string,
  hours = 24
): Promise<StatsHistoryPoint[]> =>
  api
    .get<StatsHistoryPoint[]>(`/containers/${id}/stats/history`, {
      params: { hours },
    })
    .then((r) => r.data);

export const fetchContainerEvents = (
  id: string,
  limit = 100
): Promise<ContainerEvent[]> =>
  api
    .get<ContainerEvent[]>(`/containers/${id}/events`, { params: { limit } })
    .then((r) => r.data);

export const startContainer = (id: string) =>
  api.post(`/containers/${id}/start`).then((r) => r.data);

export const stopContainer = (id: string) =>
  api.post(`/containers/${id}/stop`).then((r) => r.data);

export const restartContainer = (id: string) =>
  api.post(`/containers/${id}/restart`).then((r) => r.data);

// Updates
export const fetchUpdates = (): Promise<UpdateStatus[]> =>
  api.get<UpdateStatus[]>("/updates").then((r) => r.data);

export const updateContainer = (
  id: string,
  dry_run = false
): Promise<UpdateResult> =>
  api
    .post<UpdateResult>(`/containers/${id}/update`, null, {
      params: { dry_run },
      timeout: 300_000, // 5 min — image pulls can be slow
    })
    .then((r) => r.data);

export const rollbackContainer = (id: string): Promise<UpdateResult> =>
  api.post<UpdateResult>(`/containers/${id}/rollback`, null, {
    timeout: 300_000,
  }).then((r) => r.data);

// Backups
export const fetchBackups = (): Promise<Backup[]> =>
  api.get<Backup[]>("/backups").then((r) => r.data);

export const fetchBackupsForContainer = (name: string): Promise<Backup[]> =>
  api.get<Backup[]>(`/backups/${name}`).then((r) => r.data);

// Summary
export const fetchSummary = (): Promise<Summary> =>
  api.get<Summary>("/summary").then((r) => r.data);

// All events
export const fetchAllEvents = (limit = 200): Promise<ContainerEvent[]> =>
  api
    .get<ContainerEvent[]>("/events", { params: { limit } })
    .then((r) => r.data);

// Settings
export const fetchAllSettings = (): Promise<ContainerSettings[]> =>
  api.get<ContainerSettings[]>("/settings").then((r) => r.data);

export const fetchContainerSettings = (name: string): Promise<ContainerSettings> =>
  api.get<ContainerSettings>(`/settings/${encodeURIComponent(name)}`).then((r) => r.data);

export const patchContainerSettings = (
  name: string,
  patch: Partial<Pick<ContainerSettings, "protected" | "excluded">>
): Promise<ContainerSettings> =>
  api.patch<ContainerSettings>(`/settings/${encodeURIComponent(name)}`, patch).then((r) => r.data);

export const deleteContainerSettings = (name: string): Promise<void> =>
  api.delete(`/settings/${encodeURIComponent(name)}`).then(() => undefined);

// Groups
export const fetchGroups = (): Promise<ContainerGroup[]> =>
  api.get<ContainerGroup[]>("/groups").then((r) => r.data);

export const createGroup = (name: string, color?: string): Promise<ContainerGroup> =>
  api.post<ContainerGroup>("/groups", { name, color }).then((r) => r.data);

export const updateGroup = (id: number, name: string, color?: string): Promise<ContainerGroup> =>
  api.patch<ContainerGroup>(`/groups/${id}`, { name, color }).then((r) => r.data);

export const deleteGroup = (id: number): Promise<void> =>
  api.delete(`/groups/${id}`).then(() => undefined);

export const setGroupMembers = (id: number, container_names: string[]): Promise<void> =>
  api.put(`/groups/${id}/members`, { container_names }).then(() => undefined);

// App config (data retention, etc.)
export const fetchAppConfig = (): Promise<AppConfig> =>
  api.get<AppConfig>("/settings/config/app").then((r) => r.data);

export const patchAppConfig = (patch: Partial<AppConfig>): Promise<AppConfig> =>
  api.patch<AppConfig>("/settings/config/app", patch).then((r) => r.data);
