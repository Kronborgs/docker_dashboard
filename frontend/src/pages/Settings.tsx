import { useAllSettings, useDeleteContainerSettings, usePatchContainerSettings } from "../hooks";
import { Shield, EyeOff, Trash2, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import type { ContainerSettings } from "../types";

function SettingBadge({ active, label, icon }: { active: boolean | null; label: string; icon: React.ReactNode }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-700 text-slate-300 border border-slate-600">
      {icon} {label}
    </span>
  );
}

function SettingsRow({ row }: { row: ContainerSettings }) {
  const del = useDeleteContainerSettings();
  const patch = usePatchContainerSettings(row.container_name);

  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-700/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{row.container_name}</p>
        <div className="flex items-center gap-2 mt-1">
          <SettingBadge active={row.protected} label="protected" icon={<Shield className="h-3 w-3 text-amber-400" />} />
          <SettingBadge active={row.excluded} label="excluded" icon={<EyeOff className="h-3 w-3 text-slate-400" />} />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {row.excluded && (
          <button
            onClick={() => patch.mutate({ excluded: false })}
            disabled={patch.isPending}
            title="Re-include in dashboard"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Re-include
          </button>
        )}
        <button
          onClick={() => del.mutate(row.container_name)}
          disabled={del.isPending}
          title="Remove all overrides for this container"
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { data: settings = [], isLoading } = useAllSettings();

  if (isLoading) {
    return <div className="text-slate-500 animate-pulse p-8">Loading…</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Dashboard Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Per-container overrides set via the dashboard. These take precedence over Docker labels.
        </p>
      </div>

      <section className="bg-slate-800 border border-slate-700/60 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Container Overrides
          {settings.length > 0 && (
            <span className="ml-2 text-slate-600 normal-case font-normal">({settings.length})</span>
          )}
        </h2>

        {settings.length === 0 ? (
          <p className="text-sm text-slate-600 py-4 text-center">
            No overrides set. Open a container's detail page to configure protected or excluded settings.
          </p>
        ) : (
          <div>
            {settings.map((row) => (
              <SettingsRow key={row.container_name} row={row} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 text-xs text-slate-500 space-y-1.5">
        <p className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-amber-400" /> <strong className="text-slate-400">Protected</strong> — disables start/stop/restart/update actions for the container.</p>
        <p className="flex items-center gap-1.5"><EyeOff className="h-3.5 w-3.5 text-slate-400" /> <strong className="text-slate-400">Excluded</strong> — hides the container from the dashboard entirely. Use Re-include or remove the override to show it again.</p>
        <p className="mt-2 text-slate-600">Dashboard overrides win over Docker labels. Set <code className={clsx("bg-slate-700 px-1 rounded")}>com.kronborg.dashboard.protected=true</code> on a container to protect it via Docker label instead.</p>
      </section>
    </div>
  );
}
