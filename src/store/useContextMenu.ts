import { create } from 'zustand';

export interface CtxItem {
  label?: string;
  icon?: string;
  shortcut?: string;
  action?: () => void;
  submenu?: CtxItem[];
  separator?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuStore {
  visible: boolean;
  x: number;
  y: number;
  items: CtxItem[];
  show: (x: number, y: number, items: CtxItem[]) => void;
  hide: () => void;
}

export const useContextMenu = create<ContextMenuStore>((set) => ({
  visible: false,
  x: 0,
  y: 0,
  items: [],
  show: (x, y, items) => set({ visible: true, x, y, items }),
  hide: () => set({ visible: false }),
}));
