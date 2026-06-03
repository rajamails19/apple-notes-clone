'use client';

import { Note } from '@/types';

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function firstImage(html: string): string | null {
  const m = html.match(/src="([^"]+)"/);
  return m ? m[1] : null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Props {
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, note: Note) => void;
}

export default function GalleryNotes({ notes, selectedId, onSelect, onContextMenu }: Props) {
  if (notes.length === 0) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 10,
      padding: '12px 10px',
    }}>
      {notes.map((note) => {
        const thumb   = firstImage(note.content);
        const preview = stripHtml(note.content).slice(0, 100);
        const selected = note.id === selectedId;

        return (
          <div
            key={note.id}
            onClick={() => onSelect(note.id)}
            onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, note); }}
            style={{
              borderRadius: 10,
              border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
              background: selected ? 'var(--bg-selected)' : 'var(--bg-editor)',
              cursor: 'pointer',
              overflow: 'hidden',
              boxShadow: selected ? '0 0 0 2px var(--accent)' : '0 1px 4px rgba(0,0,0,0.06)',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--text-faint)'; }}
            onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
          >
            {/* Thumbnail */}
            {thumb && (
              <div style={{ height: 100, overflow: 'hidden', background: 'var(--bg-hover)' }}>
                <img
                  src={thumb}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}
            {!thumb && (
              <div style={{
                height: 60, background: 'var(--bg-folder)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
            )}

            {/* Text */}
            <div style={{ padding: '8px 10px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, marginBottom: 3 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {note.pinned ? '📌 ' : ''}{note.title || 'Untitled'}
                </p>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{formatDate(note.updatedAt)}</span>
              </div>
              {preview && (
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {preview}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
