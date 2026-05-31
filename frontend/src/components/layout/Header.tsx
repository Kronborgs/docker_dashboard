import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, History, Database, RefreshCw, Settings, Folder } from "lucide-react";
import { clsx } from "clsx";
import { useSummary } from "../../hooks";

export function Header() {
  const location = useLocation();
  const { data: summary } = useSummary();

  const nav = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/groups", label: "Groups", icon: Folder },
    { to: "/history", label: "History", icon: History },
    { to: "/backups", label: "Backups", icon: Database },
    { to: "/settings", label: "Settings", icon: Settings },
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

        {/* Summary pills */}
        {summary && (
          <div className="hidden lg:flex items-center gap-3 text-xs">
            <span className="text-slate-500">
              <span className="text-green-400 font-semibold">{summary.running}</span>/{summary.total} running
            </span>
            {summary.unhealthy > 0 && (
              <span className="text-red-400 font-semibold">{summary.unhealthy} unhealthy</span>
            )}
            {summary.excluded > 0 && (
              <span className="text-slate-500">{summary.excluded} excluded</span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
