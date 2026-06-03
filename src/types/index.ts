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
  createdAt: string;
  updatedAt: string;
}

export interface Image {
  id: string;
  noteId: string;
  filename: string;
  url: string;
}
