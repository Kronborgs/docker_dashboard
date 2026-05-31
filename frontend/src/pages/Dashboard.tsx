import { useMemo, useState } from "react";
import { useContainers, useSummary, useUpdates, useBulkActions, useGroups } from "../hooks";
import { useAppStore } from "../store/useAppStore";
import { ContainerTable } from "../components/containers/ContainerTable";
import { Badge } from "../components/ui/Badge";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import {
  Activity, Box, Shield, ArrowUpCircle,
  AlertCircle, Search, EyeOff, Play, Square, RotateCcw, X
} from "lucide-react";
import { clsx } from "clsx";
import type { Container, FilterType } from "../types";

const actionLabels = { start: "Start", stop: "Stop", restart: "Restart", update: "Update" } as const;

function BulkConfirmModal({ action, count, loading, onConfirm, onCancel }: {
  action: keyof typeof actionLabels;
  count: number;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmModal
      open
      title={`${actionLabels[action]} ${count} container(s)?`}
      description={`This will ${action} all ${count} selected containers in sequence.${action === "update" ? " Protected containers will be skipped." : ""}`}
      confirmLabel={actionLabels[action]}
      variant={["stop", "update"].includes(action) ? "danger" : "primary"}
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

const filters: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "stopped", label: "Stopped" },
  { value: "unhealthy", label: "Unhealthy" },
  { value: "protected", label: "Protected" },
  { value: "updates_available", label: "Updates" },
];

interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  active?: boolean;
}

function SummaryCard({ label, value, icon, color, onClick, active }: SummaryCardProps) {
  return (
    <div
      className={clsx(
        "bg-slate-800 border rounded-xl p-4 flex items-center gap-4 transition-colors",
        onClick ? "cursor-pointer hover:bg-slate-700" : "",
        active ? "border-blue-500" : "border-slate-700/60"
      )}
      onClick={onClick}
    >
      <div className={clsx("p-2.5 rounded-lg", color)}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: containers = [], isLoading } = useContainers();
  const { data: summary } = useSummary();
  const { data: updates = [] } = useUpdates();
  const { data: groups = [] } = useGroups();
  const { filter, search, sortField, sortAsc, setFilter, setSearch, setSort, selectedIds, clearSelected } = useAppStore();
  const bulkActions = useBulkActions();
  const [bulkConfirm, setBulkConfirm] = useState<"start" | "stop" | "restart" | "update" | null>(null);

  const updateMap = useMemo(
    () => Object.fromEntries(updates.map((u) => [u.container_id, u])),
    [updates]
  );

  const filtered = useMemo(() => {
    let list: Container[] = [...containers];

    // Filter
    if (filter === "running") list = list.filter((c) => c.status === "running");
    else if (filter === "stopped") list = list.filter((c) => c.status !== "running");
    else if (filter === "unhealthy") list = list.filter((c) => c.health === "unhealthy" && c.status === "running");
    else if (filter === "protected") list = list.filter((c) => c.protected);
    else if (filter === "updates_available")
      list = list.filter((c) => updateMap[c.id]?.status === "update_available");

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => {
        const name = c.name.toLowerCase();
        const image = (c.image + ":" + c.image_tag).toLowerCase();
        const ips = c.networks.map((n) => n.ip).join(" ").toLowerCase();
        return name.includes(q) || image.includes(q) || ips.includes(q);
      });
    }

    // Sort
    list.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      if (sortField === "name") { av = a.name; bv = b.name; }
      else if (sortField === "cpu_percent") { av = a.cpu_percent; bv = b.cpu_percent; }
      else if (sortField === "mem_percent") { av = a.mem_percent; bv = b.mem_percent; }
      else if (sortField === "net_rx_bytes") { av = a.net_rx_bytes; bv = b.net_rx_bytes; }
      else if (sortField === "net_tx_bytes") { av = a.net_tx_bytes; bv = b.net_tx_bytes; }
      else if (sortField === "uptime_seconds") { av = a.uptime_seconds ?? 0; bv = b.uptime_seconds ?? 0; }
      else if (sortField === "status") { av = a.status; bv = b.status; }

      if (typeof av === "string") {
        return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      }
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    return list;
  }, [containers, filter, search, sortField, sortAsc, updateMap]);

  const updatesAvailable = updates.filter((u) => u.status === "update_available").length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <SummaryCard
          label="Total"
          value={summary?.total ?? containers.length}
          icon={<Box className="h-4 w-4 text-slate-300" />}
          color="bg-slate-700"
        />
        <SummaryCard
          label="Running"
          value={summary?.running ?? 0}
          icon={<Activity className="h-4 w-4 text-green-400" />}
          color="bg-green-900/40"
        />
        <SummaryCard
          label="Stopped"
          value={summary?.stopped ?? 0}
          icon={<Box className="h-4 w-4 text-slate-400" />}
          color="bg-slate-700"
        />
        <SummaryCard
          label="Excluded"
          value={summary?.excluded ?? 0}
          icon={<EyeOff className="h-4 w-4 text-slate-400" />}
          color="bg-slate-700"
        />
        <SummaryCard
          label="Protected"
          value={summary?.protected ?? 0}
          icon={<Shield className="h-4 w-4 text-amber-400" />}
          color="bg-amber-900/40"
        />
        <SummaryCard
          label="Updates"
          value={updatesAvailable}
          icon={<ArrowUpCircle className="h-4 w-4 text-emerald-400" />}
          color="bg-emerald-900/40"
        />
        <SummaryCard
          label="Unhealthy"
          value={summary?.unhealthy ?? 0}
          icon={<AlertCircle className="h-4 w-4 text-red-400" />}
          color="bg-red-900/40"
          onClick={() => setFilter(filter === "unhealthy" ? "all" : "unhealthy")}
          active={filter === "unhealthy"}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5 flex-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filter === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              )}
            >
              {f.label}
              {f.value === "updates_available" && updatesAvailable > 0 && (
                <span className="ml-1.5 bg-green-600 text-white rounded-full px-1.5 py-0.5 text-[10px]">
                  {updatesAvailable}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search name, IP, image…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm text-slate-300 placeholder-slate-600 rounded-lg pl-8 pr-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-900/30 border border-blue-700/50 rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-blue-300">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={() => setBulkConfirm("start")}
              disabled={bulkActions.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-800/50 text-green-300 hover:bg-green-700/60 transition-colors disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" /> Start
            </button>
            <button
              onClick={() => setBulkConfirm("stop")}
              disabled={bulkActions.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-900/40 text-red-300 hover:bg-red-800/50 transition-colors disabled:opacity-50"
            >
              <Square className="h-3.5 w-3.5" /> Stop
            </button>
            <button
              onClick={() => setBulkConfirm("restart")}
              disabled={bulkActions.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-800/40 text-blue-300 hover:bg-blue-700/50 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restart
            </button>
            <button
              onClick={() => setBulkConfirm("update")}
              disabled={bulkActions.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/50 transition-colors disabled:opacity-50"
            >
              <ArrowUpCircle className="h-3.5 w-3.5" /> Update
            </button>
          </div>
          <button onClick={clearSelected} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-slate-500">
          <span className="animate-pulse">Loading containers…</span>
        </div>
      ) : (
        <ContainerTable containers={filtered} updateStatuses={updates} groups={groups} />
      )}

      {/* Bulk confirm */}
      {bulkConfirm && (
        <BulkConfirmModal
          action={bulkConfirm}
          count={selectedIds.size}
          loading={bulkActions.isPending}
          onConfirm={() => {
            bulkActions.mutate({ ids: Array.from(selectedIds), action: bulkConfirm });
            setBulkConfirm(null);
          }}
          onCancel={() => setBulkConfirm(null)}
        />
      )}
    </div>
  );
}
