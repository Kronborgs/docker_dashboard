import { clsx } from "clsx";
import type { Container, UpdateStatus } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import {
  Play, Square, RotateCcw, FileText, ArrowUpCircle,
  RotateCw, Shield, CheckCircle2, XCircle, Minus, EyeOff
} from "lucide-react";
import { useState } from "react";
import { ConfirmModal } from "../ui/ConfirmModal";
import { LogsModal } from "../modals/LogsModal";
import { UpdateResultModal } from "../modals/UpdateResultModal";
import { useContainerActions, useContainerSettings, usePatchContainerSettings } from "../../hooks";
import type { UpdateResult } from "../../types";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { useLang } from "../../i18n/translations";

interface ContainerRowProps {
  container: Container;
  updateStatus?: UpdateStatus;
}

function fmt(bytes: number) {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)}G`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)}M`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}K`;
  return `${bytes}B`;
}

function fmtUptime(s: number | null) {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "bg-green-400",
    exited: "bg-slate-500",
    dead: "bg-red-500",
    paused: "bg-yellow-500",
    restarting: "bg-blue-400 animate-pulse",
    created: "bg-slate-600",
  };
  return (
    <span className={clsx("inline-block w-2 h-2 rounded-full", colors[status] ?? "bg-slate-600")} />
  );
}

function HealthIcon({ health, status }: { health: string; status: string }) {
  if (status !== "running") return null; // stale health from stopped containers
  if (health === "healthy") return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />;
  if (health === "unhealthy") return <XCircle className="h-3.5 w-3.5 text-red-400" />;
  if (health === "starting") return <Minus className="h-3.5 w-3.5 text-yellow-400" />;
  return null;
}

function statusLabel(status: string, t: ReturnType<typeof useLang>["t"]): string {
  if (status === "exited") return t.status_offline;
  if (status === "dead") return t.status_powered_off;
  if (status === "created") return t.status_created;
  if (status === "paused") return t.status_paused;
  if (status === "restarting") return t.status_restarting;
  if (status === "running") return t.status_running;
  return status;
}

type ActionType = "start" | "stop" | "restart" | "update" | "rollback";

export function ContainerRow({ container, updateStatus }: ContainerRowProps) {
  const navigate = useNavigate();
  const actions = useContainerActions();
  const [confirm, setConfirm] = useState<ActionType | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);
  const { selectedIds, toggleSelected } = useAppStore();
  const { data: dbSettings } = useContainerSettings(container.name);
  const patch = usePatchContainerSettings(container.name);
  const isSelected = selectedIds.has(container.id);
  const { t } = useLang();

  const actionLabel: Record<ActionType, string> = {
    start: t.action_start,
    stop: t.action_stop,
    restart: t.action_restart,
    update: t.action_update,
    rollback: t.action_rollback,
  };

  const isPending =
    actions.start.isPending ||
    actions.stop.isPending ||
    actions.restart.isPending ||
    actions.update.isPending ||
    actions.rollback.isPending;

  const hasUpdate = updateStatus?.status === "update_available";
  const canAct = !container.protected;

  function handleConfirm() {
    if (!confirm) return;
    const id = container.id;

    if (confirm === "start") actions.start.mutate(id);
    else if (confirm === "stop") actions.stop.mutate(id);
    else if (confirm === "restart") actions.restart.mutate(id);
    else if (confirm === "update") {
      actions.update.mutate({ id }, {
        onSuccess: (data) => setUpdateResult(data),
      });
    }
    else if (confirm === "rollback") {
      actions.rollback.mutate(id, {
        onSuccess: (data) => setUpdateResult(data),
      });
    }
    setConfirm(null);
  }

  const primaryNet = container.networks[0];

  return (
    <>
      <tr
        className={clsx(
          "border-b border-slate-800 hover:bg-slate-800/40 transition-colors cursor-pointer",
          isSelected && "bg-blue-900/20"
        )}
        onClick={() => navigate(`/container/${container.id}`)}
      >
        {/* Checkbox */}
        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelected(container.id)}
            className="rounded border-slate-600 bg-slate-700 text-blue-600 cursor-pointer"
          />
        </td>
        {/* Name + badges */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <StatusDot status={container.status} />
            <span className="font-medium text-slate-200 truncate max-w-[160px]">
              {container.name.replace(/^\//, "")}
            </span>
            <HealthIcon health={container.health} status={container.status} />
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {container.protected && (
              <Badge color="amber" size="xs">
                <Shield className="h-2.5 w-2.5" /> {t.settings_badge_protected}
              </Badge>
            )}
            {hasUpdate && (
              <Badge color="green" size="xs">
                <ArrowUpCircle className="h-2.5 w-2.5" /> {t.action_update}
              </Badge>
            )}
          </div>
        </td>

        {/* Status */}
        <td className="px-4 py-3 text-sm text-slate-400">{statusLabel(container.status, t)}</td>

        {/* Image */}
        <td className="px-4 py-3">
          <span className="text-xs text-slate-400 font-mono truncate block max-w-[160px]">
            {container.image}
          </span>
          <span className="text-xs text-slate-600">{container.image_tag}</span>
        </td>

        {/* CPU */}
        <td className="px-4 py-3 text-sm text-right font-mono text-slate-300">
          {container.cpu_percent.toFixed(1)}%
        </td>

        {/* RAM */}
        <td className="px-4 py-3 text-sm text-right font-mono text-slate-300">
          {container.mem_usage_mb > 0
            ? `${container.mem_usage_mb.toFixed(0)}M`
            : "—"}
        </td>

        {/* Network */}
        <td className="px-4 py-3 text-xs font-mono text-slate-400">
          {primaryNet ? (
            <>
              <div className="text-slate-300">{primaryNet.ip || "—"}</div>
              <div className="text-slate-600 truncate max-w-[130px]">{primaryNet.network_name}</div>
              {primaryNet.mac && (
                <div className="text-slate-600 text-[10px]">{primaryNet.mac}</div>
              )}
            </>
          ) : "—"}
        </td>

        {/* RX/TX */}
        <td className="px-4 py-3 text-xs font-mono text-slate-400">
          <div className="text-emerald-400">{fmt(container.net_rx_bytes)} ↓</div>
          <div className="text-amber-400">{fmt(container.net_tx_bytes)} ↑</div>
        </td>

        {/* Uptime */}
        <td className="px-4 py-3 text-sm text-slate-400 font-mono">
          {fmtUptime(container.uptime_seconds)}
        </td>

        {/* Actions */}
        <td
          className="px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              title={t.detail_logs}
              onClick={() => setShowLogs(true)}
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>

            {container.protected && (
              <span
                className="inline-flex items-center gap-1 text-xs text-amber-700 px-1.5 py-1 select-none"
                title={t.detail_protected_msg}
              >
                <Shield className="h-3 w-3" />
              </span>
            )}

            {canAct && (
              <>
                {container.status !== "running" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    title={t.action_start}
                    loading={actions.start.isPending}
                    onClick={() => setConfirm("start")}
                  >
                    <Play className="h-3.5 w-3.5 text-green-400" />
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      title={t.action_stop}
                      loading={actions.stop.isPending}
                      onClick={() => setConfirm("stop")}
                    >
                      <Square className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title={t.action_restart}
                      loading={actions.restart.isPending}
                      onClick={() => setConfirm("restart")}
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-blue-400" />
                    </Button>
                  </>
                )}
                {hasUpdate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    title={t.action_update}
                    loading={actions.update.isPending}
                    onClick={() => setConfirm("update")}
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5 text-green-400" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  title={t.action_rollback}
                  loading={actions.rollback.isPending}
                  onClick={() => setConfirm("rollback")}
                >
                  <RotateCw className="h-3.5 w-3.5 text-violet-400" />
                </Button>
              </>
            )}
          </div>
        </td>

        {/* Protected toggle */}
        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
          <button
            disabled={patch.isPending}
            onClick={() => patch.mutate({ protected: !container.protected })}
            title={container.protected ? t.toggle_unprotect : t.toggle_protect}
            className={clsx(
              "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
              container.protected ? "bg-amber-500" : "bg-slate-600",
              patch.isPending && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className={clsx("inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200", container.protected ? "translate-x-4" : "translate-x-0")} />
          </button>
        </td>

        {/* Excluded toggle */}
        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
          <button
            disabled={patch.isPending}
            onClick={() => patch.mutate({ excluded: !(dbSettings?.excluded ?? false) })}
            title={(dbSettings?.excluded ?? false) ? t.settings_reinclude : t.toggle_exclude}
            className={clsx(
              "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
              (dbSettings?.excluded ?? false) ? "bg-red-500" : "bg-slate-600",
              patch.isPending && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className={clsx("inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200", (dbSettings?.excluded ?? false) ? "translate-x-4" : "translate-x-0")} />
          </button>
        </td>
      </tr>

      {/* Logs Modal */}
      {showLogs && (
        <LogsModal
          containerId={container.id}
          containerName={container.name}
          onClose={() => setShowLogs(false)}
        />
      )}

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          open
          title={t.detail_confirm_title(actionLabel[confirm])}
          description={t.detail_confirm_desc(actionLabel[confirm], container.name.replace(/^\//, ""))}
          confirmLabel={actionLabel[confirm]}
          variant={["stop", "update", "rollback"].includes(confirm) ? "danger" : "primary"}
          loading={isPending}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Update result modal */}
      <UpdateResultModal
        result={updateResult}
        onClose={() => setUpdateResult(null)}
      />
    </>
  );
}
