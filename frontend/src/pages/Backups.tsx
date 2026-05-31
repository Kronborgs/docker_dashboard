import { useBackups } from "../hooks";
import { format } from "date-fns";
import { Badge } from "../components/ui/Badge";
import { useNavigate } from "react-router-dom";
import { Database } from "lucide-react";
import { useLang } from "../i18n/translations";

export default function Backups() {
  const { data: backups = [], isLoading } = useBackups();
  const navigate = useNavigate();
  const { t } = useLang();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Database className="h-5 w-5 text-slate-400" />
        <h1 className="text-lg font-bold text-slate-100">{t.backups_title}</h1>
      </div>
      <p className="text-sm text-slate-500">
        {t.backups_desc(backups.length)}
      </p>

      <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t.backups_col_time}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t.backups_col_container}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t.backups_col_trigger}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{t.backups_col_file}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-600 animate-pulse">{t.loading}</td>
              </tr>
            )}
            {!isLoading && backups.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-600">
                  {t.backups_no_backups}
                </td>
              </tr>
            )}
            {backups.map((b) => (
              <tr
                key={b.id}
                className="border-b border-slate-800 hover:bg-slate-700/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/container/${b.container_id}`)}
              >
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500 whitespace-nowrap">
                  {format(new Date(b.created_at), "yyyy-MM-dd HH:mm:ss")}
                </td>
                <td className="px-4 py-2.5 text-slate-300 font-medium">{b.container_name}</td>
                <td className="px-4 py-2.5">
                  <Badge
                    color={b.trigger === "pre_update" ? "blue" : b.trigger === "pre_rollback" ? "violet" : "slate"}
                    size="xs"
                  >
                    {b.trigger}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-xs font-mono text-slate-600">
                  {b.file_path ? b.file_path.split("/").pop() : t.backups_db_only}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
