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

export default function NotesSidebar({ mobile, onSelectNote }: { mobile?: boolean; onSelectNote?: (id: string) => void } = {}) {
  const {
    notes, selectedFolderId, selectedNoteId, searchQuery, folders, viewMode,
    setSelectedNote, setSearchQuery, addNote, removeNote,
    incrementFolderCount, decrementFolderCount, pinNote, moveNote,
  } = useStore();

  // Wrap setSelectedNote to also call the mobile callback
  const handleSelect = (id: string) => { setSelectedNote(id); onSelectNote?.(id); };

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
      {/* Header — Apple Notes style: view toggle | spacer | trash | new note */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          padding: '0 8px', height: 44,
          borderBottom: '1px solid var(--border-light)',
        }}>
          {/* View toggle (list / gallery) */}
          {(['list', 'gallery'] as const).map((mode, i) => (
            <button key={mode}
              onMouseDown={(e) => { e.preventDefault(); useStore.getState().setViewMode(mode); }}
              title={mode === 'list' ? 'List View' : 'Gallery View'}
              style={{
                width: 30, height: 30, borderRadius: 6, border: 'none',
                background: viewMode === mode ? 'rgba(128,128,128,0.18)' : 'transparent',
                color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = viewMode === mode ? 'rgba(128,128,128,0.22)' : 'rgba(128,128,128,0.10)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = viewMode === mode ? 'rgba(128,128,128,0.18)' : 'transparent'; }}
            >
              {mode === 'list'
                ? <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5A.75.75 0 012.75 9h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 9.75zm0 5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" /></svg>
                : <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm6.5-9A2.25 2.25 0 008.5 4.25v2.5A2.25 2.25 0 0010.75 9h2.5A2.25 2.25 0 0015.5 6.75v-2.5A2.25 2.25 0 0013.25 2h-2.5zm0 9a2.25 2.25 0 00-2.25 2.25v2.5A2.25 2.25 0 0010.75 18h2.5a2.25 2.25 0 002.25-2.25v-2.5A2.25 2.25 0 0013.25 11h-2.5z" /></svg>
              }
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* Delete selected note */}
          <button
            onClick={async () => {
              const { selectedNoteId: nid, notes: ns, removeNote: rem, decrementFolderCount: dec } = useStore.getState();
              if (!nid) return;
              const n = ns.find((x) => x.id === nid);
              if (!n) return;
              await fetch(`/api/notes/${nid}`, { method: 'DELETE' });
              if (n) dec(n.folderId);
              rem(nid);
            }}
            disabled={!selectedNoteId}
            title="Delete Note"
            style={{
              width: 30, height: 30, borderRadius: 6, border: 'none',
              background: 'transparent',
              color: selectedNoteId ? '#e53e3e' : 'var(--text-faint)',
              cursor: selectedNoteId ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => { if (selectedNoteId) (e.currentTarget as HTMLElement).style.background = 'rgba(229,62,62,0.10)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" />
            </svg>
          </button>

          {/* New note — compose/pencil icon */}
          <button
            onClick={createNote}
            disabled={!selectedFolderId}
            title="New Note (⌘N)"
            style={{
              width: 30, height: 30, borderRadius: 6, border: 'none',
              background: 'transparent',
              color: selectedFolderId ? 'var(--accent)' : 'var(--text-faint)',
              cursor: selectedFolderId ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={(e) => { if (selectedFolderId) (e.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.10)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {/* Pencil / compose icon */}
            <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" />
          </svg>
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            data-no-ctx
            style={{
              width: '100%', paddingLeft: 24, paddingRight: searchQuery ? 24 : 8,
              paddingTop: 4, paddingBottom: 4,
              borderRadius: 7, border: 'none',
              background: 'rgba(0,0,0,0.07)', color: 'var(--text-primary)',
              fontSize: 12, outline: 'none', fontFamily: 'inherit',
              transition: 'background 0.1s',
            }}
            onFocus={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.10)'; }}
            onBlur={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.07)'; }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)',
                background: 'var(--text-faint)', color: 'white', border: 'none',
                width: 14, height: 14, borderRadius: '50%', cursor: 'pointer',
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
            onSelect={handleSelect}
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
                    onSelect={() => handleSelect(note.id)}
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
                onSelect={() => handleSelect(note.id)}
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
      fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.07em',
      padding: '7px 12px 2px',
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
        position: 'relative', padding: '9px 12px 8px',
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
      {/* Row 1: title + date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, lineHeight: '1.3' }}>
          {note.pinned ? <span style={{ marginRight: 3, fontSize: 10 }}>📌</span> : null}
          {note.title || 'New Note'}
        </p>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, lineHeight: '1.3' }}>{formatDate(note.updatedAt)}</span>
      </div>
      {/* Row 2: preview */}
      <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '1.35' }}>
        {preview || <span style={{ color: 'var(--text-faint)' }}>No additional text</span>}
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
