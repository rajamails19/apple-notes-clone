'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Folder } from '@/types';

export default function FolderSidebar() {
  const { folders, selectedFolderId, setSelectedFolder, addFolder, updateFolder, removeFolder } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folder: Folder } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingId && inputRef.current) inputRef.current.focus(); }, [editingId]);
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

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
    setContextMenu(null);
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-folder)', borderRight: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Folders
        </span>
        <button
          onClick={createFolder}
          title="New Folder"
          style={{
            width: 22, height: 22, borderRadius: 5, border: 'none',
            background: 'transparent', color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, lineHeight: 1,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          +
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 6px 8px' }}>
        {folders.map((folder) => {
          const selected = folder.id === selectedFolderId;
          return (
            <div
              key={folder.id}
              onClick={() => { if (editingId !== folder.id) setSelectedFolder(folder.id); }}
              onDoubleClick={() => { setEditingId(folder.id); setEditValue(folder.name); }}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, folder }); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                userSelect: 'none',
                background: selected ? 'var(--accent)' : 'transparent',
                color: selected ? 'white' : 'var(--text-primary)',
                marginBottom: 1,
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
                  style={{
                    flex: 1, minWidth: 0,
                    background: 'white', color: '#333',
                    border: 'none', outline: 'none',
                    borderRadius: 3, padding: '0 3px',
                    fontSize: 13,
                  }}
                />
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {folder.name}
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.6 }}>{folder.noteCount ?? 0}</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed', zIndex: 100,
            left: contextMenu.x, top: contextMenu.y,
            background: 'white', border: '1px solid #ddd',
            borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: '4px 0', minWidth: 160,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setEditingId(contextMenu.folder.id); setEditValue(contextMenu.folder.name); setContextMenu(null); }}
            style={{ width: '100%', textAlign: 'left', padding: '6px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f5f5f5'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
          >
            Rename Folder
          </button>
          <div style={{ borderTop: '1px solid #eee', margin: '3px 0' }} />
          <button
            onClick={() => deleteFolder(contextMenu.folder.id)}
            style={{ width: '100%', textAlign: 'left', padding: '6px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
          >
            Delete Folder
          </button>
        </div>
      )}
    </div>
  );
}
