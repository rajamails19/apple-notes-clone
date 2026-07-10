'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import MenuBar from './MenuBar';
import TopBar from './TopBar';
import FolderSidebar from './FolderSidebar';
import NotesSidebar from './NotesSidebar';
import NoteEditor from './Editor';
import ContextMenu from './ContextMenu';
import Toasts from './Toasts';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/store/useToast';

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
    incrementFolderCount,
    notes, folders,
    setTrashCount,
  } = useStore();
  const showToast = useToast((s) => s.showToast);

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

  // Hydrate widths from localStorage after mount to avoid server/client mismatch.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setFolderW(loadW('pane-folder', 220));
      setNotesW(loadW('pane-notes', 300));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Load folders on mount + trash count
  useEffect(() => {
    async function loadInitialData() {
      try {
        const foldersRes = await fetch('/api/folders');
        if (foldersRes.status === 401) {
          showToast('Please sign in or continue as guest to open your notes.', 'error');
          window.location.href = '/login';
          return;
        }
        if (!foldersRes.ok) throw new Error('Unable to load folders.');
        const data = await foldersRes.json() as typeof folders;
        if (!Array.isArray(data)) throw new Error('Folders response was not valid.');
        setFolders(data);
        if (data.length > 0) {
          const lastFolderId = localStorage.getItem('last-folder-id');
          const restored = lastFolderId ? data.find((f) => f.id === lastFolderId) : null;
          useStore.getState().setSelectedFolder(restored ? restored.id : data[0].id);
        }

        const trashRes = await fetch('/api/notes?folderId=__recently_deleted__');
        if (trashRes.status === 401) return;
        if (!trashRes.ok) throw new Error('Unable to load recently deleted notes.');
        const trash = await trashRes.json() as unknown[];
        setTrashCount(Array.isArray(trash) ? trash.length : 0);
      } catch (error) {
        console.error(error);
        showToast('Could not load your notes. Please refresh or sign in again.', 'error');
      }
    }

    loadInitialData();
  }, [setFolders, setTrashCount, showToast]);

  // Load notes when folder changes
  const loadNotes = useCallback(async (folderId: string) => {
    const res = await fetch(`/api/notes?folderId=${folderId}`);
    if (res.status === 401) {
      showToast('Your session expired. Please sign in again.', 'error');
      window.location.href = '/login';
      return;
    }
    if (!res.ok) {
      showToast('Could not load notes for this folder.', 'error');
      return;
    }
    const raw = await res.json();
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
  }, [setNotes, setSelectedNote, showToast]);

  useEffect(() => {
    if (selectedFolderId) loadNotes(selectedFolderId);
    else setNotes([]);
  }, [loadNotes, selectedFolderId, setNotes]);

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
    try {
      const res = await fetch('/api/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: fid }),
      });
      if (!res.ok) throw new Error(await res.text());
      const note = await res.json();
      addNote(note);
      incrementFolderCount(fid);
      setSelectedNote(note.id);
      if (isMobile) setMobilePanel('editor');
    } catch (error) {
      console.error(error);
      showToast('Could not create a new note.', 'error');
    }
  }, [isMobile, addNote, incrementFolderCount, setSelectedNote, showToast]);

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
        try {
          const res = await fetch('/api/folders', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'New Folder' }),
          });
          if (!res.ok) throw new Error(await res.text());
          const folder = await res.json();
          useStore.getState().addFolder(folder);
        } catch (error) {
          console.error(error);
          showToast('Could not create a new folder.', 'error');
        }
      }
      if (meta && e.key === 'd') {
        e.preventDefault();
        const { selectedNoteId, notes: ns, addNote: an, incrementFolderCount: inc } = useStore.getState();
        const note = ns.find((n) => n.id === selectedNoteId);
        if (!note) return;
        try {
          const res = await fetch('/api/notes', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderId: note.folderId, title: `${note.title} — Copy`, content: note.content }),
          });
          if (!res.ok) throw new Error(await res.text());
          const dup = await res.json();
          an(dup);
          inc(note.folderId);
          setSelectedNote(dup.id);
        } catch (error) {
          console.error(error);
          showToast('Could not duplicate this note.', 'error');
        }
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
          const res = await fetch(`/api/notes/${nid}?permanent=true`, { method: 'DELETE' });
          if (!res.ok) throw new Error(await res.text());
          useStore.getState().restoreNote(nid); // removes from trash view
          useStore.getState().setTrashCount(Math.max(0, useStore.getState().trashCount - 1));
        } else {
          const res = await fetch(`/api/notes/${nid}`, { method: 'DELETE' });
          if (!res.ok) throw new Error(await res.text());
          trashNote(nid);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNewNote, setSelectedNote, showToast]);

  /* eslint-disable react-hooks/refs */
  // Panel drag (desktop only)
  const onMouseDownDrag = (pane: 'folder' | 'notes') => (e: React.MouseEvent) => {
    dragging.current = pane;
    startX.current   = e.clientX;
    startW.current   = pane === 'folder' ? folderW : notesW;
    document.body.style.cursor      = 'col-resize';
    document.body.style.userSelect  = 'none';
  };
  /* eslint-enable react-hooks/refs */

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

      {/* Image upload button - editor panel only */}
      {mobilePanel === 'editor' && (
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 36, cursor: 'pointer' }}>
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              const noteId = useStore.getState().selectedNoteId;
              e.target.value = '';
              if (!file || !noteId) return;
              const fd = new FormData();
              fd.append('file', file);
              fd.append('noteId', noteId);
              try {
                const res = await fetch('/api/images', { method: 'POST', body: fd });
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                if (data.url) {
                  window.dispatchEvent(new CustomEvent('mobile-insert-image', { detail: { url: data.url } }));
                }
              } catch (error) {
                console.error(error);
                showToast('Could not upload this image.', 'error');
              }
            }}
          />
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="16" height="12" rx="2" />
            <circle cx="7" cy="8.5" r="1.5" />
            <path d="M2 14l4-4 3 3 3-3 4 4" />
          </svg>
        </label>
      )}

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
        <Toasts />
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
      <Toasts />
    </>
  );
}
