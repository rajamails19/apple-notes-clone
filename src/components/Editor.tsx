'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { ResizableImage } from '@/extensions/ResizableImage';
import EditorToolbar from './EditorToolbar';
import { useStore } from '@/store/useStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useContextMenu } from '@/store/useContextMenu';
import { useSyncStatus } from '@/store/useSyncStatus';

export default function NoteEditor({ mobile }: { mobile?: boolean } = {}) {
  const { notes, selectedNoteId, updateNote } = useStore();
  const note = notes.find((n) => n.id === selectedNoteId) ?? null;
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNoteId  = useRef<string | null>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setEditor = useEditorStore((s) => s.setEditor);
  const editorRef = useRef<import('@tiptap/react').Editor | null>(null);
  const { show: showCtx } = useContextMenu();
  const { setSyncing, setSaved, setError } = useSyncStatus();

  const schedSave = useCallback((id: string, content: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSyncing();
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/notes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        updateNote({ id, content, updatedAt: new Date().toISOString() });
        setSaved();
      } catch {
        setError();
      }
    }, 500);
  }, [updateNote, setSyncing, setSaved, setError]);

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
    onCreate: ({ editor: e }) => { setEditor(e); },
    onDestroy: () => { setEditor(null); },
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

  // Register editor in Zustand store so TopBar can access it reactively
  useEffect(() => {
    editorRef.current = editor;
    setEditor(editor);
    return () => {
      editorRef.current = null;
      setEditor(null);
    };
  }, [editor, setEditor]);

  // Sync content + restore scroll when switching notes
  useEffect(() => {
    if (!editor || !note) return;
    if (lastNoteId.current === note.id) return;
    lastNoteId.current = note.id;
    localStorage.setItem('last-note-id', note.id);
    setTimeout(() => {
      editor.commands.setContent(note.content || '');
      // Restore scroll position after content renders
      setTimeout(() => {
        const el = scrollRef.current;
        if (!el) return;
        const saved = localStorage.getItem(`scroll-${note.id}`);
        if (saved) el.scrollTop = parseInt(saved, 10);
      }, 80);
    }, 0);
  }, [note?.id]);

  // Editor area right-click menu
  function handleEditorContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const ed = editorRef.current;
    showCtx(e.clientX, e.clientY, [
      { label: 'Undo',       icon: '↩', shortcut: '⌘Z',   action: () => ed?.commands.undo() },
      { label: 'Redo',       icon: '↪', shortcut: '⌘⇧Z',  action: () => ed?.commands.redo() },
      { separator: true },
      { label: 'Cut',        shortcut: '⌘X',  action: () => document.execCommand('cut') },
      { label: 'Copy',       shortcut: '⌘C',  action: () => document.execCommand('copy') },
      { label: 'Paste',      shortcut: '⌘V',  action: () => document.execCommand('paste') },
      { separator: true },
      { label: 'Select All', shortcut: '⌘A',  action: () => ed?.commands.selectAll() },
      { separator: true },
      {
        label: 'Insert Image', icon: '🖼',
        disabled: !note?.id,
        action: () => {
          const inp = document.createElement('input');
          inp.type = 'file'; inp.accept = 'image/*';
          inp.onchange = () => {
            const file = inp.files?.[0];
            if (!file || !note?.id) return;
            const fd = new FormData();
            fd.append('file', file); fd.append('noteId', note.id);
            fetch('/api/images', { method: 'POST', body: fd })
              .then((r) => r.json())
              .then((d) => { if (d.url && ed) ed.chain().focus().insertContent({ type: 'image', attrs: { src: d.url } }).run(); });
          };
          inp.click();
        },
      },
      { label: 'Highlight',  icon: '🖊', action: () => ed?.chain().focus().toggleHighlight().run() },
    ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function uploadAndInsert(file: File, noteId: string, view: any) {
    const fd = new FormData();
    fd.append('file', file); fd.append('noteId', noteId);
    const { url } = await fetch('/api/images', { method: 'POST', body: fd }).then((r) => r.json());
    if (!url || !view) return;
    const node = view.state.schema.nodes.image.create({ src: url });
    view.dispatch(view.state.tr.replaceSelectionWith(node));
  }

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
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-editor)' }}>
        {!mobile && <EditorToolbar />}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-faint)',
          gap: 12,
        }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.75} opacity={0.35}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-muted)' }}>No note selected</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-faint)' }}>Choose a note from the list or press ⌘N</p>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-editor)' }}>
      {!mobile && <EditorToolbar />}
      <div
        ref={scrollRef}
        className="editor-scroll"
        style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'auto', paddingBottom: 80, WebkitOverflowScrolling: 'touch', overscrollBehaviorY: 'contain', overscrollBehaviorX: 'auto', touchAction: 'pan-x pan-y pinch-zoom' } as React.CSSProperties}
        onScroll={() => {
          if (!note?.id) return;
          if (scrollTimer.current) clearTimeout(scrollTimer.current);
          scrollTimer.current = setTimeout(() => {
            const el = scrollRef.current;
            if (el) localStorage.setItem(`scroll-${note.id}`, String(el.scrollTop));
          }, 300);
        }}
        onContextMenu={handleEditorContextMenu}
      >
        {/* Title + date */}
        <div style={{ padding: '24px 44px 0' }}>
          <input
            value={note.title}
            onChange={handleTitleChange}
            placeholder="Title"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                // Move focus into the ProseMirror editor body
                const proseMirror = document.querySelector<HTMLElement>('.ProseMirror');
                if (proseMirror) { proseMirror.focus(); }
              }
            }}
            style={{
              width: '100%', fontSize: 22, fontWeight: 700,
              color: 'var(--text-primary)', background: 'transparent',
              border: 'none', outline: 'none', fontFamily: 'inherit',
              lineHeight: '1.2',
            }}
          />
          <p style={{
            margin: '3px 0 12px', fontSize: 11,
            color: 'var(--text-muted)', lineHeight: 1,
            userSelect: 'none',
          }}>
            {new Date(note.updatedAt).toLocaleString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })}
          </p>
        </div>
        {/* Body */}
        <div style={{ padding: '0 44px' }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
