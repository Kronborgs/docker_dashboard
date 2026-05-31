import { useState } from "react";
import { useContainers, useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useSetGroupMembers } from "../hooks";
import { Folder, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { clsx } from "clsx";
import type { ContainerGroup } from "../types";
import { useLang } from "../i18n/translations";

const COLORS = [
  { value: "slate",  label: "Gray",   cls: "bg-slate-500" },
  { value: "blue",   label: "Blue",   cls: "bg-blue-500" },
  { value: "green",  label: "Green",  cls: "bg-green-500" },
  { value: "amber",  label: "Amber",  cls: "bg-amber-500" },
  { value: "purple", label: "Purple", cls: "bg-purple-500" },
  { value: "red",    label: "Red",    cls: "bg-red-500" },
  { value: "teal",   label: "Teal",   cls: "bg-teal-500" },
];

const colorText: Record<string, string> = {
  blue:   "text-blue-400",
  green:  "text-green-400",
  amber:  "text-amber-400",
  purple: "text-purple-400",
  red:    "text-red-400",
  teal:   "text-teal-400",
  slate:  "text-slate-400",
};

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1.5">
      {COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => onChange(c.value)}
          className={clsx(
            "w-5 h-5 rounded-full border-2 transition-transform",
            c.cls,
            value === c.value ? "border-white scale-125" : "border-transparent opacity-60 hover:opacity-100"
          )}
        />
      ))}
    </div>
  );
}

function GroupCard({ group, containerNames }: { group: ContainerGroup; containerNames: string[] }) {
  const { data: containers = [] } = useContainers();
  const setMembers = useSetGroupMembers();
  const deleteGroup = useDeleteGroup();
  const updateGroup = useUpdateGroup();
  const { t } = useLang();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editColor, setEditColor] = useState(group.color ?? "slate");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const memberSet = new Set(containerNames);

  function toggleContainer(name: string) {
    const next = new Set(memberSet);
    next.has(name) ? next.delete(name) : next.add(name);
    setMembers.mutate({ id: group.id, names: Array.from(next) });
  }

  function saveEdit() {
    updateGroup.mutate({ id: group.id, name: editName.trim() || group.name, color: editColor });
    setEditing(false);
  }

  const iconColor = colorText[group.color ?? "slate"] ?? "text-slate-400";

  return (
    <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/60">
        {editing ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 w-40"
            />
            <ColorPicker value={editColor} onChange={setEditColor} />
            <button onClick={saveEdit} className="text-green-400 hover:text-green-300"><Check className="h-4 w-4" /></button>
            <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Folder className={clsx("h-4 w-4", iconColor)} />
            <span className="font-semibold text-slate-200 text-sm">{group.name}</span>
            <span className="text-xs text-slate-600">{t.containers_count(containerNames.length)}</span>
          </div>
        )}
        {!editing && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setEditName(group.name); setEditColor(group.color ?? "slate"); setEditing(true); }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
              title={t.groups_rename_tip}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-red-400">{t.groups_delete_confirm}</span>
                <button
                  onClick={() => { deleteGroup.mutate(group.id); setConfirmDelete(false); }}
                  className="text-red-400 hover:text-red-300 font-semibold px-1"
                >{t.groups_delete_yes}</button>
                <button onClick={() => setConfirmDelete(false)} className="text-slate-500 hover:text-slate-300 px-1">{t.groups_delete_no}</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-colors"
                title={t.groups_delete_tip}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Container list */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {containers.length === 0 && (
          <p className="col-span-full text-xs text-slate-600">No containers available</p>
        )}
        {containers.map((c) => {
          const name = c.name.replace(/^\//, "");
          const inGroup = memberSet.has(c.name);
          const inOtherGroup = !inGroup && c.group_id !== null && c.group_id !== group.id;
          return (
            <button
              key={c.id}
              disabled={inOtherGroup || setMembers.isPending}
              onClick={() => toggleContainer(c.name)}
              title={inOtherGroup ? "Already in another group" : undefined}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs text-left transition-colors",
                inGroup
                  ? "bg-blue-600/50 border-blue-400 text-white font-medium shadow shadow-blue-900/40"
                  : inOtherGroup
                    ? "bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed opacity-40"
                    : "bg-slate-700/50 border-slate-600/50 text-slate-300 hover:border-slate-400 hover:bg-slate-700"
              )}
            >
              <span
                className={clsx(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  c.status === "running" ? "bg-green-400" : "bg-slate-500"
                )}
              />
              <span className="truncate">{name}</span>
              {inGroup && <Check className="h-3 w-3 flex-shrink-0 ml-auto" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Groups() {
  const { data: groups = [], isLoading } = useGroups();
  const { data: containers = [] } = useContainers();
  const createGroup = useCreateGroup();
  const { t } = useLang();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("slate");

  // Build a map of group_id → container names from live container data
  const memberMap = containers.reduce<Record<number, string[]>>((acc, c) => {
    if (c.group_id !== null) {
      if (!acc[c.group_id]) acc[c.group_id] = [];
      acc[c.group_id].push(c.name);
    }
    return acc;
  }, {});

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createGroup.mutate({ name, color: newColor }, {
      onSuccess: () => { setNewName(""); setNewColor("slate"); },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">{t.groups_title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t.groups_desc}</p>
        </div>
      </div>

      {/* Create new group */}
      <form onSubmit={handleCreate} className="bg-slate-800 border border-slate-700/60 rounded-xl p-5 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-medium">{t.groups_name_label}</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.groups_name_placeholder}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 w-52"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-500 font-medium">{t.groups_color_label}</label>
          <ColorPicker value={newColor} onChange={setNewColor} />
        </div>
        <button
          type="submit"
          disabled={!newName.trim() || createGroup.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t.groups_create}
        </button>
      </form>

      {/* Existing groups */}
      {isLoading ? (
        <p className="text-slate-500 text-sm">{t.loading}</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          <Folder className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{t.groups_empty}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((grp) => (
            <GroupCard
              key={grp.id}
              group={grp}
              containerNames={memberMap[grp.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Group
        </button>
      </form>

      {/* Existing groups */}
      {isLoading ? (
        <p className="text-slate-500 text-sm">Loading groups…</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-slate-600">
          <Folder className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No groups yet. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((grp) => (
            <GroupCard
              key={grp.id}
              group={grp}
              containerNames={memberMap[grp.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
