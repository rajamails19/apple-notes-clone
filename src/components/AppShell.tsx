'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import MenuBar from './MenuBar';
import TopBar from './TopBar';
import FolderSidebar from './FolderSidebar';
import NotesSidebar from './NotesSidebar';
import NoteEditor from './Editor';
import ContextMenu from './ContextMenu';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { createClient } from '@/lib/supabase/client';

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
    setTrashCount,
  } = useStore();

  const [isGuest, setIsGuest] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsGuest(data.user?.is_anonymous === true);
    });
  }, []);

  useRealtimeSync();

  const [folderW, setFolderW] = useState(220);
  const [notesW,  setNotesW]  = useState(300);
  const isInitialLoad = useRef(true);
  const dragging = useRef<null | 'folder' | 'notes'>(null);
  const startX   = useRef(0);
  const startW   = useRef(0);

  // Mobile: which panel is currently shown — restore last panel if a note was open
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(() => {
    if (typeof window === 'undefined') return 'folders';
    return (localStorage.getItem('last-mobile-panel') as MobilePanel) ?? 'folders';
  });
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

  // Load folders on mount + trash count
  useEffect(() => {
    fetch('/api/folders')
      .then((r) => r.json())
      .then((data: typeof folders) => {
        setFolders(data);
        if (data.length > 0) {
          const lastFolderId = localStorage.getItem('last-folder-id');
          const restored = lastFolderId ? data.find((f) => f.id === lastFolderId) : null;
          useStore.getState().setSelectedFolder(restored ? restored.id : data[0].id);
        }
      });
    // Fetch initial trash count
    fetch('/api/notes?folderId=__recently_deleted__')
      .then((r) => r.json())
      .then((data: unknown[]) => setTrashCount(Array.isArray(data) ? data.length : 0));
  }, []);

  // Load notes when folder changes
  const loadNotes = useCallback(async (folderId: string) => {
    const raw = await fetch(`/api/notes?folderId=${folderId}`).then((r) => r.json());
    const ns: typeof notes = Array.isArray(raw) ? raw : [];
    setNotes(ns);
    if (ns.length > 0) {
      // On first load, restore last-opened note; after that always pick first
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        const lastNoteId = localStorage.getItem('last-note-id');
        const restored = lastNoteId ? ns.find((n) => n.id === lastNoteId) : null;
        setSelectedNote(restored ? restored.id : ns[0].id);
      } else {
        setSelectedNote(ns[0].id);
      }
    } else {
      setSelectedNote(null);
    }
  }, [setNotes, setSelectedNote]);

  useEffect(() => {
    if (selectedFolderId) loadNotes(selectedFolderId);
    else setNotes([]);
  }, [selectedFolderId]);

  // Persist last-opened folder + note + mobile panel whenever they change
  useEffect(() => {
    localStorage.setItem('last-mobile-panel', mobilePanel);
  }, [mobilePanel]);
  const { selectedNoteId } = useStore();
  useEffect(() => {
    if (selectedFolderId) localStorage.setItem('last-folder-id', selectedFolderId);
  }, [selectedFolderId]);
  useEffect(() => {
    if (selectedNoteId) localStorage.setItem('last-note-id', selectedNoteId);
  }, [selectedNoteId]);

  // On mobile: selecting a folder → go to notes panel
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
        const { selectedNoteId: nid, notes: ns, trashNote, selectedFolderId: sfid } = useStore.getState();
        if (!nid) return;
        const n = ns.find((x) => x.id === nid);
        if (!n) return;
        // If already in trash, permanently delete; otherwise soft-delete
        if (sfid === '__recently_deleted__') {
          await fetch(`/api/notes/${nid}?permanent=true`, { method: 'DELETE' });
          useStore.getState().restoreNote(nid); // removes from trash view
          useStore.getState().setTrashCount(Math.max(0, useStore.getState().trashCount - 1));
        } else {
          await fetch(`/api/notes/${nid}`, { method: 'DELETE' });
          trashNote(nid);
        }
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
  const selectedNote   = Array.isArray(notes) ? notes.find((n) => n.id === useStore.getState().selectedNoteId) : undefined;

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

  // ─── Guest banner ──────────────────────────────────────────────────────────
  const guestBanner = isGuest ? (
    <div style={{
      background: '#fef3c7', borderBottom: '1px solid #fcd34d',
      padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontSize: 12, color: '#92400e', flexShrink: 0,
    }}>
      <span>✏️ Guest mode — notes will be lost when you end this session</span>
      <button
        onClick={() => { window.location.href = '/login?mode=signin'; }}
        style={{
          background: '#92400e', color: 'white', border: 'none',
          borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Sign in to save
      </button>
    </div>
  ) : null;

  // ─── Desktop layout ────────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <>
        <div
          id="app-shell"
          style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-editor)' }}
        >
          <MenuBar />
          {guestBanner}

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
      </>
    );
  }

  // ─── Mobile layout ─────────────────────────────────────────────────────────
  return (
    <>
      <div
        id="app-shell"
        style={{ display: 'flex', flexDirection: 'column', height: '100dvh', minHeight: 0, overflow: 'clip', background: 'var(--bg-editor)' }}
      >
        {/* Mobile nav bar */}
        {mobileNavBar}
        {guestBanner}

        {/* Panels — one visible at a time */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'clip', position: 'relative' }}>
          {/* Folders panel */}
          <div style={{
            position: 'absolute', inset: 0,
            display: mobilePanel === 'folders' ? 'flex' : 'none',
            flexDirection: 'column', minHeight: 0, overflow: 'clip',
          }}>
            <FolderSidebar onSelectFolder={(id) => { handleFolderSelect(id); }} mobile />
          </div>

          {/* Notes panel */}
          <div style={{
            position: 'absolute', inset: 0,
            display: mobilePanel === 'notes' ? 'flex' : 'none',
            flexDirection: 'column', minHeight: 0, overflow: 'clip',
          }}>
            <NotesSidebar onSelectNote={(id) => { handleNoteSelect(id); }} mobile />
          </div>

          {/* Editor panel — always mounted so TipTap registers in useEditorStore */}
          <div style={{
            position: 'absolute', inset: 0,
            display: mobilePanel === 'editor' ? 'flex' : 'none',
            flexDirection: 'column', minHeight: 0, overflowX: 'hidden', overflowY: 'clip',
          }}>
            {/* TopBar inside editor panel so it renders after editor mounts */}
            <TopBar mobile />
            <NoteEditor mobile />
          </div>
        </div>
      </div>
      <ContextMenu />
    </>
  );
}
