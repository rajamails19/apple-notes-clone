import { create } from 'zustand';
import type { Editor } from '@tiptap/react';

interface EditorStore {
  editor: Editor | null;
  setEditor: (e: Editor | null) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
}));
