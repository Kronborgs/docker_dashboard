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
    })
    .then((r) => r.data);

export const rollbackContainer = (id: string): Promise<UpdateResult> =>
  api.post<UpdateResult>(`/containers/${id}/rollback`).then((r) => r.data);

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
