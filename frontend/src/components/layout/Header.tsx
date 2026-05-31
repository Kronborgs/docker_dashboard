import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, History, Database, Settings, Folder, Globe } from "lucide-react";
import { clsx } from "clsx";
import { useSummary } from "../../hooks";
import { useLang } from "../../i18n/translations";

export function Header() {
  const location = useLocation();
  const { data: summary } = useSummary();
  const { t, lang, setLanguage } = useLang();

  const nav = [
    { to: "/", label: t.nav_dashboard, icon: LayoutDashboard },
    { to: "/groups", label: t.nav_groups, icon: Folder },
    { to: "/history", label: t.nav_history, icon: History },
    { to: "/backups", label: t.nav_backups, icon: Database },
    { to: "/settings", label: t.nav_settings, icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🐳</span>
          <span className="font-bold text-slate-100 tracking-tight">Docker Dashboard</span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                location.pathname === to
                  ? "bg-slate-700 text-slate-100"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side: summary pills + language toggle */}
        <div className="flex items-center gap-3">
          {summary && (
            <div className="hidden lg:flex items-center gap-3 text-xs">
              <span className="text-slate-500">
                <span className="text-green-400 font-semibold">{summary.running}</span>/{summary.total} {t.header_running_pill}
              </span>
              {summary.unhealthy > 0 && (
                <span className="text-red-400 font-semibold">{summary.unhealthy} {t.header_unhealthy_pill}</span>
              )}
              {summary.excluded > 0 && (
                <span className="text-slate-500">{summary.excluded} {t.header_excluded_pill}</span>
              )}
            </div>
          )}

          {/* Language toggle */}
          <button
            onClick={() => setLanguage(lang === "en" ? "da" : "en")}
            title={t.lang_tooltip}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            {t.lang_switch}
          </button>
        </div>
      </div>
    </header>
  );
}
