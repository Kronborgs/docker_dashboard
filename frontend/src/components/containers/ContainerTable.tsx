import { useAppStore } from "../../store/useAppStore";
import { ContainerRow } from "./ContainerRow";
import type { Container, UpdateStatus, SortField, ContainerGroup } from "../../types";
import { ChevronUp, ChevronDown, Folder, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

interface ContainerTableProps {
  containers: Container[];
  updateStatuses: UpdateStatus[];
  groups?: ContainerGroup[];
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

const TOTAL_COLS = columns.length;

const colorMap: Record<string, string> = {
  blue:   "text-blue-400 bg-blue-900/20 border-blue-700/50",
  green:  "text-green-400 bg-green-900/20 border-green-700/50",
  amber:  "text-amber-400 bg-amber-900/20 border-amber-700/50",
  purple: "text-purple-400 bg-purple-900/20 border-purple-700/50",
  red:    "text-red-400 bg-red-900/20 border-red-700/50",
  teal:   "text-teal-400 bg-teal-900/20 border-teal-700/50",
  slate:  "text-slate-400 bg-slate-800/60 border-slate-700/50",
};

function GroupHeaderRow({
  group,
  count,
  collapsed,
  onToggle,
}: {
  group: ContainerGroup;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const color = colorMap[group.color ?? "slate"] ?? colorMap.slate;
  return (
    <tr
      className={clsx("border-b cursor-pointer select-none", color)}
      onClick={onToggle}
    >
      <td colSpan={TOTAL_COLS} className="px-4 py-2">
        <div className="flex items-center gap-2">
          <ChevronRight
            className={clsx("h-3.5 w-3.5 transition-transform", !collapsed && "rotate-90")}
          />
          <Folder className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold tracking-wide">{group.name}</span>
          <span className="text-[10px] opacity-60">{count} container{count !== 1 ? "s" : ""}</span>
        </div>
      </td>
    </tr>
  );
}

export function ContainerTable({ containers, updateStatuses, groups }: ContainerTableProps) {
  const { sortField, sortAsc, setSort, selectedIds, selectAll, clearSelected } = useAppStore();
  const updateMap = Object.fromEntries(updateStatuses.map((u) => [u.container_id, u]));
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const allIds = containers.map((c) => c.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = allIds.some((id) => selectedIds.has(id));

  const toggleCollapse = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Build rows: grouped containers then ungrouped
  function buildRows() {
    if (!groups || groups.length === 0) {
      return containers.map((c) => (
        <ContainerRow key={c.id} container={c} updateStatus={updateMap[c.id]} />
      ));
    }

    const rows: React.ReactNode[] = [];
    const groupedIds = new Set<string>();

    for (const grp of groups) {
      const members = containers.filter((c) => c.group_id === grp.id);
      if (members.length === 0) continue;
      const memberIds = members.map((c) => c.id);
      for (const id of memberIds) groupedIds.add(id);
      const isCollapsed = collapsed.has(grp.id);
      rows.push(
        <GroupHeaderRow
          key={`grp-${grp.id}`}
          group={grp}
          count={members.length}
          collapsed={isCollapsed}
          onToggle={() => toggleCollapse(grp.id)}
        />
      );
      if (!isCollapsed) {
        members.forEach((c) =>
          rows.push(<ContainerRow key={c.id} container={c} updateStatus={updateMap[c.id]} />)
        );
      }
    }

    // Ungrouped
    const ungrouped = containers.filter((c) => !c.group_id);
    if (ungrouped.length > 0) {
      if (rows.length > 0) {
        // separator for ungrouped section when mixed
        rows.push(
          <tr key="grp-ungrouped-header" className="border-b border-slate-700/40 bg-slate-800/30 select-none">
            <td colSpan={TOTAL_COLS} className="px-4 py-2">
              <div className="flex items-center gap-2 text-slate-500">
                <Folder className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold tracking-wide">Ungrouped</span>
                <span className="text-[10px] opacity-60">{ungrouped.length} container{ungrouped.length !== 1 ? "s" : ""}</span>
              </div>
            </td>
          </tr>
        );
      }
      ungrouped.forEach((c) =>
        rows.push(<ContainerRow key={c.id} container={c} updateStatus={updateMap[c.id]} />)
      );
    }

    return rows;
  }

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
              <td colSpan={TOTAL_COLS} className="px-4 py-12 text-center text-slate-500">
                No containers found
              </td>
            </tr>
          ) : (
            buildRows()
          )}
        </tbody>
      </table>
    </div>
  );
}
