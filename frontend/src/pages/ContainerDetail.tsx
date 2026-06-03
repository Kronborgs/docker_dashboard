import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, RefreshCw, Play, Square, RotateCcw, ArrowUpCircle, RotateCw, FileText, Shield, EyeOff } from "lucide-react";
import {
  useContainer, useStatsHistory, useContainerEvents,
  useContainerBackups, useContainerActions, useUpdates,
  useContainerSettings, usePatchContainerSettings,
} from "../hooks";
import { StatsChart } from "../components/charts/StatsChart";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { LogsModal } from "../components/modals/LogsModal";
import { UpdateResultModal } from "../components/modals/UpdateResultModal";
import { format } from "date-fns";
import type { UpdateResult } from "../types";
import { clsx } from "clsx";
import { useLang } from "../i18n/translations";

type ChartMetric = "cpu" | "memory" | "network" | "block";
type ChartRange = 24 | 168 | 720 | 2160;
type ActionType = "start" | "stop" | "restart" | "update" | "rollback";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 w-36 flex-shrink-0">{label}</span>
      <span className="text-xs text-slate-300 font-mono break-all">{value || "—"}</span>
    </div>
  );
}

interface SettingToggleProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  value: boolean;
  fromLabel: boolean;
  activeColor: string;
  onToggle: (v: boolean) => void;
  loading: boolean;
}

function SettingToggle({ label, description, icon, value, fromLabel, activeColor, onToggle, loading }: SettingToggleProps) {
  const { t } = useLang();
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={clsx("p-1.5 rounded", value ? activeColor : "bg-slate-700/50 text-slate-500")}>{icon}</span>
        <div>
          <p className="text-xs font-medium text-slate-300">{label}</p>
          <p className="text-[10px] text-slate-600">{description}</p>
        </div>
        {fromLabel && (
          <span className="text-[10px] text-slate-600 ml-1">{t.detail_via_label}</span>
        )}
      </div>
      <button
        disabled={loading}
        onClick={() => onToggle(!value)}
        className={clsx(
          "relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
          value ? "bg-blue-600" : "bg-slate-600",
          loading && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={clsx(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200",
            value ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

export default function ContainerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [chartMetric, setChartMetric] = useState<ChartMetric>("cpu");
  const [chartRange, setChartRange] = useState<ChartRange>(24);
  const [confirm, setConfirm] = useState<ActionType | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);

  const { data: container, isLoading } = useContainer(id!);
  const { data: stats = [] } = useStatsHistory(id!, chartRange);
  const { data: events = [] } = useContainerEvents(id!);
  const { data: backups = [] } = useContainerBackups(container?.name ?? "");
  const { data: updates = [] } = useUpdates();
  const actions = useContainerActions();
  const { data: dbSettings } = useContainerSettings(container?.name ?? "");
  const patchSettings = usePatchContainerSettings(container?.name ?? "");

  const { t } = useLang();

  if (isLoading) {
    return <div className="text-slate-500 animate-pulse p-8">{t.loading}</div>;
  }
  if (!container) {
    return <div className="text-red-400 p-8">{t.detail_not_found}</div>;
  }

  const updateStatus = updates.find((u) => u.container_id === container.id);
  const hasUpdate = updateStatus?.status === "update_available";
  const canAct = !container.protected;
  const isPending =
    actions.start.isPending || actions.stop.isPending ||
    actions.restart.isPending || actions.update.isPending ||
    actions.rollback.isPending;

  function handleConfirm() {
    if (!confirm || !id) return;
    if (confirm === "start") actions.start.mutate(id);
    else if (confirm === "stop") actions.stop.mutate(id);
    else if (confirm === "restart") actions.restart.mutate(id);
    else if (confirm === "update") {
      actions.update.mutate({ id }, { onSuccess: (d) => setUpdateResult(d) });
    } else if (confirm === "rollback") {
      actions.rollback.mutate(id, { onSuccess: (d) => setUpdateResult(d) });
    }
    setConfirm(null);
  }

  const primaryNet = container.networks[0];

  return (
    <div className="space-y-6">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-100 truncate">
            {container.name.replace(/^\//, "")}
          </h1>
          <p className="text-xs text-slate-500 font-mono">{container.short_id}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {container.protected && (
            <Badge color="amber">
              <Shield className="h-3 w-3" /> {t.settings_badge_protected}
            </Badge>
          )}
          {hasUpdate && <Badge color="green"><ArrowUpCircle className="h-3 w-3" /> {t.detail_badge_update}</Badge>}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" onClick={() => setShowLogs(true)}>
          <FileText className="h-3.5 w-3.5" /> {t.detail_logs}
        </Button>
        {canAct && (
          <>
            {container.status !== "running" ? (
              <Button size="sm" variant="primary" loading={actions.start.isPending} onClick={() => setConfirm("start")}>
                <Play className="h-3.5 w-3.5" /> {t.action_start}
              </Button>
            ) : (
              <>
                <Button size="sm" variant="danger" loading={actions.stop.isPending} onClick={() => setConfirm("stop")}>
                  <Square className="h-3.5 w-3.5" /> {t.action_stop}
                </Button>
                <Button size="sm" variant="secondary" loading={actions.restart.isPending} onClick={() => setConfirm("restart")}>
                  <RotateCcw className="h-3.5 w-3.5" /> {t.action_restart}
                </Button>
              </>
            )}
            {hasUpdate && (
              <Button size="sm" variant="primary" loading={actions.update.isPending} onClick={() => setConfirm("update")}>
                <ArrowUpCircle className="h-3.5 w-3.5" /> {t.action_update}
              </Button>
            )}
            <Button size="sm" variant="secondary" loading={actions.rollback.isPending} onClick={() => setConfirm("rollback")}>
              <RotateCw className="h-3.5 w-3.5" /> {t.action_rollback}
            </Button>
          </>
        )}
        {!canAct && container.protected && (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <Shield className="h-3.5 w-3.5" /> {t.detail_protected_msg}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col: info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Status */}
          <section className="bg-slate-800 border border-slate-700/60 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t.detail_section_status}</h2>
            <InfoRow label={t.info_status} value={container.status} />
            <InfoRow label={t.info_health} value={container.health} />
            <InfoRow label={t.info_uptime} value={container.uptime_seconds ? `${Math.floor(container.uptime_seconds / 3600)}h ${Math.floor((container.uptime_seconds % 3600) / 60)}m` : null} />
            <InfoRow label={t.info_restart_policy} value={container.restart_policy} />
            <InfoRow label={t.info_hostname} value={container.hostname} />
          </section>

          {/* Image */}
          <section className="bg-slate-800 border border-slate-700/60 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t.detail_section_image}</h2>
            <InfoRow label={t.info_image} value={`${container.image}:${container.image_tag}`} />
            <InfoRow label={t.info_image_id} value={container.image_id.slice(0, 24) + "…"} />
            {updateStatus && (
              <InfoRow label={t.info_update_status} value={
                <Badge color={updateStatus.status === "update_available" ? "green" : "slate"} size="xs">
                  {updateStatus.status.replace(/_/g, " ")}
                </Badge>
              } />
            )}
          </section>

          {/* Network */}
          <section className="bg-slate-800 border border-slate-700/60 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t.detail_section_network}</h2>
            {container.networks.map((n) => (
              <div key={n.network_name} className="mb-2 last:mb-0">
                <InfoRow label={t.info_network} value={n.network_name} />
                <InfoRow label={t.info_ip} value={n.ip} />
                <InfoRow label={t.info_mac} value={n.mac} />
              </div>
            ))}
            <InfoRow label={t.info_network_mode} value={(container as any).network_mode} />
          </section>

          {/* Mounts */}
          {(container as any).mounts?.length > 0 && (
            <section className="bg-slate-800 border border-slate-700/60 rounded-xl p-4">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t.detail_section_mounts}</h2>
              {(container as any).mounts.map((m: any, i: number) => (
                <div key={i} className="text-xs font-mono text-slate-400 truncate mb-1">
                  <span className="text-slate-600">{m.Type}:</span> {m.Source} → {m.Destination}
                </div>
              ))}
            </section>
          )}

          {/* Dashboard Settings */}
          <section className="bg-slate-800 border border-slate-700/60 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t.detail_section_settings}</h2>
            <SettingToggle
              label={t.detail_setting_protected_label}
              description={t.detail_setting_protected_desc}
              icon={<Shield className="h-3.5 w-3.5" />}
              value={container.protected}
              fromLabel={container.protected && dbSettings?.protected == null}
              activeColor="bg-amber-900/40 text-amber-400 border-amber-700/60"
              onToggle={(v) => patchSettings.mutate({ protected: v })}
              loading={patchSettings.isPending}
            />
            <SettingToggle
              label={t.detail_setting_excluded_label}
              description={t.detail_setting_excluded_desc}
              icon={<EyeOff className="h-3.5 w-3.5" />}
              value={dbSettings?.excluded ?? false}
              fromLabel={false}
              activeColor="bg-slate-700 text-slate-300 border-slate-600"
              onToggle={(v) => patchSettings.mutate({ excluded: v })}
              loading={patchSettings.isPending}
            />
          </section>
        </div>

        {/* Right col: charts + events */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live stats */}
          <section className="bg-slate-800 border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {chartRange === 24 ? t.chart_stats_header : `Stats (${chartRange === 168 ? "7d" : chartRange === 720 ? "30d" : "90d"})`}
              </h2>
              <div className="flex gap-1 flex-wrap justify-end">
                {(
                  [
                    { key: "cpu",     label: t.chart_cpu_label,     title: t.chart_cpu_tip },
                    { key: "memory",  label: t.chart_memory_label,  title: t.chart_memory_tip },
                    { key: "network", label: t.chart_network_label, title: t.chart_network_tip },
                    { key: "block",   label: t.chart_block_label,   title: t.chart_block_tip },
                  ] as { key: ChartMetric; label: string; title: string }[]
                ).map(({ key, label, title }) => (
                  <button
                    key={key}
                    onClick={() => setChartMetric(key)}
                    title={title}
                    className={clsx(
                      "px-2 py-1 rounded text-xs transition-colors",
                      chartMetric === key
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {label}
                  </button>
                ))}
                <span className="w-px bg-slate-700 mx-1 self-stretch" />
                {(
                  [
                    { hours: 24 as ChartRange,   label: t.chart_range_24h },
                    { hours: 168 as ChartRange,  label: t.chart_range_7d },
                    { hours: 720 as ChartRange,  label: t.chart_range_30d },
                    { hours: 2160 as ChartRange, label: t.chart_range_90d },
                  ]
                ).map(({ hours, label }) => (
                  <button
                    key={hours}
                    onClick={() => setChartRange(hours)}
                    className={clsx(
                      "px-2 py-1 rounded text-xs transition-colors",
                      chartRange === hours
                        ? "bg-slate-500 text-white"
                        : "bg-slate-700 text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Live values */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: t.chart_live_cpu, value: `${container.cpu_percent.toFixed(1)}%` },
                { label: t.chart_live_ram, value: `${container.mem_usage_mb.toFixed(0)}MB` },
                { label: t.chart_live_rx, value: fmtBytes(container.net_rx_bytes) },
                { label: t.chart_live_tx, value: fmtBytes(container.net_tx_bytes) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-900 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-slate-100">{value}</p>
                  <p className="text-xs text-slate-600">{label}</p>
                </div>
              ))}
            </div>
            <StatsChart data={stats} metric={chartMetric} hours={chartRange} />
          </section>

          {/* Events timeline */}
          <section className="bg-slate-800 border border-slate-700/60 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {t.detail_section_events(events.length)}
            </h2>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {events.length === 0 && (
                <p className="text-sm text-slate-600">{t.detail_no_events}</p>
              )}
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 text-xs">
                  <span className="text-slate-600 font-mono w-36 flex-shrink-0">
                    {format(new Date(ev.created_at), "yyyy-MM-dd HH:mm:ss")}
                  </span>
                  <Badge
                    color={eventColor(ev.event_type)}
                    size="xs"
                  >
                    {ev.event_type}
                  </Badge>
                  {ev.status && <span className="text-slate-600">{ev.status}</span>}
                </div>
              ))}
            </div>
          </section>

          {/* Backups */}
          <section className="bg-slate-800 border border-slate-700/60 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {t.detail_section_backups(backups.length)}
            </h2>
            {backups.length === 0 ? (
              <p className="text-sm text-slate-600">{t.detail_no_backups}</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {backups.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 text-xs">
                    <span className="text-slate-600 font-mono w-36 flex-shrink-0">
                      {format(new Date(b.created_at), "yyyy-MM-dd HH:mm")}
                    </span>
                    <Badge color="slate" size="xs">{b.trigger}</Badge>
                    {b.file_path && (
                      <span className="text-slate-600 truncate font-mono">
                        {b.file_path.split("/").pop()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modals */}
      {showLogs && (
        <LogsModal
          containerId={container.id}
          containerName={container.name}
          onClose={() => setShowLogs(false)}
        />
      )}
      {confirm && (
        <ConfirmModal
          open
          title={t.detail_confirm_title(confirm.charAt(0).toUpperCase() + confirm.slice(1))}
          description={t.detail_confirm_desc(confirm.charAt(0).toUpperCase() + confirm.slice(1), container.name.replace(/^\//, ""))}
          confirmLabel={confirm.charAt(0).toUpperCase() + confirm.slice(1)}
          variant={["stop", "update", "rollback"].includes(confirm) ? "danger" : "primary"}
          loading={isPending}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      <UpdateResultModal result={updateResult} onClose={() => setUpdateResult(null)} />
    </div>
  );
}

function fmtBytes(b: number) {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(1)}G`;
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)}M`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)}K`;
  return `${b}B`;
}

function eventColor(type: string): "green" | "red" | "blue" | "amber" | "violet" | "slate" {
  if (["start", "create"].includes(type)) return "green";
  if (["die", "destroy", "kill"].includes(type)) return "red";
  if (["restart", "update"].includes(type)) return "blue";
  if (["rollback"].includes(type)) return "violet";
  if (["stop", "pause"].includes(type)) return "amber";
  return "slate";
}
