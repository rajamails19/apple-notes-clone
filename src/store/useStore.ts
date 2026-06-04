import { create } from 'zustand';
import { Folder, Note, ViewMode } from '@/types';

interface AppState {
  // Data
  folders: Folder[];
  notes: Note[];
  trashCount: number;

  // Selection
  selectedFolderId: string | null;
  selectedNoteId: string | null;

  // UI state
  searchQuery: string;
  showFolderSidebar: boolean;
  showNotesSidebar: boolean;
  viewMode: ViewMode;

  // ── Setters ───────────────────────────────────────
  setFolders: (f: Folder[]) => void;
  setNotes: (n: Note[]) => void;
  setTrashCount: (n: number) => void;
  setSelectedFolder: (id: string | null) => void;
  setSelectedNote: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setViewMode: (m: ViewMode) => void;
  toggleFolderSidebar: () => void;
  toggleNotesSidebar: () => void;

  // ── Folder mutations ──────────────────────────────
  addFolder: (f: Folder) => void;
  updateFolder: (f: Folder) => void;
  removeFolder: (id: string) => void;
  incrementFolderCount: (folderId: string) => void;
  decrementFolderCount: (folderId: string) => void;

  // ── Note mutations ────────────────────────────────
  addNote: (n: Note) => void;
  updateNote: (n: Partial<Note> & { id: string }) => void;
  removeNote: (id: string) => void;
  pinNote: (id: string, pinned: boolean) => void;
  moveNote: (noteId: string, toFolderId: string) => void;
  trashNote: (id: string) => void;
  restoreNote: (id: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  folders: [],
  notes: [],
  trashCount: 0,
  selectedFolderId: null,
  selectedNoteId: null,
  searchQuery: '',
  showFolderSidebar: true,
  showNotesSidebar: true,
  viewMode: 'list',

  setFolders:         (folders)    => set({ folders }),
  setNotes:           (notes)      => set({ notes }),
  setTrashCount:      (trashCount) => set({ trashCount }),
  setSelectedFolder:  (id)         => set({ selectedFolderId: id, selectedNoteId: null, searchQuery: '' }),
  setSelectedNote:    (id)         => set({ selectedNoteId: id }),
  setSearchQuery:     (searchQuery)=> set({ searchQuery }),
  setViewMode:        (viewMode)   => set({ viewMode }),
  toggleFolderSidebar:()           => set((s) => ({ showFolderSidebar: !s.showFolderSidebar })),
  toggleNotesSidebar: ()           => set((s) => ({ showNotesSidebar: !s.showNotesSidebar })),

  // Folders
  addFolder:    (folder) => set((s) => ({ folders: [...s.folders, folder] })),
  updateFolder: (folder) => set((s) => ({ folders: s.folders.map((f) => f.id === folder.id ? { ...f, ...folder } : f) })),
  removeFolder: (id)     => set((s) => ({
    folders: s.folders.filter((f) => f.id !== id),
    selectedFolderId: s.selectedFolderId === id ? null : s.selectedFolderId,
  })),
  incrementFolderCount: (folderId) => set((s) => ({
    folders: s.folders.map((f) => f.id === folderId ? { ...f, noteCount: (f.noteCount ?? 0) + 1 } : f),
  })),
  decrementFolderCount: (folderId) => set((s) => ({
    folders: s.folders.map((f) => f.id === folderId ? { ...f, noteCount: Math.max(0, (f.noteCount ?? 0) - 1) } : f),
  })),

  // Notes
  addNote: (note) => set((s) => {
    // Pinned notes go to top, otherwise prepend
    const rest = s.notes;
    const newList = note.pinned ? [note, ...rest] : [note, ...rest];
    return { notes: newList };
  }),
  updateNote: (note) => set((s) => ({
    notes: s.notes.map((n) => n.id === note.id ? { ...n, ...note } : n),
  })),
  removeNote: (id) => set((s) => ({
    notes: s.notes.filter((n) => n.id !== id),
    selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
  })),

  pinNote: (id, pinned) => set((s) => {
    // Re-sort: pinned notes to top
    const updated = s.notes.map((n) => n.id === id ? { ...n, pinned: pinned ? 1 : 0 } : n);
    const pinnedNotes = updated.filter((n) => n.pinned);
    const unpinned    = updated.filter((n) => !n.pinned);
    return { notes: [...pinnedNotes, ...unpinned] };
  }),

  trashNote: (id) => {
    const { notes, selectedFolderId } = get();
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
      trashCount: s.trashCount + 1,
      folders: s.folders.map((f) =>
        f.id === note.folderId ? { ...f, noteCount: Math.max(0, (f.noteCount ?? 0) - 1) } : f
      ),
    }));
  },

  restoreNote: (id) => {
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
      trashCount: Math.max(0, s.trashCount - 1),
    }));
  },

  moveNote: (noteId, toFolderId) => {
    const { notes, selectedFolderId } = get();
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    const fromFolderId = note.folderId;
    set((s) => ({
      // Remove from current view if moving out of selected folder
      notes: selectedFolderId === fromFolderId
        ? s.notes.filter((n) => n.id !== noteId)
        : s.notes.map((n) => n.id === noteId ? { ...n, folderId: toFolderId } : n),
      selectedNoteId: s.selectedNoteId === noteId && selectedFolderId === fromFolderId
        ? null
        : s.selectedNoteId,
      folders: s.folders.map((f) => {
        if (f.id === fromFolderId) return { ...f, noteCount: Math.max(0, (f.noteCount ?? 0) - 1) };
        if (f.id === toFolderId)   return { ...f, noteCount: (f.noteCount ?? 0) + 1 };
        return f;
      }),
    }));
  },
}));
