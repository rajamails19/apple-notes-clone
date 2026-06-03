'use client';

import { useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { FONT_SIZES, DEFAULT_SIZE, getNextSize, parsePxSize } from '@/extensions/FontSize';

interface ToolbarProps {
  editor: Editor | null;
  noteId: string | null;
  onImageInsert: (file: File) => void;
}

function Btn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        padding: '3px 7px',
        borderRadius: 5,
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        background: active ? 'rgba(232,160,32,0.18)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 3px', display: 'inline-block', verticalAlign: 'middle' }} />;
}

export default function Toolbar({ editor, noteId, onImageInsert }: ToolbarProps) {
  // The built-in FontSize stores as '16px' strings
  const rawSize = editor?.getAttributes('textStyle')?.fontSize as string | null | undefined;
  const currentSize: number | null = parsePxSize(rawSize);
  const displaySize = currentSize ?? DEFAULT_SIZE;

  const changeSize = useCallback((dir: 1 | -1) => {
    if (!editor) return;
    const next = getNextSize(currentSize, dir);
    editor.chain().focus().setFontSize(`${next}px`).run();
  }, [editor, currentSize]);

  const setSizeFromInput = useCallback((val: string) => {
    if (!editor) return;
    const n = parseInt(val, 10);
    if (!n || n < 6 || n > 128) return;
    editor.chain().focus().setFontSize(`${n}px`).run();
  }, [editor]);

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && noteId) onImageInsert(file);
    e.target.value = '';
  }

  if (!editor) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 1,
      padding: '5px 12px',
      borderBottom: '1px solid var(--border-light)',
      background: 'var(--bg-toolbar)',
      flexWrap: 'wrap',
    }}>
      {/* Font size controls */}
      <Btn title="Decrease Font Size" onClick={() => changeSize(-1)}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>A</span>
        <span style={{ fontSize: 9, verticalAlign: 'super' }}>−</span>
      </Btn>

      {/* Size display / input */}
      <div style={{ position: 'relative' }}>
        <select
          value={FONT_SIZES.includes(displaySize) ? displaySize : ''}
          onChange={(e) => setSizeFromInput(e.target.value)}
          title="Font Size"
          style={{
            padding: '1px 18px 1px 6px',
            borderRadius: 5,
            border: '1px solid var(--border)',
            background: 'var(--bg-editor)',
            color: 'var(--text-primary)',
            fontSize: 12,
            cursor: 'pointer',
            appearance: 'none',
            width: 52,
            textAlign: 'center',
          }}
        >
          {!FONT_SIZES.includes(displaySize) && (
            <option value="">{displaySize}</option>
          )}
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 9 }}>▾</span>
      </div>

      <Btn title="Increase Font Size" onClick={() => changeSize(1)}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>A</span>
        <span style={{ fontSize: 9, verticalAlign: 'super' }}>+</span>
      </Btn>

      <Divider />

      {/* Text formatting */}
      <Btn title="Bold (⌘B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <strong style={{ fontSize: 14 }}>B</strong>
      </Btn>
      <Btn title="Italic (⌘I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em style={{ fontSize: 14 }}>I</em>
      </Btn>
      <Btn title="Underline (⌘U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <span style={{ textDecoration: 'underline', fontSize: 14 }}>U</span>
      </Btn>

      <Divider />

      {/* Headings */}
      <Btn title="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>H1</span>
      </Btn>
      <Btn title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>H2</span>
      </Btn>

      <Divider />

      {/* Lists */}
      <Btn title="Bullet List" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75zM1.99 4.75a1 1 0 011-1H3a1 1 0 110 2h-.01a1 1 0 01-1-1zM1.99 10a1 1 0 011-1H3a1 1 0 110 2h-.01a1 1 0 01-1-1zM1.99 15.25a1 1 0 011-1H3a1 1 0 110 2h-.01a1 1 0 01-1-1z" />
        </svg>
      </Btn>
      <Btn title="Numbered List" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75z" />
          <path d="M3 3.5a.5.5 0 01.5-.5h.025a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-1.29l-.145.086a.5.5 0 01-.38-.796l.5-.5zM3 9a.5.5 0 01.5-.5h.5a.5.5 0 000-1H3.5a.5.5 0 010-1H4a1 1 0 110 2 1 1 0 110 2H3.5a.5.5 0 010-1H4zM3.5 14a.5.5 0 000 1H4a.5.5 0 000-1h-.5z" />
        </svg>
      </Btn>

      <Divider />

      {/* Highlight */}
      <Btn title="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}>
        <span style={{ fontSize: 13, background: '#fef08a', padding: '0 2px', borderRadius: 2 }}>H</span>
      </Btn>

      <Divider />

      {/* Insert image */}
      <label style={{ cursor: 'pointer' }} title="Insert Image">
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
        <div
          style={{
            padding: '3px 7px', borderRadius: 5,
            color: 'var(--text-secondary)',
            transition: 'background 0.1s',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        </div>
      </label>
    </div>
  );
}
