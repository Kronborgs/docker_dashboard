import { useState, useMemo } from "react";
import { useAllEvents } from "../hooks";
import { format, subDays } from "date-fns";
import { Badge } from "../components/ui/Badge";
import { useNavigate } from "react-router-dom";
import { useLang } from "../i18n/translations";

type DateRange = "all" | "7d" | "30d" | "90d";

function eventColor(type: string): "green" | "red" | "blue" | "amber" | "violet" | "slate" {
  if (["start", "create"].includes(type)) return "green";
  if (["die", "destroy", "kill"].includes(type)) return "red";
  if (["restart", "update"].includes(type)) return "blue";
  if (["rollback"].includes(type)) return "violet";
  if (["stop", "pause"].includes(type)) return "amber";
  return "slate";
}

export default function History() {
  const { data: events = [], isLoading } = useAllEvents();
  const navigate = useNavigate();
  const { t } = useLang();

  const [nameFilter, setNameFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const filtered = useMemo(() => {
    const now = new Date();
    const cutoff: Date | null =
      dateRange === "7d" ? subDays(now, 7) :
      dateRange === "30d" ? subDays(now, 30) :
      dateRange === "90d" ? subDays(now, 90) :
      null;

    const name = nameFilter.trim().toLowerCase();

    return events.filter((ev) => {
      if (name && !ev.container_name.toLowerCase().includes(name)) return false;
      if (cutoff && new Date(ev.created_at) < cutoff) return false;
      return true;
    });
  }, [events, nameFilter, dateRange]);

  const rangeOptions: { value: DateRange; label: string }[] = [
    { value: "all", label: t.history_range_all },
    { value: "7d", label: t.history_range_7d },
    { value: "30d", label: t.history_range_30d },
    { value: "90d", label: t.history_range_90d },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-100">{t.history_title}</h1>
      <p className="text-sm text-slate-500">{t.history_desc(filtered.length)}</p>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-slate-500">{t.history_filter_container}</span>
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder={t.history_filter_container_placeholder}
            className="h-8 px-3 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 w-48"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-slate-500">{t.history_filter_range}</span>
          <div className="flex gap-1">
            {rangeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                className={`h-8 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  dateRange === opt.value
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t.history_col_time}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t.history_col_container}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t.history_col_event}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t.history_col_status}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t.history_col_snapshot}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-600 animate-pulse">
                  {t.loading_events}
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-600">
                  {t.history_no_events}
                </td>
              </tr>
            )}
            {filtered.map((ev) => (
              <tr
                key={ev.id}
                className="border-b border-slate-800 hover:bg-slate-700/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/container/${ev.container_id}`)}
              >
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500 whitespace-nowrap">
                  {format(new Date(ev.created_at), "yyyy-MM-dd HH:mm:ss")}
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-slate-300 font-medium">{ev.container_name}</span>
                  <span className="ml-2 text-slate-600 font-mono text-xs">{ev.container_id.slice(0, 12)}</span>
                </td>
                <td className="px-4 py-2.5">
                  <Badge color={eventColor(ev.event_type)} size="xs">{ev.event_type}</Badge>
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{ev.status}</td>
                <td className="px-4 py-2.5">
                  {ev.has_inspect ? (
                    <span className="text-xs text-green-600">{t.history_snapshot_saved}</span>
                  ) : (
                    <span className="text-xs text-slate-700">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
