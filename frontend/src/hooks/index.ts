import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchContainers,
  fetchContainer,
  fetchLogs,
  fetchStatsHistory,
  fetchContainerEvents,
  fetchUpdates,
  fetchSummary,
  fetchBackups,
  fetchBackupsForContainer,
  startContainer,
  stopContainer,
  restartContainer,
  updateContainer,
  rollbackContainer,
  fetchAllEvents,
  fetchAllSettings,
  fetchContainerSettings,
  patchContainerSettings,
  deleteContainerSettings,
  fetchGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  setGroupMembers,
} from "../api/client";
import { useAppStore } from "../store/useAppStore";
import type { ContainerSettings } from "../types";

export function useContainers() {
  return useQuery({
    queryKey: ["containers"],
    queryFn: fetchContainers,
    refetchInterval: 10_000,
  });
}

export function useContainer(id: string) {
  return useQuery({
    queryKey: ["container", id],
    queryFn: () => fetchContainer(id),
    refetchInterval: 10_000,
    enabled: !!id,
  });
}

export function useLogs(id: string, tail = 200) {
  return useQuery({
    queryKey: ["logs", id, tail],
    queryFn: () => fetchLogs(id, tail),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useStatsHistory(id: string, hours = 24) {
  return useQuery({
    queryKey: ["stats", id, hours],
    queryFn: () => fetchStatsHistory(id, hours),
    refetchInterval: 30_000,
    enabled: !!id,
  });
}

export function useContainerEvents(id: string) {
  return useQuery({
    queryKey: ["events", id],
    queryFn: () => fetchContainerEvents(id),
    refetchInterval: 15_000,
    enabled: !!id,
  });
}

export function useAllEvents() {
  return useQuery({
    queryKey: ["events-all"],
    queryFn: () => fetchAllEvents(500),
    refetchInterval: 15_000,
  });
}

export function useUpdates() {
  return useQuery({
    queryKey: ["updates"],
    queryFn: fetchUpdates,
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}

export function useSummary() {
  return useQuery({
    queryKey: ["summary"],
    queryFn: fetchSummary,
    refetchInterval: 10_000,
  });
}

export function useBackups() {
  return useQuery({
    queryKey: ["backups"],
    queryFn: fetchBackups,
    refetchInterval: 30_000,
  });
}

export function useContainerBackups(name: string) {
  return useQuery({
    queryKey: ["backups", name],
    queryFn: () => fetchBackupsForContainer(name),
    enabled: !!name,
    refetchInterval: 30_000,
  });
}

export function useContainerActions() {
  const qc = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["containers"] });
    qc.invalidateQueries({ queryKey: ["summary"] });
  };

  const start = useMutation({
    mutationFn: (id: string) => startContainer(id),
    onSuccess: () => { addToast("success", "Container started"); invalidate(); },
    onError: (e: Error) => addToast("error", e.message),
  });

  const stop = useMutation({
    mutationFn: (id: string) => stopContainer(id),
    onSuccess: () => { addToast("success", "Container stopped"); invalidate(); },
    onError: (e: Error) => addToast("error", e.message),
  });

  const restart = useMutation({
    mutationFn: (id: string) => restartContainer(id),
    onSuccess: () => { addToast("success", "Container restarted"); invalidate(); },
    onError: (e: Error) => addToast("error", e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, dry_run }: { id: string; dry_run?: boolean }) =>
      updateContainer(id, dry_run),
    onSuccess: (data) => {
      addToast(
        data.status === "success" ? "success" : "info",
        data.dry_run ? "Dry run complete" : "Container updated successfully"
      );
      invalidate();
      qc.invalidateQueries({ queryKey: ["updates"] });
      qc.invalidateQueries({ queryKey: ["backups"] });
    },
    onError: (e: Error) => addToast("error", e.message),
  });

  const rollback = useMutation({
    mutationFn: (id: string) => rollbackContainer(id),
    onSuccess: () => { addToast("success", "Rollback successful"); invalidate(); },
    onError: (e: Error) => addToast("error", e.message),
  });

  return { start, stop, restart, update, rollback };
}

export function useAllSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: fetchAllSettings,
  });
}

export function useContainerSettings(name: string) {
  return useQuery({
    queryKey: ["settings", name],
    queryFn: () => fetchContainerSettings(name),
    enabled: !!name,
  });
}

export function usePatchContainerSettings(name: string) {
  const qc = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  return useMutation({
    mutationFn: (patch: Partial<Pick<ContainerSettings, "protected" | "excluded">>) =>
      patchContainerSettings(name, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["settings", name] });
      qc.invalidateQueries({ queryKey: ["containers"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
    onError: (e: Error) => addToast("error", e.message),
  });
}

export function useDeleteContainerSettings() {
  const qc = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  return useMutation({
    mutationFn: (name: string) => deleteContainerSettings(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["containers"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
    onError: (e: Error) => addToast("error", e.message),
  });
}

export function useBulkActions() {
  const qc = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  const clearSelected = useAppStore((s) => s.clearSelected);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["containers"] });
    qc.invalidateQueries({ queryKey: ["summary"] });
  };

  const bulk = useMutation({
    mutationFn: async ({
      ids,
      action,
    }: {
      ids: string[];
      action: "start" | "stop" | "restart" | "update";
    }) => {
      const results: { id: string; ok: boolean; error?: string }[] = [];
      for (const id of ids) {
        try {
          if (action === "start") await startContainer(id);
          else if (action === "stop") await stopContainer(id);
          else if (action === "restart") await restartContainer(id);
          else if (action === "update") await updateContainer(id);
          results.push({ id, ok: true });
        } catch (e: any) {
          results.push({ id, ok: false, error: e?.message ?? "error" });
        }
      }
      return results;
    },
    onSuccess: (results, { action }) => {
      const ok = results.filter((r) => r.ok).length;
      const fail = results.filter((r) => !r.ok).length;
      if (fail === 0) addToast("success", `${action}: ${ok} container(s) done`);
      else addToast("info", `${action}: ${ok} ok, ${fail} failed`);
      clearSelected();
      invalidate();
      if (action === "update") qc.invalidateQueries({ queryKey: ["updates"] });
    },
    onError: (e: Error) => addToast("error", e.message),
  });

  return bulk;
}

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: fetchGroups,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string }) => createGroup(name, color),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
    onError: (e: Error) => addToast("error", e.message),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, name, color }: { id: number; name: string; color?: string }) =>
      updateGroup(id, name, color),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
    onError: (e: Error) => addToast("error", e.message),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  return useMutation({
    mutationFn: (id: number) => deleteGroup(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["containers"] });
    },
    onError: (e: Error) => addToast("error", e.message),
  });
}

export function useSetGroupMembers() {
  const qc = useQueryClient();
  const addToast = useAppStore((s) => s.addToast);
  return useMutation({
    mutationFn: ({ id, names }: { id: number; names: string[] }) => setGroupMembers(id, names),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["containers"] });
    },
    onError: (e: Error) => addToast("error", e.message),
  });
}
