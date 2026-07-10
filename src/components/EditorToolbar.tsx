'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useTheme } from './ThemeProvider';
import SyncStatus from './SyncStatus';
import UserMenu from './auth/UserMenu';
import type { Editor } from '@tiptap/react';
import { FONT_SIZES, DEFAULT_SIZE, parsePxSize } from '@/extensions/FontSize';
import { useToast } from '@/store/useToast';

// ─── Toolbar icon button ──────────────────────────────────────────────────────
function TBtn({
  onClick, active, disabled, title, children,
}: {
  onClick?: () => void; active?: boolean; disabled?: boolean;
  title: string; children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); if (!disabled && onClick) onClick(); }}
      title={title}
      disabled={disabled}
      style={{
        width: 30, height: 30, padding: 0, borderRadius: 6, border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(128,128,128,0.18)' : 'transparent',
        color: disabled ? 'var(--text-faint)' : active ? 'var(--text-primary)' : 'var(--text-secondary)',
        flexShrink: 0, transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = active ? 'rgba(128,128,128,0.22)' : 'rgba(128,128,128,0.12)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = active ? 'rgba(128,128,128,0.18)' : 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ─── Font size labels ─────────────────────────────────────────────────────────
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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onMouseDown={(e) => { e.preventDefault(); if (editor) setOpen((o) => !o); }}
        disabled={!editor}
        title="Font Size"
        style={{
          height: 30, padding: '0 8px', borderRadius: 6, border: 'none',
          cursor: editor ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', gap: 3,
          background: open ? 'rgba(128,128,128,0.18)' : 'transparent',
          color: editor ? 'var(--text-secondary)' : 'var(--text-faint)',
          flexShrink: 0, transition: 'background 0.1s',
        }}
        onMouseEnter={(e) => { if (editor) (e.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.12)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = open ? 'rgba(128,128,128,0.18)' : 'transparent'; }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.3px', fontFamily: '-apple-system,sans-serif' }}>Aa</span>
        <svg width="7" height="4" viewBox="0 0 8 5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 1l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          width: 180, zIndex: 400,
          background: 'var(--bg-menu)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          padding: '6px 0', overflow: 'hidden',
        }}>
          <p style={{ margin: 0, padding: '4px 14px 6px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
            Font Size
          </p>
          {FONT_SIZES.map((size) => {
            const selected = size === cur;
            return (
              <button key={size}
                onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().setFontSize(`${size}px`).run(); setOpen(false); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '6px 14px',
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

function TextStylePopover({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    <button key={label}
      onMouseDown={(e) => { e.preventDefault(); onToggle(); }}
      style={{
        width: '100%', padding: '7px 14px', background: isActive ? 'rgba(232,160,32,0.12)' : 'none',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: isActive ? 'var(--accent)' : 'var(--text-primary)',
      }}
      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'none'; }}
    >
      <span style={{ fontSize: 13, ...sampleStyle }}>{label}</span>
      {isActive && <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" /></svg>}
    </button>
  );

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <TBtn title="Text Style" active={!!anyActive} disabled={!editor} onClick={() => { if (editor) setOpen((o) => !o); }}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 5.5A1.5 1.5 0 014.5 4h5a3.5 3.5 0 012.852 5.53A3.5 3.5 0 0110 16H4.5A1.5 1.5 0 013 14.5v-9zm3 1v3h3.5a1.5 1.5 0 000-3H6zm0 5v3H10a1.5 1.5 0 000-3H6z" />
        </svg>
      </TBtn>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 200, zIndex: 400,
          background: 'var(--bg-menu)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          padding: '6px 0', overflow: 'hidden',
        }}>
          <p style={{ margin: 0, padding: '4px 14px 6px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
            Text Style
          </p>
          {row('Bold',          !!editor?.isActive('bold'),      () => editor?.chain().focus().toggleBold().run(),      { fontWeight: 700 })}
          {row('Italic',        !!editor?.isActive('italic'),    () => editor?.chain().focus().toggleItalic().run(),    { fontStyle: 'italic' })}
          {row('Underline',     !!editor?.isActive('underline'), () => editor?.chain().focus().toggleUnderline().run(), { textDecoration: 'underline' })}
          {row('Strikethrough', !!editor?.isActive('strike'),    () => editor?.chain().focus().toggleStrike().run(),    { textDecoration: 'line-through' })}
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
          {row('Highlight', !!editor?.isActive('highlight'), () => editor?.chain().focus().toggleHighlight().run(),
            { background: '#fde047', padding: '1px 4px', borderRadius: 3, color: '#333' })}
        </div>
      )}
    </div>
  );
}

// ─── Main EditorToolbar ───────────────────────────────────────────────────────
export default function EditorToolbar() {
  const editor = useEditorStore((s) => s.editor);
  const { selectedNoteId } = useStore();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showToast = useToast((s) => s.showToast);

  const handleImageInsert = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNoteId || !editor) return;
    const fd = new FormData();
    fd.append('file', file); fd.append('noteId', selectedNoteId);
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
  }, [editor, selectedNoteId, showToast]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 1,
      padding: '0 16px',
      height: 44,
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-editor)',
      flexShrink: 0,
    }}>
      {/* Formatting tools — left side */}
      <FontSizeDropdown editor={editor} />

      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />

      <TextStylePopover editor={editor} />

      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />

      {/* Headings */}
      <TBtn title="Heading 1" active={!!editor?.isActive('heading', { level: 1 })} disabled={!editor}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
        <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4.5A.5.5 0 013.5 4h1a.5.5 0 01.5.5V9h6V4.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v11a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5V11H5v4.5a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-11zm13.78 1.59a.5.5 0 010 .76l-1.5 1.32a.5.5 0 01-.78-.52V15.5a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5V7.25L11 8.38a.5.5 0 01-.78-.52L11.72 6.5a.5.5 0 01.78-.02l.02.02 1.5 1.2z" />
        </svg>
      </TBtn>
      <TBtn title="Heading 2" active={!!editor?.isActive('heading', { level: 2 })} disabled={!editor}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
        <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4.5A.5.5 0 013.5 4h1a.5.5 0 01.5.5V9h6V4.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v11a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5V11H5v4.5a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5v-11zm9.5 5.25c0-1.24 1.01-2.25 2.25-2.25h.5c1.24 0 2.25 1.01 2.25 2.25 0 .65-.28 1.26-.75 1.71l-2.5 2.29H18a.5.5 0 010 1h-4a.5.5 0 01-.34-.87l3.25-2.97c.24-.22.34-.48.34-.16z" />
        </svg>
      </TBtn>

      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />

      {/* Lists */}
      <TBtn title="Bullet List" active={!!editor?.isActive('bulletList')} disabled={!editor}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75zM1.99 4.75a1 1 0 011-1H3a1 1 0 110 2h-.01a1 1 0 01-1-1zM1.99 10a1 1 0 011-1H3a1 1 0 110 2h-.01a1 1 0 01-1-1zM1.99 15.25a1 1 0 011-1H3a1 1 0 110 2h-.01a1 1 0 01-1-1z" />
        </svg>
      </TBtn>
      <TBtn title="Numbered List" active={!!editor?.isActive('orderedList')} disabled={!editor}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75z" />
          <path d="M2.5 3H3a.5.5 0 010 1v1.5a.5.5 0 01-1 0V4h-.5a.5.5 0 010-1zm-1 6a.5.5 0 01.5-.5H3a1 1 0 110 2 1 1 0 110 2H2.5a.5.5 0 010-1H3a.5.5 0 000-1h-.5a.5.5 0 01-.5-.5zm.5 5h.5a.5.5 0 010 1H2.5a.5.5 0 010-1H3z" />
        </svg>
      </TBtn>

      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />

      {/* Image */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={handleImageInsert}
      />
      <TBtn title="Insert Image" disabled={!editor || !selectedNoteId}
        onClick={() => fileInputRef.current?.click()}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      </TBtn>

      {/* Right side: spacer + sync + theme + user */}
      <div style={{ flex: 1 }} />
      <SyncStatus />
      <TBtn title={theme === 'light' ? 'Dark Mode' : 'Light Mode'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        {theme === 'light'
          ? <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 1110.5 2a.75.75 0 01.68.43.75.75 0 01-.26.77A6.5 6.5 0 007.455 2.004z" /></svg>
          : <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zm0 13a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zm8-5a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM3 10a.75.75 0 01-.75.75H.75a.75.75 0 010-1.5H2.25A.75.75 0 013 10zm12.657-5.657a.75.75 0 010 1.06l-1.061 1.061a.75.75 0 11-1.06-1.06l1.06-1.061a.75.75 0 011.061 0zm-9.193 9.193a.75.75 0 010 1.06L5.403 15.657a.75.75 0 01-1.06-1.06l1.06-1.062a.75.75 0 011.061 0zm9.193 2.121a.75.75 0 01-1.06 0l-1.062-1.06a.75.75 0 011.061-1.061l1.061 1.06a.75.75 0 010 1.061zM4.464 4.343a.75.75 0 01-1.06 0L2.343 3.28a.75.75 0 011.061-1.06l1.06 1.06a.75.75 0 010 1.062zM10 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" /></svg>
        }
      </TBtn>
      <UserMenu />
    </div>
  );
}
