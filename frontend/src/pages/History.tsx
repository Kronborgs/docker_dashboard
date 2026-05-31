import { useAllEvents } from "../hooks";
import { format } from "date-fns";
import { Badge } from "../components/ui/Badge";
import { useNavigate } from "react-router-dom";
import { useLang } from "../i18n/translations";

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

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-100">{t.history_title}</h1>
      <p className="text-sm text-slate-500">{t.history_desc(events.length)}</p>

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
            {!isLoading && events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-600">
                  {t.history_no_events}
                </td>
              </tr>
            )}
            {events.map((ev) => (
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
