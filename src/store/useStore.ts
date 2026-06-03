import { create } from 'zustand';
import { Folder, Note } from '@/types';

interface AppState {
  folders: Folder[];
  notes: Note[];
  selectedFolderId: string | null;
  selectedNoteId: string | null;
  searchQuery: string;
  showFolderSidebar: boolean;
  showNotesSidebar: boolean;

  setFolders: (folders: Folder[]) => void;
  setNotes: (notes: Note[]) => void;
  setSelectedFolder: (id: string | null) => void;
  setSelectedNote: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  toggleFolderSidebar: () => void;
  toggleNotesSidebar: () => void;

  addFolder: (folder: Folder) => void;
  updateFolder: (folder: Folder) => void;
  removeFolder: (id: string) => void;

  addNote: (note: Note) => void;
  updateNote: (note: Partial<Note> & { id: string }) => void;
  removeNote: (id: string) => void;
  incrementFolderCount: (folderId: string) => void;
  decrementFolderCount: (folderId: string) => void;
}

export const useStore = create<AppState>((set) => ({
  folders: [],
  notes: [],
  selectedFolderId: null,
  selectedNoteId: null,
  searchQuery: '',
  showFolderSidebar: true,
  showNotesSidebar: true,

  setFolders: (folders) => set({ folders }),
  setNotes: (notes) => set({ notes }),
  setSelectedFolder: (id) => set({ selectedFolderId: id, selectedNoteId: null, searchQuery: '' }),
  setSelectedNote: (id) => set({ selectedNoteId: id }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleFolderSidebar: () => set((s) => ({ showFolderSidebar: !s.showFolderSidebar })),
  toggleNotesSidebar: () => set((s) => ({ showNotesSidebar: !s.showNotesSidebar })),

  addFolder: (folder) => set((s) => ({ folders: [...s.folders, folder] })),
  updateFolder: (folder) => set((s) => ({
    folders: s.folders.map((f) => (f.id === folder.id ? { ...f, ...folder } : f)),
  })),
  removeFolder: (id) => set((s) => ({
    folders: s.folders.filter((f) => f.id !== id),
    selectedFolderId: s.selectedFolderId === id ? null : s.selectedFolderId,
  })),

  addNote: (note) => set((s) => ({ notes: [note, ...s.notes] })),
  updateNote: (note) => set((s) => ({
    notes: s.notes.map((n) => (n.id === note.id ? { ...n, ...note } : n)),
  })),
  removeNote: (id) => set((s) => ({
    notes: s.notes.filter((n) => n.id !== id),
    selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
  })),

  incrementFolderCount: (folderId) => set((s) => ({
    folders: s.folders.map((f) =>
      f.id === folderId ? { ...f, noteCount: (f.noteCount ?? 0) + 1 } : f
    ),
  })),
  decrementFolderCount: (folderId) => set((s) => ({
    folders: s.folders.map((f) =>
      f.id === folderId ? { ...f, noteCount: Math.max(0, (f.noteCount ?? 0) - 1) } : f
    ),
  })),
}));
