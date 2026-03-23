import { create } from "zustand";
import { QrStyle, UserSettings } from "@/lib/supabase";

// ─── App Store (Zustand) ────────────────────────────────────────────────────

interface AppStoreState {
  // Theme
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;

  // Styles/Templates
  styles: Map<string, QrStyle>;
  setStyles: (styles: QrStyle[]) => void;
  getStyle: (id: string) => QrStyle | undefined;

  // User Settings
  settings: UserSettings | null;
  setSettings: (settings: UserSettings | null) => void;

  // Selected QRs (for bulk operations)
  selectedQrs: Set<string>;
  toggleQrSelection: (id: string) => void;
  addQrSelection: (id: string) => void;
  removeQrSelection: (id: string) => void;
  clearQrSelection: () => void;
  isQrSelected: (id: string) => boolean;

  // BarTender selections
  bartenderSelections: Map<string, number>; // id -> adt
  setBartenderSelections: (selections: Map<string, number>) => void;
  addBartenderSelection: (id: string, adt: number) => void;
  removeBartenderSelection: (id: string) => void;
  updateBartenderAdt: (id: string, adt: number) => void;
  clearBartenderSelections: () => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  // Theme
  theme: "light",
  setTheme: (theme) => set({ theme }),

  // Styles
  styles: new Map(),
  setStyles: (styles) =>
    set({
      styles: new Map(styles.map((s) => [s.id, s])),
    }),
  getStyle: (id) => get().styles.get(id),

  // Settings
  settings: null,
  setSettings: (settings) => set({ settings }),

  // Selected QRs
  selectedQrs: new Set(),
  toggleQrSelection: (id) => {
    const current = get().selectedQrs;
    const next = new Set(current);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    set({ selectedQrs: next });
  },
  addQrSelection: (id) => {
    const current = get().selectedQrs;
    const next = new Set(current);
    next.add(id);
    set({ selectedQrs: next });
  },
  removeQrSelection: (id) => {
    const current = get().selectedQrs;
    const next = new Set(current);
    next.delete(id);
    set({ selectedQrs: next });
  },
  clearQrSelection: () => set({ selectedQrs: new Set() }),
  isQrSelected: (id) => get().selectedQrs.has(id),

  // BarTender selections
  bartenderSelections: new Map(),
  setBartenderSelections: (selections) => set({ bartenderSelections: new Map(selections) }),
  addBartenderSelection: (id, adt) => {
    const current = get().bartenderSelections;
    const next = new Map(current);
    next.set(id, Math.max(1, adt));
    set({ bartenderSelections: next });
  },
  removeBartenderSelection: (id) => {
    const current = get().bartenderSelections;
    const next = new Map(current);
    next.delete(id);
    set({ bartenderSelections: next });
  },
  updateBartenderAdt: (id, adt) => {
    const current = get().bartenderSelections;
    if (!current.has(id)) return;
    const next = new Map(current);
    next.set(id, Math.max(1, adt));
    set({ bartenderSelections: next });
  },
  clearBartenderSelections: () => set({ bartenderSelections: new Map() }),

  // UI
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

// ─── Persisted Store (with localStorage) ────────────────────────────────────

interface PersistedState {
  theme: "light" | "dark";
  sidebarOpen: boolean;
}

const STORAGE_KEY = "app_state";

export function saveUiState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save UI state:", e);
  }
}

export function loadUiState(): Partial<PersistedState> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("Failed to load UI state:", e);
    return {};
  }
}
