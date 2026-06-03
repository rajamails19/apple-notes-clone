'use client';

import { useStore } from '@/store/useStore';
import { Note } from '@/types';

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diff < 604800000)
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function NotesSidebar() {
  const {
    notes, selectedFolderId, selectedNoteId, searchQuery,
    setSelectedNote, setSearchQuery, addNote, removeNote,
    folders, incrementFolderCount, decrementFolderCount,
  } = useStore();

  const folder = folders.find((f) => f.id === selectedFolderId);
  const filtered = notes.filter((n) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q) || stripHtml(n.content).toLowerCase().includes(q);
  });

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

  async function deleteNote(note: Note, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/notes/${note.id}`, { method: 'DELETE' });
    decrementFolderCount(note.folderId);
    removeNote(note.id);
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-notes)', borderRight: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
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
          <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" />
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            style={{
              width: '100%', paddingLeft: 26, paddingRight: 10, paddingTop: 5, paddingBottom: 5,
              borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-hover)', color: 'var(--text-primary)',
              fontSize: 13, outline: 'none', fontFamily: 'inherit',
            }}
            onFocus={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-editor)'; }}
            onBlur={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)', gap: 8 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p style={{ fontSize: 12 }}>{searchQuery ? 'No results' : 'No notes'}</p>
          </div>
        ) : (
          filtered.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              selected={note.id === selectedNoteId}
              onSelect={() => setSelectedNote(note.id)}
              onDelete={(e) => deleteNote(note, e)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NoteRow({ note, selected, onSelect, onDelete }: {
  note: Note; selected: boolean;
  onSelect: () => void; onDelete: (e: React.MouseEvent) => void;
}) {
  const preview = stripHtml(note.content).slice(0, 80);

  return (
    <div
      onClick={onSelect}
      style={{
        position: 'relative', padding: '11px 14px',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border-light)',
        background: selected ? 'var(--bg-selected)' : 'transparent',
      }}
      onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; (e.currentTarget.querySelector('.del-btn') as HTMLElement | null)?.style && ((e.currentTarget.querySelector('.del-btn') as HTMLElement).style.display = 'flex'); }}
      onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget.querySelector('.del-btn') as HTMLElement | null)?.style && ((e.currentTarget.querySelector('.del-btn') as HTMLElement).style.display = 'none'); }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {note.title || 'New Note'}
        </p>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>{formatDate(note.updatedAt)}</span>
      </div>
      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {preview || 'No additional text'}
      </p>
      <button
        className="del-btn"
        onClick={onDelete}
        title="Delete"
        style={{
          display: 'none', position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          width: 18, height: 18, borderRadius: '50%', border: 'none',
          background: '#ccc', color: 'white', cursor: 'pointer',
          alignItems: 'center', justifyContent: 'center', fontSize: 12, lineHeight: 1,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#ef4444'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#ccc'; }}
      >
        ×
      </button>
    </div>
  );
}
