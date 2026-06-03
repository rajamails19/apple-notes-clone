'use client';

import { useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useTheme } from './ThemeProvider';
import { useEditorContext } from '@/contexts/EditorContext';
import { FONT_SIZES, DEFAULT_SIZE, getNextSize, parsePxSize } from '@/extensions/FontSize';
import { ViewMode } from '@/types';
import SyncStatus from './SyncStatus';
import UserMenu from './auth/UserMenu';

// ─── Small primitives ────────────────────────────────────────────────────────

function Sep() {
  return (
    <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
  );
}

function TBtn({
  onClick, active, disabled, title, children, danger,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  title: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
      title={title}
      disabled={disabled}
      style={{
        padding: '4px 8px',
        borderRadius: 6,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 4,
        background: active ? 'rgba(232,160,32,0.2)' : 'transparent',
        color: disabled
          ? 'var(--text-faint)'
          : active
            ? 'var(--accent)'
            : danger
              ? '#ef4444'
              : 'var(--text-secondary)',
        transition: 'background 0.1s',
        opacity: disabled ? 0.45 : 1,
        minWidth: 28,
      }}
      onMouseEnter={(e) => { if (!disabled && !active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ─── ViewToggle ───────────────────────────────────────────────────────────────

function ViewToggle() {
  const { viewMode, setViewMode } = useStore();
  const btn = (mode: ViewMode, icon: React.ReactNode, label: string) => (
    <button
      title={label}
      onMouseDown={(e) => { e.preventDefault(); setViewMode(mode); }}
      style={{
        padding: '3px 8px', border: 'none', cursor: 'pointer',
        background: viewMode === mode ? 'var(--bg-selected)' : 'transparent',
        color: viewMode === mode ? 'var(--accent)' : 'var(--text-muted)',
        borderRadius: 5, fontSize: 13,
        display: 'flex', alignItems: 'center',
      }}
    >
      {icon}
    </button>
  );

  return (
    <div style={{ display: 'flex', borderRadius: 7, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {btn('list',
        <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5A.75.75 0 012.75 9h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 9.75zm0 5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" />
        </svg>,
        'List View'
      )}
      {btn('gallery',
        <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm6.5-9A2.25 2.25 0 008.5 4.25v2.5A2.25 2.25 0 0010.75 9h2.5A2.25 2.25 0 0015.5 6.75v-2.5A2.25 2.25 0 0013.25 2h-2.5zm0 9a2.25 2.25 0 00-2.25 2.25v2.5A2.25 2.25 0 0010.75 18h2.5a2.25 2.25 0 002.25-2.25v-2.5A2.25 2.25 0 0013.25 11h-2.5z" />
        </svg>,
        'Gallery View'
      )}
    </div>
  );
}

// ─── FontSizeControl ─────────────────────────────────────────────────────────

function FontSizeControl({ editor }: { editor: ReturnType<typeof useEditorContext>['editorRef']['current'] }) {
  const raw = editor?.getAttributes('textStyle')?.fontSize as string | null | undefined;
  const cur = parsePxSize(raw);
  const displaySize = cur ?? DEFAULT_SIZE;

  const changeSize = useCallback((dir: 1 | -1) => {
    if (!editor) return;
    editor.chain().focus().setFontSize(`${getNextSize(cur, dir)}px`).run();
  }, [editor, cur]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <TBtn title="Decrease Font Size" onClick={() => changeSize(-1)} disabled={!editor}>
        <span style={{ fontSize: 11, fontWeight: 600 }}>A</span>
        <span style={{ fontSize: 9, lineHeight: 1 }}>−</span>
      </TBtn>

      <select
        value={FONT_SIZES.includes(displaySize) ? displaySize : ''}
        onChange={(e) => {
          if (!editor) return;
          editor.chain().focus().setFontSize(`${e.target.value}px`).run();
        }}
        disabled={!editor}
        title="Font Size"
        style={{
          width: 50, padding: '2px 2px 2px 8px',
          border: '1px solid var(--border)',
          borderRadius: 5,
          background: 'var(--bg-editor)',
          color: 'var(--text-primary)',
          fontSize: 12, cursor: 'pointer',
          appearance: 'none', textAlign: 'center',
          opacity: editor ? 1 : 0.45,
        }}
      >
        {!FONT_SIZES.includes(displaySize) && <option value="">{displaySize}</option>}
        {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <TBtn title="Increase Font Size" onClick={() => changeSize(1)} disabled={!editor}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>A</span>
        <span style={{ fontSize: 9, lineHeight: 1 }}>+</span>
      </TBtn>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export default function TopBar() {
  const {
    selectedFolderId, selectedNoteId, notes,
    addNote, removeNote, incrementFolderCount, decrementFolderCount,
  } = useStore();
  const { theme, setTheme } = useTheme();
  const { editorRef } = useEditorContext();
  const editor = editorRef.current;

  async function newNote() {
    if (!selectedFolderId) return;
    const res = await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: selectedFolderId }),
    });
    const note = await res.json();
    addNote(note);
    incrementFolderCount(selectedFolderId);
    useStore.getState().setSelectedNote(note.id);
  }

  async function deleteNote() {
    if (!selectedNoteId) return;
    const note = notes.find((n) => n.id === selectedNoteId);
    await fetch(`/api/notes/${selectedNoteId}`, { method: 'DELETE' });
    if (note) decrementFolderCount(note.folderId);
    removeNote(selectedNoteId);
  }

  const noFolder = !selectedFolderId;
  const noNote   = !selectedNoteId;

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '5px 12px', gap: 6,
      background: 'var(--bg-toolbar)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0, flexWrap: 'nowrap',
      minHeight: 42,
    }}>
      {/* Left — view mode */}
      <ViewToggle />

      <Sep />

      {/* Center — note actions */}
      <TBtn title="Delete Note" onClick={deleteNote} disabled={noNote} danger>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" />
        </svg>
        <span style={{ fontSize: 12 }}>Delete</span>
      </TBtn>

      <TBtn title="New Note (⌘N)" onClick={newNote} disabled={noFolder}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
        <span style={{ fontSize: 12 }}>New Note</span>
      </TBtn>

      <Sep />

      {/* Right — formatting */}
      <FontSizeControl editor={editor} />

      <Sep />

      <TBtn title="Bold (⌘B)" active={editor?.isActive('bold')} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()}>
        <strong style={{ fontSize: 13 }}>B</strong>
      </TBtn>
      <TBtn title="Italic (⌘I)" active={editor?.isActive('italic')} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()}>
        <em style={{ fontSize: 13 }}>I</em>
      </TBtn>
      <TBtn title="Underline (⌘U)" active={editor?.isActive('underline')} disabled={!editor} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
        <span style={{ textDecoration: 'underline', fontSize: 13 }}>U</span>
      </TBtn>

      <Sep />

      <TBtn title="Heading 1" active={editor?.isActive('heading', { level: 1 })} disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
        <span style={{ fontSize: 11, fontWeight: 700 }}>H1</span>
      </TBtn>
      <TBtn title="Heading 2" active={editor?.isActive('heading', { level: 2 })} disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
        <span style={{ fontSize: 11, fontWeight: 600 }}>H2</span>
      </TBtn>

      <Sep />

      <TBtn title="Bullet List" active={editor?.isActive('bulletList')} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75zM1.99 4.75a1 1 0 011-1H3a1 1 0 110 2h-.01a1 1 0 01-1-1zM1.99 10a1 1 0 011-1H3a1 1 0 110 2h-.01a1 1 0 01-1-1zM1.99 15.25a1 1 0 011-1H3a1 1 0 110 2h-.01a1 1 0 01-1-1z" />
        </svg>
      </TBtn>
      <TBtn title="Numbered List" active={editor?.isActive('orderedList')} disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75z" />
          <path d="M2 3.5A.5.5 0 012.5 3h.5a.5.5 0 010 1H3v1h.5a.5.5 0 010 1H2.5A.5.5 0 012 5.5V3.5zM2 9a.5.5 0 01.5-.5H3a.5.5 0 000-1H2.5a.5.5 0 010-1H3a1 1 0 110 2 1 1 0 110 2H2.5a.5.5 0 010-1H3zM2.5 14a.5.5 0 000 1H3a.5.5 0 000-1H2.5z" />
        </svg>
      </TBtn>

      <Sep />

      <TBtn title="Highlight" active={editor?.isActive('highlight')} disabled={!editor} onClick={() => editor?.chain().focus().toggleHighlight().run()}>
        <span style={{ fontSize: 12, background: '#fde047', padding: '1px 3px', borderRadius: 2, color: '#333' }}>H</span>
      </TBtn>

      {/* Image insert */}
      <label title="Insert Image" style={{ cursor: editor ? 'pointer' : 'default', opacity: editor ? 1 : 0.45 }}>
        <input
          type="file" accept="image/*" style={{ display: 'none' }}
          disabled={!editor || !selectedNoteId}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file || !selectedNoteId || !editor) return;
            const fd = new FormData();
            fd.append('file', file);
            fd.append('noteId', selectedNoteId);
            fetch('/api/images', { method: 'POST', body: fd })
              .then((r) => r.json())
              .then((d) => { if (d.url) editor.chain().focus().insertContent({ type: 'image', attrs: { src: d.url } }).run(); });
            e.target.value = '';
          }}
        />
        <TBtn title="Insert Image" disabled={!editor || !selectedNoteId} onClick={() => {}}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        </TBtn>
      </label>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      <SyncStatus />

      {/* Theme toggle */}
      <button
        title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 16, padding: '4px 6px', borderRadius: 6,
          color: 'var(--text-muted)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>

      <UserMenu />
    </div>
  );
}
