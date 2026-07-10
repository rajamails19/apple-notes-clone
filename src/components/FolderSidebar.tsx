'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useContextMenu } from '@/store/useContextMenu';
import { useToast } from '@/store/useToast';
import { Folder, VIRTUAL_FOLDER_ALL, VIRTUAL_FOLDER_TRASH } from '@/types';

export default function FolderSidebar({ mobile, onSelectFolder }: { mobile?: boolean; onSelectFolder?: (id: string) => void } = {}) {
  const { folders, selectedFolderId, setSelectedFolder, addFolder, updateFolder, removeFolder, trashCount } = useStore();
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editValue, setEditValue]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { show: showCtx } = useContextMenu();
  const showToast = useToast((s) => s.showToast);

  useEffect(() => { if (editingId && inputRef.current) inputRef.current.focus(); }, [editingId]);

  async function createFolder() {
    try {
      const res = await fetch('/api/folders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Folder' }),
      });
      if (!res.ok) throw new Error(await res.text());
      const folder = await res.json();
      addFolder(folder);
      setEditingId(folder.id);
      setEditValue(folder.name);
    } catch (error) {
      console.error(error);
      showToast('Could not create a new folder.', 'error');
    }
  }

  async function renameFolder(id: string) {
    if (!editValue.trim()) { setEditingId(null); return; }
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editValue }),
      });
      if (!res.ok) throw new Error(await res.text());
      updateFolder(await res.json());
      setEditingId(null);
      // Stay on this folder so user can start adding notes immediately
      useStore.getState().setSelectedFolder(id);
    } catch (error) {
      console.error(error);
      showToast('Could not rename this folder.', 'error');
    }
  }

  async function deleteFolder(id: string) {
    const folder = folders.find((f) => f.id === id);
    const count = folder?.noteCount ?? 0;
    const ok = window.confirm(
      count > 0
        ? `Delete "${folder?.name ?? 'this folder'}" and its ${count} note${count === 1 ? '' : 's'}? This cannot be undone.`
        : `Delete "${folder?.name ?? 'this folder'}"? This cannot be undone.`
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      removeFolder(id);
      showToast('Folder deleted.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Could not delete this folder.', 'error');
    }
  }

  function handleRightClick(e: React.MouseEvent, folder: Folder) {
    e.preventDefault();
    showCtx(e.clientX, e.clientY, [
      {
        label: 'New Note', icon: '✏️',
        action: async () => {
          try {
            setSelectedFolder(folder.id);
            const { addNote, incrementFolderCount } = useStore.getState();
            const res = await fetch('/api/notes', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ folderId: folder.id }),
            });
            if (!res.ok) throw new Error(await res.text());
            const note = await res.json();
            addNote(note);
            incrementFolderCount(folder.id);
            useStore.getState().setSelectedNote(note.id);
          } catch (error) {
            console.error(error);
            showToast('Could not create a new note.', 'error');
          }
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
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'visible', padding: '2px 6px 8px', display: 'flex', flexDirection: 'column' }}>

        {/* ── All Notes virtual row ── */}
        {(() => {
          const totalNotes = folders.reduce((sum, f) => sum + (f.noteCount ?? 0), 0);
          const sel = selectedFolderId === VIRTUAL_FOLDER_ALL;
          return (
            <div
              onClick={() => { setSelectedFolder(VIRTUAL_FOLDER_ALL); onSelectFolder?.(VIRTUAL_FOLDER_ALL); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: mobile ? '11px 10px' : '5px 8px',
                minHeight: mobile ? 44 : 32,
                borderRadius: 7, cursor: 'pointer', userSelect: 'none',
                background: sel ? 'var(--accent)' : 'transparent',
                color: sel ? 'white' : 'var(--text-primary)',
              }}
              onMouseEnter={(e) => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {/* Grid / all notes icon */}
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style={{ opacity: 0.75, flexShrink: 0 }}>
                <path fillRule="evenodd" d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25zM4.25 3.5a.75.75 0 00-.75.75V9.5h13V4.25a.75.75 0 00-.75-.75H4.25zM16.5 11h-5.25v5.5h4.5a.75.75 0 00.75-.75V11zm-6.75 5.5V11H3.5v4.75c0 .414.336.75.75.75h5.5z" />
              </svg>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                All Notes
              </span>
              <span style={{ fontSize: 11, opacity: 0.5, minWidth: 14, textAlign: 'right' }}>{totalNotes}</span>
            </div>
          );
        })()}

        {/* ── Divider ── */}
        <div style={{ height: 1, background: 'var(--border-light)', margin: '2px 4px 4px' }} />

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
        {/* ── Recently Deleted virtual row — right after folders ── */}
        {(() => {
          const sel = selectedFolderId === VIRTUAL_FOLDER_TRASH;
          return (
            <div
              onClick={() => { setSelectedFolder(VIRTUAL_FOLDER_TRASH); onSelectFolder?.(VIRTUAL_FOLDER_TRASH); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: mobile ? '11px 10px' : '5px 8px',
                minHeight: mobile ? 44 : 32,
                borderRadius: 7, cursor: 'pointer', userSelect: 'none',
                background: sel ? 'rgba(229,62,62,0.18)' : 'transparent',
                color: sel ? '#e53e3e' : 'var(--text-muted)',
                marginTop: 2,
              }}
              onMouseEnter={(e) => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'rgba(229,62,62,0.07)'; }}
              onMouseLeave={(e) => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" style={{ opacity: 0.7, flexShrink: 0 }}>
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" />
              </svg>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Recently Deleted
              </span>
              {trashCount > 0 && (
                <span style={{ fontSize: 11, opacity: 0.6, minWidth: 14, textAlign: 'right' }}>{trashCount}</span>
              )}
            </div>
          );
        })()}

        {/* Spacer pushes brand card to bottom */}
        <div style={{ flex: 1 }} />

        <BrandCard />
      </div>
    </div>
  );
}

const CARD_W = 150;

function PhotoAvatar({ size }: { size: number }) {
  const [hovered, setHovered] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState({ left: 0, bottom: 0 });

  const onHoverStart = useCallback(() => {
    if (avatarRef.current) {
      const r = avatarRef.current.getBoundingClientRect();
      // Align card left edge with avatar left edge, but clamp so it never goes off-screen
      const rawLeft = r.left;
      const clamped = Math.min(rawLeft, window.innerWidth - CARD_W - 12);
      setCardPos({ left: Math.max(8, clamped), bottom: window.innerHeight - r.top + 10 });
    }
    setHovered(true);
  }, []);

  return (
    <>
      <motion.div
        ref={avatarRef}
        style={{
          position: 'relative', width: size, height: size,
          borderRadius: '50%', padding: 3,
          background: 'linear-gradient(135deg, #f6a623 0%, #e8402a 50%, #c040b0 100%)',
          cursor: 'pointer', flexShrink: 0,
        }}
        animate={hovered
          ? { scale: 1.12, filter: 'drop-shadow(0 0 12px rgba(246,166,35,0.65))' }
          : { scale: 1,    filter: 'drop-shadow(0 0 0px rgba(246,166,35,0))' }
        }
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        onHoverStart={onHoverStart}
        onHoverEnd={() => setHovered(false)}
      >
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', position: 'relative' }}>
          <img src="/raja.jpeg" alt="Raja"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.32)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="white">
                  <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span style={{ fontSize: 7, fontWeight: 800, color: 'white', letterSpacing: '0.15em', textTransform: 'uppercase' }}>View</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Fixed-position card — always fully visible regardless of sidebar width */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 10 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.88, y: 10 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              position: 'fixed',
              left: cardPos.left,
              bottom: cardPos.bottom,
              width: CARD_W,
              borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.40)',
              border: '1px solid rgba(255,255,255,0.12)',
              zIndex: 9999,
            }}
          >
            <img src="/raja.jpeg" alt="Raja preview"
              style={{ width: '100%', height: 160, objectFit: 'cover', objectPosition: 'top', display: 'block' }} />
            <div style={{ background: '#1a1a1a', padding: '8px 12px 10px' }}>
              <p style={{ margin: 0, color: 'white', fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>Raja Sekhar</p>
              <p style={{ margin: '2px 0 0', color: '#f6a623', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Founder &amp; Entrepreneur
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function BrandCard() {
  const [collapsed, setCollapsed] = useState(false);

  // ── Collapsed: just a small pill with photo + name ──────────────────────────
  if (collapsed) {
    return (
      <div
        onClick={() => setCollapsed(false)}
        title="Expand"
        style={{
          margin: '8px 4px 8px',
          borderRadius: 40,
          background: 'linear-gradient(135deg, rgba(232,160,32,0.12) 0%, rgba(232,100,60,0.10) 100%)',
          border: '1px solid rgba(232,160,32,0.25)',
          padding: '5px 10px 5px 5px',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', userSelect: 'none',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
      >
        <PhotoAvatar size={26} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
          NOTES-APP <span style={{ color: '#e8402a' }}>♥</span> Raja
        </span>
        {/* Expand chevron */}
        <svg style={{ marginLeft: 'auto' }} width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" color="var(--text-muted)">
          <path d="M5 8l5-5 5 5" />
        </svg>
      </div>
    );
  }

  // ── Expanded card ────────────────────────────────────────────────────────────
  return (
    <div style={{
      margin: '8px 4px 8px',
      borderRadius: 16,
      background: 'linear-gradient(150deg, rgba(246,166,35,0.13) 0%, rgba(232,64,42,0.09) 60%, rgba(192,64,176,0.07) 100%)',
      border: '1px solid rgba(232,160,32,0.25)',
      padding: '14px 14px 12px',
      userSelect: 'none',
      position: 'relative',
    }}>
      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(true)}
        title="Minimize"
        style={{
          position: 'absolute', top: 8, right: 8,
          width: 20, height: 20, borderRadius: '50%',
          border: 'none', background: 'rgba(0,0,0,0.07)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.13)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.07)'; }}
      >
        <svg width="9" height="9" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5 5-5" />
        </svg>
      </button>

      {/* Photo — centred, large, hoverable */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <PhotoAvatar size={68} />
      </div>

      {/* App badge */}
      <p style={{
        margin: '0 0 4px', textAlign: 'center',
        fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--accent)',
      }}>
        ✦ NOTES-APP
      </p>

      {/* Credit */}
      <p style={{
        margin: '0 0 8px', textAlign: 'center',
        fontSize: 13, fontWeight: 700,
        color: 'var(--text-primary)', lineHeight: 1.3,
      }}>
        Made with <span style={{ color: '#e8402a', fontSize: 14 }}>♥</span> by Raja
      </p>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(232,160,32,0.18)', margin: '0 0 8px' }} />

      {/* Tagline */}
      <p style={{
        margin: 0, textAlign: 'center',
        fontSize: 11, lineHeight: 1.5,
        color: 'var(--text-muted)',
      }}>
        Your thoughts, beautifully<br />organized — fast &amp; always in sync.
      </p>
    </div>
  );
}
