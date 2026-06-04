'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useContextMenu } from '@/store/useContextMenu';
import { Folder } from '@/types';

export default function FolderSidebar({ mobile, onSelectFolder }: { mobile?: boolean; onSelectFolder?: (id: string) => void } = {}) {
  const { folders, selectedFolderId, setSelectedFolder, addFolder, updateFolder, removeFolder } = useStore();
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editValue, setEditValue]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { show: showCtx } = useContextMenu();

  useEffect(() => { if (editingId && inputRef.current) inputRef.current.focus(); }, [editingId]);

  async function createFolder() {
    const res = await fetch('/api/folders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Folder' }),
    });
    const folder = await res.json();
    addFolder(folder);
    setEditingId(folder.id);
    setEditValue(folder.name);
  }

  async function renameFolder(id: string) {
    if (!editValue.trim()) { setEditingId(null); return; }
    const res = await fetch(`/api/folders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editValue }),
    });
    updateFolder(await res.json());
    setEditingId(null);
  }

  async function deleteFolder(id: string) {
    await fetch(`/api/folders/${id}`, { method: 'DELETE' });
    removeFolder(id);
  }

  function handleRightClick(e: React.MouseEvent, folder: Folder) {
    e.preventDefault();
    showCtx(e.clientX, e.clientY, [
      {
        label: 'New Note', icon: '✏️',
        action: async () => {
          setSelectedFolder(folder.id);
          const { addNote, incrementFolderCount } = useStore.getState();
          const res = await fetch('/api/notes', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderId: folder.id }),
          });
          const note = await res.json();
          addNote(note);
          incrementFolderCount(folder.id);
          useStore.getState().setSelectedNote(note.id);
        },
      },
      {
        label: 'New Folder', icon: '📁',
        action: createFolder,
      },
      { separator: true },
      {
        label: 'Rename Folder', icon: '✏️',
        action: () => { setEditingId(folder.id); setEditValue(folder.name); },
      },
      { separator: true },
      {
        label: 'Delete Folder', icon: '🗑', danger: true,
        action: () => deleteFolder(folder.id),
      },
    ]);
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-folder)', borderRight: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 12px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
          Folders
        </span>
        <button
          onClick={createFolder}
          title="New Folder (⌘⇧N)"
          style={{
            width: 20, height: 20, borderRadius: 5, border: 'none',
            background: 'transparent', color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </button>
      </div>

      {/* Folder list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 6px 8px', display: 'flex', flexDirection: 'column' }}>
        {folders.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', marginTop: 24 }}>No folders yet</p>
        )}
        {folders.map((folder) => {
          const selected = folder.id === selectedFolderId;
          return (
            <div
              key={folder.id}
              onClick={() => { if (editingId !== folder.id) { setSelectedFolder(folder.id); onSelectFolder?.(folder.id); } }}
              onDoubleClick={() => { setEditingId(folder.id); setEditValue(folder.name); }}
              onContextMenu={(e) => handleRightClick(e, folder)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: mobile ? '11px 10px' : '5px 8px',
                minHeight: mobile ? 44 : 32,
                borderRadius: 7, cursor: 'pointer',
                userSelect: 'none', marginBottom: 0,
                background: selected ? 'var(--accent)' : 'transparent',
                color: selected ? 'white' : 'var(--text-primary)',
              }}
              onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.75, flexShrink: 0 }}>
                <path d="M1.5 3A1.5 1.5 0 000 4.5v8A1.5 1.5 0 001.5 14h13a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0014.5 4h-5.793l-1-1H1.5z" />
              </svg>

              {editingId === folder.id ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => renameFolder(folder.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') renameFolder(folder.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  data-no-ctx
                  style={{
                    flex: 1, minWidth: 0, background: 'white', color: '#333',
                    border: 'none', outline: 'none', borderRadius: 3,
                    padding: '0 3px', fontSize: 13,
                  }}
                />
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {folder.name}
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.5, minWidth: 14, textAlign: 'right' }}>
                    {folder.noteCount ?? 0}
                  </span>
                </>
              )}
            </div>
          );
        })}
        {/* Spacer pushes card to bottom */}
        <div style={{ flex: 1 }} />
        <BrandCard />
      </div>
    </div>
  );
}

function BrandCard() {
  return (
    <div style={{
      margin: '12px 4px 8px',
      borderRadius: 14,
      background: 'linear-gradient(135deg, rgba(232,160,32,0.10) 0%, rgba(232,100,60,0.08) 100%)',
      border: '1px solid rgba(232,160,32,0.20)',
      padding: '12px 12px 10px',
      userSelect: 'none',
    }}>
      {/* Avatar + title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        {/* Gradient avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #f6a623 0%, #e8402a 50%, #c040b0 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(232,160,32,0.35)',
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>R</span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1 }}>
            Noteva
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>
            Made with <span style={{ color: '#e8402a' }}>♥</span> by Raja
          </p>
        </div>
      </div>

      {/* Tagline */}
      <p style={{
        margin: 0, fontSize: 10.5, lineHeight: 1.4,
        color: 'var(--text-muted)',
      }}>
        Your thoughts, beautifully organized — fast, private & always in sync.
      </p>
    </div>
  );
}
