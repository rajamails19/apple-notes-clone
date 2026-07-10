'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useTheme } from './ThemeProvider';
import { useEditorStore } from '@/store/useEditorStore';
import { useToast } from '@/store/useToast';
import type { Editor } from '@tiptap/react';
import { FONT_SIZES, DEFAULT_SIZE, parsePxSize } from '@/extensions/FontSize';
import { ViewMode } from '@/types';
import SyncStatus from './SyncStatus';
import UserMenu from './auth/UserMenu';

// ─── Icon-only toolbar button ─────────────────────────────────────────────────
function IBtn({
  onClick, active, disabled, title, children, danger,
}: {
  onClick?: () => void; active?: boolean; disabled?: boolean;
  title: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); if (!disabled && onClick) onClick(); }}
      title={title}
      disabled={disabled}
      style={{
        width: 28, height: 28, padding: 0,
        borderRadius: 6, border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(0,0,0,0.10)' : 'transparent',
        color: disabled
          ? 'var(--text-faint)'
          : danger ? '#e53e3e'
          : active ? 'var(--text-primary)'
          : 'var(--text-secondary)',
        flexShrink: 0,
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = active ? 'rgba(0,0,0,0.13)' : 'rgba(0,0,0,0.07)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = active ? 'rgba(0,0,0,0.10)' : 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ─── Thin separator ───────────────────────────────────────────────────────────
function Sep() {
  return <div style={{ width: 1, height: 14, background: 'var(--border)', flexShrink: 0, margin: '0 3px' }} />;
}

// ─── View toggle ──────────────────────────────────────────────────────────────
function ViewToggle() {
  const { viewMode, setViewMode } = useStore();
  const btn = (mode: ViewMode, icon: React.ReactNode, label: string) => (
    <button
      key={mode} title={label}
      onMouseDown={(e) => { e.preventDefault(); setViewMode(mode); }}
      style={{
        width: 24, height: 22, border: 'none', cursor: 'pointer',
        background: viewMode === mode ? 'rgba(0,0,0,0.10)' : 'transparent',
        color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
        borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.1s',
      }}
    >
      {icon}
    </button>
  );
  return (
    <div style={{
      display: 'flex', gap: 1, padding: '2px',
      borderRadius: 6, background: 'rgba(0,0,0,0.06)',
    }}>
      {btn('list',
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5A.75.75 0 012.75 9h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 9.75zm0 5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" />
        </svg>, 'List View')}
      {btn('gallery',
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm6.5-9A2.25 2.25 0 008.5 4.25v2.5A2.25 2.25 0 0010.75 9h2.5A2.25 2.25 0 0015.5 6.75v-2.5A2.25 2.25 0 0013.25 2h-2.5zm0 9a2.25 2.25 0 00-2.25 2.25v2.5A2.25 2.25 0 0010.75 18h2.5a2.25 2.25 0 002.25-2.25v-2.5A2.25 2.25 0 0013.25 11h-2.5z" />
        </svg>, 'Gallery View')}
    </div>
  );
}

// ─── Aa font-size dropdown ────────────────────────────────────────────────────
const FONT_LABELS: Record<number, string> = {
  10: 'Xtra Small', 12: 'Small', 14: 'Small+',
  15: 'Normal', 16: 'Normal+', 18: 'Large',
  20: 'Large+', 24: 'X-Large', 28: 'XX-Large',
  32: 'Huge', 40: 'Huge+', 48: 'Title',
  64: 'Display', 72: 'Display+', 96: 'Poster',
};

function FontSizeDropdown({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const raw = editor?.getAttributes('textStyle')?.fontSize as string | null | undefined;
  const cur = parsePxSize(raw) ?? DEFAULT_SIZE;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onMouseDown={(e) => { e.preventDefault(); if (editor) setOpen((o) => !o); }}
        disabled={!editor}
        title="Font Size"
        style={{
          height: 28, padding: '0 7px',
          borderRadius: 6, border: 'none',
          cursor: editor ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', gap: 2,
          background: open ? 'rgba(0,0,0,0.10)' : 'transparent',
          color: editor ? 'var(--text-secondary)' : 'var(--text-faint)',
          transition: 'background 0.1s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { if (editor) (e.currentTarget as HTMLElement).style.background = open ? 'rgba(0,0,0,0.13)' : 'rgba(0,0,0,0.07)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = open ? 'rgba(0,0,0,0.10)' : 'transparent'; }}
      >
        {/* "Aa" lettermark */}
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1, fontFamily: '-apple-system,sans-serif' }}>Aa</span>
        {/* Chevron */}
        <svg width="7" height="4" viewBox="0 0 8 5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 1l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)',
          width: 180, zIndex: 300,
          background: 'var(--bg-menu)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: '6px 0',
          overflow: 'hidden',
        }}>
          <p style={{ margin: '0 0 4px', padding: '4px 14px 6px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
            Font Size
          </p>
          {FONT_SIZES.map((size) => {
            const selected = size === cur;
            return (
              <button
                key={size}
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor?.chain().focus().setFontSize(`${size}px`).run();
                  setOpen(false);
                }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '6px 14px',
                  background: selected ? 'rgba(232,160,32,0.12)' : 'none',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  color: selected ? 'var(--accent)' : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                <span style={{ fontSize: 13 }}>{FONT_LABELS[size] ?? size}</span>
                <span style={{ fontSize: 12, color: selected ? 'var(--accent)' : 'var(--text-muted)' }}>{size}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Text style popover (B / I / U / Strike / Highlight) ─────────────────────
function TextStylePopover({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // True if any style is active
  const anyActive = editor && (
    editor.isActive('bold') || editor.isActive('italic') ||
    editor.isActive('underline') || editor.isActive('strike') ||
    editor.isActive('highlight')
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const row = (label: string, isActive: boolean, onToggle: () => void, sampleStyle?: React.CSSProperties) => (
    <button
      key={label}
      onMouseDown={(e) => { e.preventDefault(); onToggle(); }}
      style={{
        width: '100%', padding: '7px 14px',
        background: isActive ? 'rgba(232,160,32,0.12)' : 'none',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: isActive ? 'var(--accent)' : 'var(--text-primary)',
      }}
      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'none'; }}
    >
      <span style={{ fontSize: 13, ...sampleStyle }}>{label}</span>
      {isActive && (
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" />
        </svg>
      )}
    </button>
  );

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <IBtn
        title="Text Style"
        active={!!anyActive}
        disabled={!editor}
        onClick={() => { if (editor) setOpen((o) => !o); }}
      >
        {/* Bold "B" with an underline dot — the Apple Notes "Aa" text-format icon */}
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 5.5A1.5 1.5 0 014.5 4h5a3.5 3.5 0 012.852 5.53A3.5 3.5 0 0110 16H4.5A1.5 1.5 0 013 14.5v-9zm3 1v3h3.5a1.5 1.5 0 000-3H6zm0 5v3H10a1.5 1.5 0 000-3H6z" />
        </svg>
      </IBtn>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)',
          width: 200, zIndex: 300,
          background: 'var(--bg-menu)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: '6px 0',
          overflow: 'hidden',
        }}>
          <p style={{ margin: 0, padding: '4px 14px 6px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
            Text Style
          </p>
          {row('Bold',      !!editor?.isActive('bold'),      () => editor?.chain().focus().toggleBold().run(),      { fontWeight: 700 })}
          {row('Italic',    !!editor?.isActive('italic'),    () => editor?.chain().focus().toggleItalic().run(),    { fontStyle: 'italic' })}
          {row('Underline', !!editor?.isActive('underline'), () => editor?.chain().focus().toggleUnderline().run(), { textDecoration: 'underline' })}
          {row('Strikethrough', !!editor?.isActive('strike'), () => editor?.chain().focus().toggleStrike().run(),   { textDecoration: 'line-through' })}
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
          {row('Highlight', !!editor?.isActive('highlight'), () => editor?.chain().focus().toggleHighlight().run(),
            { background: '#fde047', padding: '1px 4px', borderRadius: 3, color: '#333' })}
        </div>
      )}
    </div>
  );
}

// ─── Heading toggle group ─────────────────────────────────────────────────────
function HeadingToggle({ editor }: { editor: Editor | null }) {
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      <IBtn
        title="Heading 1"
        active={!!editor?.isActive('heading', { level: 1 })}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4.5A.5.5 0 013.5 4h1a.5.5 0 01.5.5V9h6V4.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v11a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5V11H5v4.5a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-11zm13.78 1.59a.5.5 0 010 .76l-1.5 1.32a.5.5 0 01-.78-.52V15.5a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5V7.25L11 8.38a.5.5 0 01-.78-.52L11.72 6.5a.5.5 0 01.78-.02l.02.02 1.5 1.2z" />
        </svg>
      </IBtn>
      <IBtn
        title="Heading 2"
        active={!!editor?.isActive('heading', { level: 2 })}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4.5A.5.5 0 013.5 4h1a.5.5 0 01.5.5V9h6V4.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v11a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5V11H5v4.5a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-11zm9.5 5.25c0-1.24 1.01-2.25 2.25-2.25h.5c1.24 0 2.25 1.01 2.25 2.25 0 .65-.28 1.26-.75 1.71l-2.5 2.29H18a.5.5 0 010 1h-4a.5.5 0 01-.34-.87l3.25-2.97c.24-.22.34-.48.34-.16z" />
        </svg>
      </IBtn>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────
export default function TopBar({ mobile }: { mobile?: boolean }) {
  const {
    selectedFolderId, selectedNoteId, notes,
    addNote, removeNote, incrementFolderCount, decrementFolderCount,
  } = useStore();
  const { theme, setTheme } = useTheme();
  const editor = useEditorStore((s) => s.editor);
  const showToast = useToast((s) => s.showToast);

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

  const noFolder = !selectedFolderId;
  const noNote   = !selectedNoteId;

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: mobile ? '0 8px' : '0 10px',
      gap: mobile ? 1 : 2,
      background: 'var(--bg-folder)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0, flexWrap: 'nowrap',
      height: mobile ? 44 : 38,
      overflowX: mobile ? 'auto' : 'visible',
      overflowY: mobile ? 'hidden' : 'visible',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
    } as React.CSSProperties}>

      {/* ── Desktop left: view + note actions ── */}
      {!mobile && (
        <>
          <ViewToggle />
          <Sep />
          {/* Trash */}
          <IBtn title="Delete Note (⌦)" onClick={deleteNote} disabled={noNote} danger>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" />
            </svg>
          </IBtn>
          {/* New note */}
          <IBtn title="New Note (⌘N)" onClick={newNote} disabled={noFolder}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" />
            </svg>
          </IBtn>
          <Sep />
        </>
      )}

      {/* ── Formatting (both desktop + mobile) ── */}

      {/* Aa font size */}
      <FontSizeDropdown editor={editor} />

      <Sep />

      {/* Bold/Italic/Underline/Strike/Highlight popover */}
      <TextStylePopover editor={editor} />

      <Sep />

      {/* Headings */}
      <HeadingToggle editor={editor} />

      <Sep />

      {/* Bullet list */}
      <IBtn title="Bullet List" active={!!editor?.isActive('bulletList')} disabled={!editor}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}>
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75zM1.99 4.75a1 1 0 011-1H3a1 1 0 110 2h-.01a1 1 0 01-1-1zM1.99 10a1 1 0 011-1H3a1 1 0 110 2h-.01a1 1 0 01-1-1zM1.99 15.25a1 1 0 011-1H3a1 1 0 110 2h-.01a1 1 0 01-1-1z" />
        </svg>
      </IBtn>

      {/* Numbered list */}
      <IBtn title="Numbered List" active={!!editor?.isActive('orderedList')} disabled={!editor}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75z" />
          <path d="M2.5 3H3a.5.5 0 010 1v1.5a.5.5 0 01-1 0V4h-.5a.5.5 0 010-1zm-1 6a.5.5 0 01.5-.5H3a1 1 0 110 2 1 1 0 110 2H2.5a.5.5 0 010-1H3a.5.5 0 000-1h-.5a.5.5 0 01-.5-.5zm.5 5h.5a.5.5 0 010 1H2.5a.5.5 0 010-1H3z" />
        </svg>
      </IBtn>

      <Sep />

      {/* Insert image */}
      <label
        title="Insert Image"
        style={{ display: 'contents', cursor: editor && selectedNoteId ? 'pointer' : 'default' }}
      >
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
              .then(async (r) => {
                if (!r.ok) throw new Error(await r.text());
                return r.json();
              })
              .then((d) => { if (d.url) editor.chain().focus().insertContent({ type: 'image', attrs: { src: d.url } }).run(); })
              .catch((error) => {
                console.error(error);
                showToast('Could not upload this image.', 'error');
              });
            e.target.value = '';
          }}
        />
        <IBtn title="Insert Image" disabled={!editor || !selectedNoteId}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        </IBtn>
      </label>

      {/* ── Desktop right: sync + theme + user ── */}
      {!mobile && (
        <>
          <div style={{ flex: 1 }} />
          <SyncStatus />
          <IBtn
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light'
              ? <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 1110.5 2a.75.75 0 01.68.43.75.75 0 01-.26.77A6.5 6.5 0 007.455 2.004z" /></svg>
              : <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zm0 13a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zm8-5a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM3 10a.75.75 0 01-.75.75H.75a.75.75 0 010-1.5H2.25A.75.75 0 013 10zm12.657-5.657a.75.75 0 010 1.06l-1.061 1.061a.75.75 0 11-1.06-1.06l1.06-1.061a.75.75 0 011.061 0zm-9.193 9.193a.75.75 0 010 1.06L5.403 15.657a.75.75 0 01-1.06-1.06l1.06-1.062a.75.75 0 011.061 0zm9.193 2.121a.75.75 0 01-1.06 0l-1.062-1.06a.75.75 0 011.061-1.061l1.061 1.06a.75.75 0 010 1.061zM4.464 4.343a.75.75 0 01-1.06 0L2.343 3.28a.75.75 0 011.061-1.06l1.06 1.06a.75.75 0 010 1.062zM10 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" /></svg>
            }
          </IBtn>
          <UserMenu />
        </>
      )}
    </div>
  );
}
