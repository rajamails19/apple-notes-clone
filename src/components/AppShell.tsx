'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import MenuBar from './MenuBar';
import FolderSidebar from './FolderSidebar';
import NotesSidebar from './NotesSidebar';
import NoteEditor from './Editor';

const MIN_FOLDER = 160;
const MIN_NOTES = 220;
const MAX_FOLDER = 400;
const MAX_NOTES = 600;

function loadWidth(key: string, def: number) {
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
    notes,
  } = useStore();

  const [folderW, setFolderW] = useState(220);
  const [notesW, setNotesW] = useState(300);
  const dragging = useRef<null | 'folder' | 'notes'>(null);
  const startX = useRef(0);
  const startW = useRef(0);

  // Hydrate widths from localStorage
  useEffect(() => {
    setFolderW(loadWidth('pane-folder', 220));
    setNotesW(loadWidth('pane-notes', 300));
  }, []);

  // Load folders on mount
  useEffect(() => {
    fetch('/api/folders')
      .then((r) => r.json())
      .then((folders) => {
        setFolders(folders);
        if (folders.length > 0) useStore.getState().setSelectedFolder(folders[0].id);
      });
  }, []);

  // Load notes when folder changes
  const loadNotes = useCallback(async (folderId: string) => {
    const res = await fetch(`/api/notes?folderId=${folderId}`);
    const ns = await res.json();
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
      if (!meta) return;
      if (e.key === 'n') {
        e.preventDefault();
        const folderId = useStore.getState().selectedFolderId;
        if (!folderId) return;
        const res = await fetch('/api/notes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId }),
        });
        const note = await res.json();
        addNote(note);
        incrementFolderCount(folderId);
        setSelectedNote(note.id);
      }
      if (e.key === 's') e.preventDefault(); // auto-save handles it
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Panel drag handlers
  const onMouseDown = (pane: 'folder' | 'notes') => (e: React.MouseEvent) => {
    dragging.current = pane;
    startX.current = e.clientX;
    startW.current = pane === 'folder' ? folderW : notesW;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      if (dragging.current === 'folder') {
        const w = Math.max(MIN_FOLDER, Math.min(startW.current + delta, MAX_FOLDER));
        setFolderW(w);
        localStorage.setItem('pane-folder', String(w));
      } else {
        const w = Math.max(MIN_NOTES, Math.min(startW.current + delta, MAX_NOTES));
        setNotesW(w);
        localStorage.setItem('pane-notes', String(w));
      }
    };
    const onUp = () => {
      dragging.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-editor)' }}>
      <MenuBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {showFolderSidebar && (
          <>
            <div style={{ width: folderW, flexShrink: 0, overflow: 'hidden' }}>
              <FolderSidebar />
            </div>
            <div
              className="resize-handle"
              onMouseDown={onMouseDown('folder')}
              title="Drag to resize"
            />
          </>
        )}

        {showNotesSidebar && (
          <>
            <div style={{ width: notesW, flexShrink: 0, overflow: 'hidden' }}>
              <NotesSidebar />
            </div>
            <div
              className="resize-handle"
              onMouseDown={onMouseDown('notes')}
              title="Drag to resize"
            />
          </>
        )}

        <NoteEditor />
      </div>
    </div>
  );
}
