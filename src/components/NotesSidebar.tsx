'use client';

import { useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useContextMenu } from '@/store/useContextMenu';
import { Note } from '@/types';
import GalleryNotes from './GalleryNotes';

function formatDate(iso: string) {
  const d = new Date(iso), now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function NotesSidebar() {
  const {
    notes, selectedFolderId, selectedNoteId, searchQuery, folders, viewMode,
    setSelectedNote, setSearchQuery, addNote, removeNote,
    incrementFolderCount, decrementFolderCount, pinNote, moveNote,
  } = useStore();

  const { show: showCtx } = useContextMenu();
  const searchRef = useRef<HTMLInputElement>(null);
  const folder = folders.find((f) => f.id === selectedFolderId);

  const filtered = notes.filter((n) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q) || stripHtml(n.content).toLowerCase().includes(q);
  });

  // Split into pinned / regular for list view
  const pinnedNotes  = filtered.filter((n) => n.pinned);
  const regularNotes = filtered.filter((n) => !n.pinned);

  async function createNote() {
    if (!selectedFolderId) return;
    const res = await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: selectedFolderId }),
    });
    const note = await res.json();
    addNote(note);
    incrementFolderCount(selectedFolderId);
    setSelectedNote(note.id);
  }

  async function handleDeleteNote(note: Note) {
    await fetch(`/api/notes/${note.id}`, { method: 'DELETE' });
    decrementFolderCount(note.folderId);
    removeNote(note.id);
  }

  async function handleDuplicate(note: Note) {
    const res = await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: note.folderId, title: `${note.title} — Copy`, content: note.content }),
    });
    const dup = await res.json();
    addNote(dup);
    incrementFolderCount(note.folderId);
    setSelectedNote(dup.id);
  }

  async function handlePin(note: Note) {
    const next = !note.pinned;
    await fetch(`/api/notes/${note.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: next ? 1 : 0 }),
    });
    pinNote(note.id, next);
  }

  async function handleMove(note: Note, toFolderId: string) {
    await fetch(`/api/notes/${note.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: toFolderId }),
    });
    moveNote(note.id, toFolderId);
  }

  function buildNoteCtxMenu(note: Note) {
    const otherFolders = folders.filter((f) => f.id !== note.folderId);
    showCtx(0, 0, []); // will be overridden by onContextMenu below
    return [
      { label: 'New Note', icon: '✏️', action: createNote },
      {
        label: note.pinned ? 'Unpin Note' : 'Pin Note',
        icon: '📌',
        action: () => handlePin(note),
      },
      { separator: true },
      { label: 'Duplicate Note', icon: '⧉', shortcut: '⌘D', action: () => handleDuplicate(note) },
      {
        label: 'Move To',
        icon: '→',
        submenu: otherFolders.length
          ? otherFolders.map((f) => ({ label: f.name, action: () => handleMove(note, f.id) }))
          : [{ label: 'No other folders', disabled: true }],
      },
      { separator: true },
      { label: 'Delete', icon: '🗑', danger: true, action: () => handleDeleteNote(note) },
    ];
  }

  function onNoteCtxMenu(e: React.MouseEvent, note: Note) {
    e.preventDefault();
    const items = buildNoteCtxMenu(note);
    showCtx(e.clientX, e.clientY, items);
  }

  // ── Empty states ─────────────────────────────────────────────────────────

  const EmptyState = ({ icon, title, sub }: { icon: string; title: string; sub?: string }) => (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-faint)', gap: 8, padding: 24,
    }}>
      <span style={{ fontSize: 36, opacity: 0.4 }}>{icon}</span>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', textAlign: 'center' }}>{title}</p>
      {sub && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center' }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-notes)', borderRight: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {folder?.name ?? 'Notes'}
          </h2>
          <button
            onClick={createNote}
            disabled={!selectedFolderId}
            title="New Note (⌘N)"
            style={{
              width: 26, height: 26, borderRadius: '50%', border: 'none',
              background: 'transparent', color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: selectedFolderId ? 1 : 0.3,
            }}
            onMouseEnter={(e) => { if (selectedFolderId) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" />
          </svg>
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            data-no-ctx
            style={{
              width: '100%', paddingLeft: 26, paddingRight: searchQuery ? 26 : 10,
              paddingTop: 5, paddingBottom: 5,
              borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-hover)', color: 'var(--text-primary)',
              fontSize: 13, outline: 'none', fontFamily: 'inherit',
              transition: 'background 0.1s',
            }}
            onFocus={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-editor)'; }}
            onBlur={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                background: 'var(--text-faint)', color: 'white', border: 'none',
                width: 16, height: 16, borderRadius: '50%', cursor: 'pointer',
                fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!selectedFolderId ? (
          <EmptyState icon="📁" title="Select a folder" sub="Choose a folder from the left to see your notes" />
        ) : filtered.length === 0 ? (
          searchQuery
            ? <EmptyState icon="🔍" title="No results" sub={`Nothing matched "${searchQuery}"`} />
            : <EmptyState icon="📝" title="No notes yet" sub="Press ⌘N or tap + to create your first note" />
        ) : viewMode === 'gallery' ? (
          <GalleryNotes
            notes={filtered}
            selectedId={selectedNoteId}
            onSelect={setSelectedNote}
            onContextMenu={onNoteCtxMenu}
          />
        ) : (
          <>
            {/* Pinned section */}
            {pinnedNotes.length > 0 && (
              <>
                <SectionLabel label="Pinned" />
                {pinnedNotes.map((note) => (
                  <NoteRow key={note.id} note={note} selected={note.id === selectedNoteId}
                    onSelect={() => setSelectedNote(note.id)}
                    onContextMenu={(e) => onNoteCtxMenu(e, note)}
                    onDelete={() => handleDeleteNote(note)}
                  />
                ))}
                {regularNotes.length > 0 && <SectionLabel label="Notes" />}
              </>
            )}

            {/* Regular notes */}
            {regularNotes.map((note) => (
              <NoteRow key={note.id} note={note} selected={note.id === selectedNoteId}
                onSelect={() => setSelectedNote(note.id)}
                onContextMenu={(e) => onNoteCtxMenu(e, note)}
                onDelete={() => handleDeleteNote(note)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.07em',
      padding: '8px 14px 3px',
    }}>
      {label}
    </div>
  );
}

function NoteRow({ note, selected, onSelect, onContextMenu, onDelete }: {
  note: Note; selected: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDelete: () => void;
}) {
  const preview = stripHtml(note.content).slice(0, 80);

  return (
    <div
      onClick={onSelect}
      onContextMenu={onContextMenu}
      style={{
        position: 'relative', padding: '10px 14px',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border-light)',
        background: selected ? 'var(--bg-selected)' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
        const btn = e.currentTarget.querySelector<HTMLElement>('.del-btn');
        if (btn) btn.style.display = 'flex';
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent';
        const btn = e.currentTarget.querySelector<HTMLElement>('.del-btn');
        if (btn) btn.style.display = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {note.pinned ? <span style={{ marginRight: 3 }}>📌</span> : null}
          {note.title || 'New Note'}
        </p>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>{formatDate(note.updatedAt)}</span>
      </div>
      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {preview || 'No additional text'}
      </p>
      <button
        className="del-btn"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete"
        style={{
          display: 'none', position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          width: 18, height: 18, borderRadius: '50%', border: 'none',
          background: '#bbb', color: 'white', cursor: 'pointer',
          alignItems: 'center', justifyContent: 'center', fontSize: 12, lineHeight: 1,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#ef4444'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#bbb'; }}
      >
        ×
      </button>
    </div>
  );
}
