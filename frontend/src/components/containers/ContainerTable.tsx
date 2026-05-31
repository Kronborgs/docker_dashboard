import { useAppStore } from "../../store/useAppStore";
import { ContainerRow } from "./ContainerRow";
import type { Container, UpdateStatus, SortField } from "../../types";
import { ChevronUp, ChevronDown } from "lucide-react";
import { clsx } from "clsx";

interface ContainerTableProps {
  containers: Container[];
  updateStatuses: UpdateStatus[];
}

const columns: { label: string; field?: SortField; className?: string; title?: string }[] = [
  { label: "", className: "w-8" }, // checkbox
  { label: "Name / Badges", field: "name", className: "w-[220px]" },
  { label: "Status", field: "status" },
  { label: "Image" },
  { label: "CPU", field: "cpu_percent", className: "text-right" },
  { label: "RAM", field: "mem_percent", className: "text-right" },
  { label: "Network / IP / MAC" },
  { label: "RX / TX", field: "net_rx_bytes" },
  { label: "Uptime", field: "uptime_seconds" },
  { label: "Actions", className: "w-[160px]" },
  { label: "Protected", className: "w-[80px] text-center" },
  { label: "Excluded", className: "w-[80px] text-center" },
];

export function ContainerTable({ containers, updateStatuses }: ContainerTableProps) {
  const { sortField, sortAsc, setSort, selectedIds, selectAll, clearSelected } = useAppStore();
  const updateMap = Object.fromEntries(updateStatuses.map((u) => [u.container_id, u]));

  const allIds = containers.map((c) => c.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = allIds.some((id) => selectedIds.has(id));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/60">
            {/* Select-all checkbox */}
            <th className="px-3 py-3 w-8">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={() => allSelected ? clearSelected() : selectAll(allIds)}
                className="rounded border-slate-600 bg-slate-700 text-blue-600 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
            </th>
            {columns.slice(1).map((col) => (
              <th
                key={col.label}
                onClick={() => col.field && setSort(col.field)}
                title={col.title}
                className={clsx(
                  "px-4 py-3 text-xs font-semibold text-slate-400 text-left whitespace-nowrap",
                  col.field && "cursor-pointer hover:text-slate-200 select-none",
                  col.title && "cursor-help",
                  col.className
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.field && sortField === col.field && (
                    sortAsc
                      ? <ChevronUp className="h-3 w-3" />
                      : <ChevronDown className="h-3 w-3" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {containers.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500">
                No containers found
              </td>
            </tr>
          ) : (
            containers.map((c) => (
              <ContainerRow
                key={c.id}
                container={c}
                updateStatus={updateMap[c.id]}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
