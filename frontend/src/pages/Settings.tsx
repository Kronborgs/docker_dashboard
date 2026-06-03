import { useAllSettings, useDeleteContainerSettings, usePatchContainerSettings, useAppConfig, usePatchAppConfig } from "../hooks";
import { Shield, EyeOff, Trash2, RefreshCw, Clock } from "lucide-react";
import { clsx } from "clsx";
import type { ContainerSettings } from "../types";
import { useLang } from "../i18n/translations";

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
  const { t } = useLang();

  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-700/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{row.container_name}</p>
        <div className="flex items-center gap-2 mt-1">
          <SettingBadge active={row.protected} label={t.settings_badge_protected} icon={<Shield className="h-3 w-3 text-amber-400" />} />
          <SettingBadge active={row.excluded} label={t.settings_badge_excluded} icon={<EyeOff className="h-3 w-3 text-slate-400" />} />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {row.excluded && (
          <button
            onClick={() => patch.mutate({ excluded: false })}
            disabled={patch.isPending}
            title={t.settings_reinclude_tip}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> {t.settings_reinclude}
          </button>
        )}
        <button
          onClick={() => del.mutate(row.container_name)}
          disabled={del.isPending}
          title={t.settings_delete_tip}
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
  const { data: appConfig } = useAppConfig();
  const patchApp = usePatchAppConfig();
  const { t } = useLang();

  const retentionDays = appConfig?.data_retention_days ?? 90;

  if (isLoading) {
    return <div className="text-slate-500 animate-pulse p-8">{t.loading}</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">{t.settings_title}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {t.settings_desc}
        </p>
      </div>

      {/* ── Data Retention ── */}
      <section className="bg-slate-800 border border-slate-700/60 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> {t.settings_retention_header}
        </h2>
        <p className="text-xs text-slate-500 mb-4">{t.settings_retention_desc}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-400">{t.settings_retention_label}</span>
          {([30, 60, 90] as const).map((days) => (
            <button
              key={days}
              onClick={() => patchApp.mutate({ data_retention_days: days })}
              disabled={patchApp.isPending}
              className={clsx(
                "px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50",
                retentionDays === days
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
              )}
            >
              {t.settings_retention_days(days)}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-3">{t.settings_retention_affects}</p>
      </section>

      <section className="bg-slate-800 border border-slate-700/60 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          {t.settings_overrides_header}
          {settings.length > 0 && (
            <span className="ml-2 text-slate-600 normal-case font-normal">({settings.length})</span>
          )}
        </h2>

        {settings.length === 0 ? (
          <p className="text-sm text-slate-600 py-4 text-center">
            {t.settings_no_overrides}
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
        <p className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-amber-400" /> <strong className="text-slate-400">{t.settings_badge_protected}</strong> — {t.detail_setting_protected_desc}</p>
        <p className="flex items-center gap-1.5"><EyeOff className="h-3.5 w-3.5 text-slate-400" /> <strong className="text-slate-400">{t.settings_badge_excluded}</strong> — {t.detail_setting_excluded_desc}</p>
        <p className="mt-2 text-slate-600">Dashboard overrides win over Docker labels. Set <code className={clsx("bg-slate-700 px-1 rounded")}>com.kronborg.dashboard.protected=true</code> on a container to protect it via Docker label instead.</p>
      </section>
    </div>
  );
}
