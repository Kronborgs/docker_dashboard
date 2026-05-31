import { X, RefreshCw } from "lucide-react";
import { useLogs } from "../../hooks";
import { Button } from "../ui/Button";
import { useState } from "react";

interface LogsModalProps {
  containerId: string;
  containerName: string;
  onClose: () => void;
}

export function LogsModal({ containerId, containerName, onClose }: LogsModalProps) {
  const [tail, setTail] = useState(200);
  const { data: logs, isLoading, refetch } = useLogs(containerId, tail);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div>
            <h3 className="font-semibold text-slate-100">{containerName}</h3>
            <p className="text-xs text-slate-500">Container logs</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={tail}
              onChange={(e) => setTail(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-sm text-slate-300 rounded-md px-2 py-1"
            >
              {[50, 100, 200, 500, 1000].map((n) => (
                <option key={n} value={n}>
                  Last {n} lines
                </option>
              ))}
            </select>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <p className="text-slate-500 text-sm animate-pulse">Loading logs…</p>
          ) : (
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
              {logs || "(no logs)"}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
