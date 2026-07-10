'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useTheme } from './ThemeProvider';
import { useEditorStore } from '@/store/useEditorStore';
import { useToast } from '@/store/useToast';

interface MenuItem {
  label?: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  danger?: boolean;
}

function MenuDropdown({ label, items, open, onOpen, onClose }: {
  label: string; items: MenuItem[];
  open: boolean; onOpen: () => void; onClose: () => void;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => (open ? onClose() : onOpen())}
        style={{
          padding: '2px 10px', fontSize: 13, borderRadius: 5, border: 'none',
          background: open ? '#3a82d0' : 'transparent',
          color: open ? 'white' : 'var(--text-primary)',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.15)'; }}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        {label}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 2,
          minWidth: 210, zIndex: 300,
          background: 'var(--bg-menu)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          padding: '4px 0',
        }}>
          {items.map((item, i) =>
            item.separator ? (
              <div key={i} style={{ borderTop: '1px solid var(--border)', margin: '3px 0' }} />
            ) : (
              <button
                key={i}
                onClick={() => { item.action?.(); onClose(); }}
                style={{
                  width: 'calc(100% - 8px)', textAlign: 'left',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 16px', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                  color: item.danger ? '#ef4444' : 'var(--text-primary)',
                  borderRadius: 5, margin: '0 4px',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#3a82d0'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = item.danger ? '#ef4444' : 'var(--text-primary)'; }}
              >
                <span>{item.label}</span>
                {item.shortcut && <span style={{ opacity: 0.5, fontSize: 11, marginLeft: 24 }}>{item.shortcut}</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { setTheme } = useTheme();
  const showToast = useToast((s) => s.showToast);
  const getEditor = () => useEditorStore.getState().editor;
  const {
    selectedFolderId, selectedNoteId, notes,
    addNote, removeNote, addFolder, removeFolder,
    toggleFolderSidebar, toggleNotesSidebar,
    incrementFolderCount, decrementFolderCount,
  } = useStore();

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  async function newNote() {
    if (!selectedFolderId) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: selectedFolderId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const note = await res.json();
      addNote(note);
      incrementFolderCount(selectedFolderId);
      useStore.getState().setSelectedNote(note.id);
    } catch (error) {
      console.error(error);
      showToast('Could not create a new note.', 'error');
    }
  }

  async function newFolder() {
    try {
      const res = await fetch('/api/folders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Folder' }),
      });
      if (!res.ok) throw new Error(await res.text());
      const folder = await res.json();
      addFolder(folder);
    } catch (error) {
      console.error(error);
      showToast('Could not create a new folder.', 'error');
    }
  }

  async function deleteNote() {
    if (!selectedNoteId) return;
    const note = notes.find((n) => n.id === selectedNoteId);
    try {
      const res = await fetch(`/api/notes/${selectedNoteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      if (note) decrementFolderCount(note.folderId);
      removeNote(selectedNoteId);
    } catch (error) {
      console.error(error);
      showToast('Could not delete this note.', 'error');
    }
  }

  async function deleteFolder() {
    if (!selectedFolderId) return;
    const ok = window.confirm('Delete this folder and all notes inside it? This cannot be undone.');
    if (!ok) return;
    try {
      const res = await fetch(`/api/folders/${selectedFolderId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      removeFolder(selectedFolderId);
    } catch (error) {
      console.error(error);
      showToast('Could not delete this folder.', 'error');
    }
  }

  const ed = getEditor();

  const menus: { label: string; items: MenuItem[] }[] = [
    {
      label: 'File', items: [
        { label: 'New Note',    shortcut: '⌘N',   action: newNote },
        { label: 'New Folder',  shortcut: '⌘⇧N',  action: newFolder },
        { separator: true },
        { label: 'Delete Note',   action: deleteNote,   danger: true },
        { label: 'Delete Folder', action: deleteFolder, danger: true },
      ],
    },
    {
      label: 'Edit', items: [
        { label: 'Undo',       shortcut: '⌘Z',   action: () => ed?.commands.undo() },
        { label: 'Redo',       shortcut: '⌘⇧Z',  action: () => ed?.commands.redo() },
        { separator: true },
        { label: 'Cut',        shortcut: '⌘X',   action: () => document.execCommand('cut') },
        { label: 'Copy',       shortcut: '⌘C',   action: () => document.execCommand('copy') },
        { label: 'Paste',      shortcut: '⌘V',   action: () => document.execCommand('paste') },
        { separator: true },
        { label: 'Select All', shortcut: '⌘A',   action: () => ed?.commands.selectAll() },
        { separator: true },
        { label: 'Duplicate Note', shortcut: '⌘D', action: async () => {
          if (!selectedNoteId) return;
          const note = notes.find((n) => n.id === selectedNoteId);
          if (!note) return;
          try {
            const res = await fetch('/api/notes', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ folderId: note.folderId, title: `${note.title} — Copy`, content: note.content }),
            });
            if (!res.ok) throw new Error(await res.text());
            const dup = await res.json();
            addNote(dup);
            incrementFolderCount(note.folderId);
            useStore.getState().setSelectedNote(dup.id);
          } catch (error) {
            console.error(error);
            showToast('Could not duplicate this note.', 'error');
          }
        }},
      ],
    },
    {
      label: 'Format', items: [
        { label: 'Bold',       shortcut: '⌘B',  action: () => ed?.chain().focus().toggleBold().run() },
        { label: 'Italic',     shortcut: '⌘I',  action: () => ed?.chain().focus().toggleItalic().run() },
        { label: 'Underline',  shortcut: '⌘U',  action: () => ed?.chain().focus().toggleUnderline().run() },
        { separator: true },
        { label: 'Heading 1',  action: () => ed?.chain().focus().toggleHeading({ level: 1 }).run() },
        { label: 'Heading 2',  action: () => ed?.chain().focus().toggleHeading({ level: 2 }).run() },
        { separator: true },
        { label: 'Bullet List',   action: () => ed?.chain().focus().toggleBulletList().run() },
        { label: 'Numbered List', action: () => ed?.chain().focus().toggleOrderedList().run() },
        { separator: true },
        { label: 'Highlight', action: () => ed?.chain().focus().toggleHighlight().run() },
      ],
    },
    {
      label: 'View', items: [
        { label: 'Toggle Folder Sidebar', shortcut: '⌘⌥S', action: toggleFolderSidebar },
        { label: 'Toggle Notes Sidebar',  shortcut: '⌘⌥N', action: toggleNotesSidebar },
        { separator: true },
        { label: '☀️  Light Mode', action: () => setTheme('light') },
        { label: '🌙  Dark Mode',  action: () => setTheme('dark') },
      ],
    },
    {
      label: 'Help', items: [
        { label: 'About Notes', action: () => alert('Notes & Folders App\nNext.js · TipTap · Supabase') },
      ],
    },
  ];

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 2,
        padding: '3px 8px',
        background: 'var(--bg-menu)',
        borderBottom: '1px solid var(--border)',
        userSelect: 'none', flexShrink: 0,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {menus.map((menu) => (
        <MenuDropdown
          key={menu.label}
          label={menu.label}
          items={menu.items}
          open={openMenu === menu.label}
          onOpen={() => setOpenMenu(menu.label)}
          onClose={() => setOpenMenu(null)}
        />
      ))}
    </div>
  );
}
