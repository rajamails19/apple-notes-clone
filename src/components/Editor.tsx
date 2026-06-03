'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { ResizableImage } from '@/extensions/ResizableImage';
import { useStore } from '@/store/useStore';
import Toolbar from './Toolbar';

export default function NoteEditor() {
  const { notes, selectedNoteId, updateNote } = useStore();
  const note = notes.find((n) => n.id === selectedNoteId) ?? null;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNoteId = useRef<string | null>(null);

  const schedSave = useCallback((id: string, content: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      updateNote({ id, content, updatedAt: new Date().toISOString() });
    }, 500);
  }, [updateNote]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false, underline: false }),
      Underline,
      TextStyle,
      FontSize,
      Highlight.configure({ multicolor: false }),
      ResizableImage,
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: note?.content ?? '',
    editorProps: {
      attributes: { class: 'ProseMirror' },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length || !note?.id) return false;
        for (const file of Array.from(files)) {
          if (!file.type.startsWith('image/')) continue;
          event.preventDefault();
          uploadAndInsert(file, note.id, view);
          return true;
        }
        return false;
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items || !note?.id) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (!file) continue;
            event.preventDefault();
            uploadAndInsert(file, note.id, view);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (note?.id) schedSave(note.id, editor.getHTML());
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function uploadAndInsert(file: File, noteId: string, view: any) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('noteId', noteId);
    const res = await fetch('/api/images', { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.url || !view) return;
    const node = view.state.schema.nodes.image.create({ src: data.url });
    view.dispatch(view.state.tr.replaceSelectionWith(node));
  }

  async function uploadImage(file: File, noteId: string): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('noteId', noteId);
    const res = await fetch('/api/images', { method: 'POST', body: fd });
    const data = await res.json();
    return data.url ?? '';
  }

  function handleImageInsert(file: File) {
    if (!note?.id || !editor) return;
    uploadImage(file, note.id).then((url) => {
      if (url) editor.chain().focus().insertContent({ type: 'image', attrs: { src: url } }).run();
    });
  }

  // Sync content when switching notes
  useEffect(() => {
    if (!editor || !note) return;
    if (lastNoteId.current === note.id) return;
    lastNoteId.current = note.id;
    // Use setTimeout to avoid React batching issues
    setTimeout(() => {
      editor.commands.setContent(note.content || '');
    }, 0);
  }, [note?.id]);

  async function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    if (!note) return;
    updateNote({ id: note.id, title });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      updateNote({ id: note.id, updatedAt: new Date().toISOString() });
    }, 500);
  }

  if (!note) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-editor)', color: 'var(--text-faint)',
      }}>
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.8} opacity={0.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p style={{ marginTop: 12, fontSize: 13 }}>Select a note or create a new one</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-editor)', overflow: 'hidden' }}>
      <Toolbar editor={editor} noteId={note.id} onImageInsert={handleImageInsert} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 48 }}>
        <div style={{ padding: '28px 48px 12px' }}>
          <input
            value={note.title}
            onChange={handleTitleChange}
            placeholder="Title"
            style={{
              width: '100%',
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--text-primary)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <div style={{ padding: '0 48px' }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
