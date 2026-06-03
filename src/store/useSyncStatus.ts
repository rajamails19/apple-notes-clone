import { create } from 'zustand';

type SyncState = 'idle' | 'syncing' | 'saved' | 'error';

interface SyncStore {
  state: SyncState;
  lastSaved: Date | null;
  setSyncing: () => void;
  setSaved: () => void;
  setError: () => void;
  setIdle: () => void;
}

export const useSyncStatus = create<SyncStore>((set) => ({
  state: 'idle',
  lastSaved: null,
  setSyncing: () => set({ state: 'syncing' }),
  setSaved: () => set({ state: 'saved', lastSaved: new Date() }),
  setError: () => set({ state: 'error' }),
  setIdle: () => set({ state: 'idle' }),
}));
