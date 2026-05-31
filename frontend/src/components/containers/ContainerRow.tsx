import { clsx } from "clsx";
import type { Container, UpdateStatus } from "../../types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import {
  Play, Square, RotateCcw, FileText, ArrowUpCircle,
  RotateCw, Shield, CheckCircle2, XCircle, Minus
} from "lucide-react";
import { useState } from "react";
import { ConfirmModal } from "../ui/ConfirmModal";
import { LogsModal } from "../modals/LogsModal";
import { UpdateResultModal } from "../modals/UpdateResultModal";
import { useContainerActions } from "../../hooks";
import type { UpdateResult } from "../../types";
import { useNavigate } from "react-router-dom";

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

function HealthIcon({ health }: { health: string }) {
  if (health === "healthy") return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />;
  if (health === "unhealthy") return <XCircle className="h-3.5 w-3.5 text-red-400" />;
  if (health === "starting") return <Minus className="h-3.5 w-3.5 text-yellow-400" />;
  return null;
}

type ActionType = "start" | "stop" | "restart" | "update" | "rollback";

const actionLabels: Record<ActionType, string> = {
  start: "Start",
  stop: "Stop",
  restart: "Restart",
  update: "Update",
  rollback: "Rollback",
};

export function ContainerRow({ container, updateStatus }: ContainerRowProps) {
  const navigate = useNavigate();
  const actions = useContainerActions();
  const [confirm, setConfirm] = useState<ActionType | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);

  const isPending =
    actions.start.isPending ||
    actions.stop.isPending ||
    actions.restart.isPending ||
    actions.update.isPending ||
    actions.rollback.isPending;

  const hasUpdate = updateStatus?.status === "update_available";

  const canAct = container.managed && !container.protected;

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
        className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors cursor-pointer"
        onClick={() => navigate(`/container/${container.id}`)}
      >
        {/* Name + badges */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <StatusDot status={container.status} />
            <span className="font-medium text-slate-200 truncate max-w-[160px]">
              {container.name.replace(/^\//, "")}
            </span>
            <HealthIcon health={container.health} />
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {container.protected && (
              <Badge color="amber" size="xs">
                <Shield className="h-2.5 w-2.5" /> protected
              </Badge>
            )}
            {hasUpdate && (
              <Badge color="green" size="xs">
                <ArrowUpCircle className="h-2.5 w-2.5" /> update
              </Badge>
            )}
          </div>
        </td>

        {/* Status */}
        <td className="px-4 py-3 text-sm text-slate-400">{container.status}</td>

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
              <div className="text-slate-600 truncate max-w-[100px]">{primaryNet.network_name}</div>
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
              title="View Logs"
              onClick={() => setShowLogs(true)}
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>

            {container.managed && container.protected && (
              <span
                className="inline-flex items-center gap-1 text-xs text-amber-700 px-1.5 py-1 select-none"
                title="Container is protected — actions disabled"
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
                    title="Start"
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
                      title="Stop"
                      loading={actions.stop.isPending}
                      onClick={() => setConfirm("stop")}
                    >
                      <Square className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Restart"
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
                    title="Update"
                    loading={actions.update.isPending}
                    onClick={() => setConfirm("update")}
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5 text-green-400" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  title="Rollback"
                  loading={actions.rollback.isPending}
                  onClick={() => setConfirm("rollback")}
                >
                  <RotateCw className="h-3.5 w-3.5 text-violet-400" />
                </Button>
              </>
            )}
          </div>
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
          title={`${actionLabels[confirm]} container?`}
          description={`Are you sure you want to ${actionLabels[confirm].toLowerCase()} "${container.name.replace(/^\//, "")}"?`}
          confirmLabel={actionLabels[confirm]}
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
