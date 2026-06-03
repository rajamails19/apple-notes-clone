'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { EditorProvider } from '@/contexts/EditorContext';
import MenuBar from './MenuBar';
import TopBar from './TopBar';
import FolderSidebar from './FolderSidebar';
import NotesSidebar from './NotesSidebar';
import NoteEditor from './Editor';
import ContextMenu from './ContextMenu';

const MIN_FOLDER = 160;
const MIN_NOTES  = 200;
const MAX_FOLDER = 420;
const MAX_NOTES  = 600;

function loadW(key: string, def: number) {
  if (typeof window === 'undefined') return def;
  const v = parseInt(localStorage.getItem(key) ?? '', 10);
  return isNaN(v) ? def : v;
}

export default function AppShell() {
  const {
    setFolders, setNotes, selectedFolderId,
    showFolderSidebar, showNotesSidebar,
    addNote, setSelectedNote,
    incrementFolderCount, decrementFolderCount,
    notes, folders,
  } = useStore();

  const [folderW, setFolderW] = useState(220);
  const [notesW,  setNotesW]  = useState(300);
  const dragging = useRef<null | 'folder' | 'notes'>(null);
  const startX   = useRef(0);
  const startW   = useRef(0);

  // Hydrate widths from localStorage after mount
  useEffect(() => {
    setFolderW(loadW('pane-folder', 220));
    setNotesW(loadW('pane-notes', 300));
  }, []);

  // Load folders on mount
  useEffect(() => {
    fetch('/api/folders')
      .then((r) => r.json())
      .then((data: typeof folders) => {
        setFolders(data);
        if (data.length > 0) useStore.getState().setSelectedFolder(data[0].id);
      });
  }, []);

  // Load notes when folder changes
  const loadNotes = useCallback(async (folderId: string) => {
    const ns = await fetch(`/api/notes?folderId=${folderId}`).then((r) => r.json());
    setNotes(ns);
    if (ns.length > 0) setSelectedNote(ns[0].id);
    else setSelectedNote(null);
  }, [setNotes, setSelectedNote]);

  useEffect(() => {
    if (selectedFolderId) loadNotes(selectedFolderId);
    else setNotes([]);
  }, [selectedFolderId]);

  // Global keyboard shortcuts
  useEffect(() => {
    async function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      // ⌘N — new note
      if (meta && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        const fid = useStore.getState().selectedFolderId;
        if (!fid) return;
        const note = await fetch('/api/notes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: fid }),
        }).then((r) => r.json());
        addNote(note);
        incrementFolderCount(fid);
        setSelectedNote(note.id);
      }

      // ⌘⇧N — new folder
      if (meta && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        const folder = await fetch('/api/folders', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'New Folder' }),
        }).then((r) => r.json());
        useStore.getState().addFolder(folder);
      }

      // ⌘D — duplicate note
      if (meta && e.key === 'd') {
        e.preventDefault();
        const { selectedNoteId, notes: ns, addNote: an, incrementFolderCount: inc } = useStore.getState();
        const note = ns.find((n) => n.id === selectedNoteId);
        if (!note) return;
        const dup = await fetch('/api/notes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: note.folderId, title: `${note.title} — Copy`, content: note.content }),
        }).then((r) => r.json());
        an(dup);
        inc(note.folderId);
        setSelectedNote(dup.id);
      }

      // ⌘F — focus search
      if (meta && e.key === 'f') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder="Search"]')?.focus();
      }

      // ⌘S — no-op (auto-save)
      if (meta && e.key === 's') e.preventDefault();

      // Delete key — delete selected note (only when editor not focused)
      if (e.key === 'Delete' && !meta) {
        const active = document.activeElement;
        if (active?.closest('.ProseMirror') || active?.tagName === 'INPUT') return;
        const { selectedNoteId: nid, notes: ns, removeNote, decrementFolderCount: dec } = useStore.getState();
        if (!nid) return;
        const n = ns.find((x) => x.id === nid);
        if (!n) return;
        await fetch(`/api/notes/${nid}`, { method: 'DELETE' });
        dec(n.folderId);
        removeNote(nid);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Panel drag
  const onMouseDownDrag = (pane: 'folder' | 'notes') => (e: React.MouseEvent) => {
    dragging.current = pane;
    startX.current   = e.clientX;
    startW.current   = pane === 'folder' ? folderW : notesW;
    document.body.style.cursor      = 'col-resize';
    document.body.style.userSelect  = 'none';
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      if (dragging.current === 'folder') {
        const w = Math.max(MIN_FOLDER, Math.min(startW.current + delta, MAX_FOLDER));
        setFolderW(w); localStorage.setItem('pane-folder', String(w));
      } else {
        const w = Math.max(MIN_NOTES, Math.min(startW.current + delta, MAX_NOTES));
        setNotesW(w); localStorage.setItem('pane-notes', String(w));
      }
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = null;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
  }, []);

  return (
    <EditorProvider>
      <div
        id="app-shell"
        style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-editor)' }}
      >
        <MenuBar />
        <TopBar />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {showFolderSidebar && (
            <>
              <div style={{ width: folderW, flexShrink: 0, overflow: 'hidden' }}>
                <FolderSidebar />
              </div>
              <div className="resize-handle" onMouseDown={onMouseDownDrag('folder')} />
            </>
          )}

          {showNotesSidebar && (
            <>
              <div style={{ width: notesW, flexShrink: 0, overflow: 'hidden' }}>
                <NotesSidebar />
              </div>
              <div className="resize-handle" onMouseDown={onMouseDownDrag('notes')} />
            </>
          )}

          <NoteEditor />
        </div>
      </div>

      {/* Global context menu portal */}
      <ContextMenu />
    </EditorProvider>
  );
}
