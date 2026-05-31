import { create } from "zustand";
import type { FilterType, SortField, Toast } from "../types";
import type { Lang } from "../i18n/translations";

interface AppState {
  filter: FilterType;
  search: string;
  sortField: SortField;
  sortAsc: boolean;
  toasts: Toast[];
  selectedIds: Set<string>;
  language: Lang;
  setFilter: (f: FilterType) => void;
  setSearch: (s: string) => void;
  setSort: (field: SortField) => void;
  addToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;
  toggleSelected: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelected: () => void;
  setLanguage: (lang: Lang) => void;
}

export const useAppStore = create<AppState>((set) => ({
  filter: "all",
  search: "",
  sortField: "name",
  sortAsc: true,
  toasts: [],
  selectedIds: new Set(),
  language: (localStorage.getItem("dd_lang") as Lang) ?? "da",

  setFilter: (filter) => set({ filter }),
  setSearch: (search) => set({ search }),
  setSort: (field) =>
    set((state) => ({
      sortField: field,
      sortAsc: state.sortField === field ? !state.sortAsc : true,
    })),
  addToast: (type, message) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: crypto.randomUUID(), type, message },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  toggleSelected: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { selectedIds: next };
    }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelected: () => set({ selectedIds: new Set() }),
  setLanguage: (lang) => {
    localStorage.setItem("dd_lang", lang);
    set({ language: lang });
  },
}));
