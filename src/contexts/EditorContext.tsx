'use client';

import { createContext, useContext, useRef } from 'react';
import type { Editor } from '@tiptap/react';

interface EditorCtx {
  editorRef: React.MutableRefObject<Editor | null>;
}

const EditorContext = createContext<EditorCtx>({ editorRef: { current: null } });

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const editorRef = useRef<Editor | null>(null);
  return <EditorContext.Provider value={{ editorRef }}>{children}</EditorContext.Provider>;
}

export const useEditorContext = () => useContext(EditorContext);
