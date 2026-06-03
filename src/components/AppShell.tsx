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
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

const MIN_FOLDER = 160;
const MIN_NOTES  = 200;
const MAX_FOLDER = 420;
const MAX_NOTES  = 600;

function loadW(key: string, def: number) {
  if (typeof window === 'undefined') return def;
  const v = parseInt(localStorage.getItem(key) ?? '', 10);
  return isNaN(v) ? def : v;
}

// ─── Mobile nav state ─────────────────────────────────────────────────────────
// 'folders' | 'notes' | 'editor'
type MobilePanel = 'folders' | 'notes' | 'editor';

// ─── Back arrow SVG ───────────────────────────────────────────────────────────
function BackArrow() {
  return (
    <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1L1.5 7.5L8 14" />
    </svg>
  );
}

// ─── Hamburger SVG ────────────────────────────────────────────────────────────
function Hamburger() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="0" y1="1" x2="18" y2="1" />
      <line x1="0" y1="7" x2="18" y2="7" />
      <line x1="0" y1="13" x2="18" y2="13" />
    </svg>
  );
}

export default function AppShell() {
  const {
    setFolders, setNotes, selectedFolderId,
    showFolderSidebar, showNotesSidebar,
    addNote, setSelectedNote,
    incrementFolderCount, decrementFolderCount,
    notes, folders,
  } = useStore();

  useRealtimeSync();

  const [folderW, setFolderW] = useState(220);
  const [notesW,  setNotesW]  = useState(300);
  const dragging = useRef<null | 'folder' | 'notes'>(null);
  const startX   = useRef(0);
  const startW   = useRef(0);

  // Mobile: which panel is currently shown
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('folders');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  // On mobile: selecting a folder → go to notes panel
  const originalSetSelectedFolder = useStore.getState().setSelectedFolder;
  const handleFolderSelect = useCallback((id: string) => {
    useStore.getState().setSelectedFolder(id);
    if (isMobile) setMobilePanel('notes');
  }, [isMobile]);

  // On mobile: selecting a note → go to editor panel
  const handleNoteSelect = useCallback((id: string) => {
    useStore.getState().setSelectedNote(id);
    if (isMobile) setMobilePanel('editor');
  }, [isMobile]);

  // On mobile: new note → go to editor
  const handleNewNote = useCallback(async () => {
    const fid = useStore.getState().selectedFolderId;
    if (!fid) return;
    const note = await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: fid }),
    }).then((r) => r.json());
    addNote(note);
    incrementFolderCount(fid);
    setSelectedNote(note.id);
    if (isMobile) setMobilePanel('editor');
  }, [isMobile, addNote, incrementFolderCount, setSelectedNote]);

  // Global keyboard shortcuts
  useEffect(() => {
    async function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && !e.shiftKey && e.key === 'n') {
        e.preventDefault();
        await handleNewNote();
      }
      if (meta && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        const folder = await fetch('/api/folders', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'New Folder' }),
        }).then((r) => r.json());
        useStore.getState().addFolder(folder);
      }
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
      if (meta && e.key === 'f') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder="Search"]')?.focus();
      }
      if (meta && e.key === 's') e.preventDefault();
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
  }, [handleNewNote]);

  // Panel drag (desktop only)
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

  // ─── Mobile header bar ─────────────────────────────────────────────────────
  const selectedFolder = folders.find((f) => f.id === selectedFolderId);
  const selectedNote   = notes.find((n) => n.id === useStore.getState().selectedNoteId);

  const mobileNavBar = isMobile ? (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '0 8px', height: 48, flexShrink: 0,
      background: 'var(--bg-toolbar)',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Back button */}
      {mobilePanel !== 'folders' && (
        <button
          onClick={() => setMobilePanel(mobilePanel === 'editor' ? 'notes' : 'folders')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--accent)', fontSize: 15, fontWeight: 500,
            padding: '0 6px', minHeight: 44, minWidth: 44,
          }}
        >
          <BackArrow />
          <span>{mobilePanel === 'editor' ? (selectedFolder?.name ?? 'Notes') : 'Folders'}</span>
        </button>
      )}

      {/* Hamburger on folder panel */}
      {mobilePanel === 'folders' && (
        <button
          onClick={() => {}} // no-op; folders IS the root
          style={{
            background: 'none', border: 'none', cursor: 'default',
            color: 'var(--text-muted)', padding: '0 6px', minHeight: 44,
            display: 'flex', alignItems: 'center',
          }}
        >
          <Hamburger />
        </button>
      )}

      {/* Title */}
      <span style={{
        flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 600,
        color: 'var(--text-primary)', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {mobilePanel === 'folders' && 'Folders'}
        {mobilePanel === 'notes'   && (selectedFolder?.name ?? 'Notes')}
        {mobilePanel === 'editor'  && (selectedNote?.title   || 'Note')}
      </span>

      {/* New note button (notes + editor panels) */}
      {mobilePanel !== 'folders' && (
        <button
          onClick={handleNewNote}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--accent)', minHeight: 44, minWidth: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </button>
      )}
    </div>
  ) : null;

  // ─── Desktop layout ────────────────────────────────────────────────────────
  if (!isMobile) {
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
        <ContextMenu />
      </EditorProvider>
    );
  }

  // ─── Mobile layout ─────────────────────────────────────────────────────────
  return (
    <EditorProvider>
      <div
        id="app-shell"
        style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--bg-editor)' }}
      >
        {/* Mobile nav bar replaces MenuBar + TopBar on folders/notes panels */}
        {mobilePanel !== 'editor' ? (
          mobileNavBar
        ) : (
          <>
            {mobileNavBar}
            {/* Scrollable formatting toolbar on editor panel */}
            <TopBar mobile />
          </>
        )}

        {/* Panels — one visible at a time */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Folders panel */}
          <div style={{
            position: 'absolute', inset: 0,
            display: mobilePanel === 'folders' ? 'flex' : 'none',
            flexDirection: 'column', overflow: 'hidden',
          }}>
            <FolderSidebar onSelectFolder={(id) => { handleFolderSelect(id); }} mobile />
          </div>

          {/* Notes panel */}
          <div style={{
            position: 'absolute', inset: 0,
            display: mobilePanel === 'notes' ? 'flex' : 'none',
            flexDirection: 'column', overflow: 'hidden',
          }}>
            <NotesSidebar onSelectNote={(id) => { handleNoteSelect(id); }} mobile />
          </div>

          {/* Editor panel */}
          <div style={{
            position: 'absolute', inset: 0,
            display: mobilePanel === 'editor' ? 'flex' : 'none',
            flexDirection: 'column', overflow: 'hidden',
          }}>
            <NoteEditor />
          </div>
        </div>
      </div>
      <ContextMenu />
    </EditorProvider>
  );
}
