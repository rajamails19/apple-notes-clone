'use client';

import { createContext, useContext, useRef, useState, useCallback } from 'react';
import type { Editor } from '@tiptap/react';

interface EditorCtx {
  editorRef: React.MutableRefObject<Editor | null>;
  /** Reactive — triggers re-render in TopBar when editor mounts/unmounts */
  editor: Editor | null;
  setEditor: (e: Editor | null) => void;
}

const EditorContext = createContext<EditorCtx>({
  editorRef: { current: null },
  editor: null,
  setEditor: () => {},
});

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const editorRef = useRef<Editor | null>(null);
  const [editor, setEditorState] = useState<Editor | null>(null);

  const setEditor = useCallback((e: Editor | null) => {
    editorRef.current = e;
    setEditorState(e);
  }, []);

  return (
    <EditorContext.Provider value={{ editorRef, editor, setEditor }}>
      {children}
    </EditorContext.Provider>
  );
}

export const useEditorContext = () => useContext(EditorContext);
