import { create } from "zustand";
import type { FilterType, SortField, Toast } from "../types";

interface AppState {
  filter: FilterType;
  search: string;
  sortField: SortField;
  sortAsc: boolean;
  toasts: Toast[];
  setFilter: (f: FilterType) => void;
  setSearch: (s: string) => void;
  setSort: (field: SortField) => void;
  addToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  filter: "all",
  search: "",
  sortField: "name",
  sortAsc: true,
  toasts: [],

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
}));
