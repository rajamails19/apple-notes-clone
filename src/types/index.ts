export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  noteCount?: number;
}

export interface Note {
  id: string;
  folderId: string;
  title: string;
  content: string;
  pinned: number; // 0 | 1
  trashed: number; // 0 | 1
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const VIRTUAL_FOLDER_ALL      = '__all__';
export const VIRTUAL_FOLDER_TRASH    = '__recently_deleted__';

export interface Image {
  id: string;
  noteId: string;
  filename: string;
  url: string;
}

export type ViewMode = 'list' | 'gallery';

// --- Future extension points (not yet implemented) ---
// export interface Tag { id: string; name: string; color: string; }
// export interface Archive { noteId: string; archivedAt: string; }
// export interface Trash { noteId: string; deletedAt: string; expiresAt: string; }
// export interface CloudSync { provider: string; lastSynced: string; }
