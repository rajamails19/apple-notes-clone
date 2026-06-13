'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useRef, useCallback } from 'react';

function ResizableImageView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const startX = useRef(0);
  const startW = useRef(0);
  const pinchStartDistance = useRef(0);
  const pinchStartWidth = useRef(0);
  const touchMode = useRef<'idle' | 'pan' | 'pinch'>('idle');
  const lastPanY = useRef(0);

  const clampWidth = useCallback((width: number) => {
    return Math.max(60, Math.min(width, 1400));
  }, []);

  const touchDistance = useCallback((touches: React.TouchList | TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }, []);

  const getEditorScroller = useCallback(() => {
    return imgRef.current?.closest('.editor-scroll') as HTMLElement | null;
  }, []);

  const startResize = useCallback((e: React.PointerEvent, pos: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Capture the pointer so all subsequent pointer events go to this element
    // even if the mouse leaves it — this also prevents TipTap's drag-handle
    // from stealing the event and moving the node vertically.
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    document.body.classList.add('resizing');
    startX.current = e.clientX;
    startW.current = node.attrs.width ?? imgRef.current?.offsetWidth ?? 400;
    const invertX = pos.includes('w'); // left-side handles: drag left = grow

    const onMove = (ev: PointerEvent) => {
      const delta = invertX
        ? startX.current - ev.clientX   // nw / sw / w: left = grow
        : ev.clientX - startX.current;  // ne / se / e: right = grow
      const w = clampWidth(startW.current + delta);
      updateAttributes({ width: w });
    };
    const onUp = () => {
      document.body.classList.remove('resizing');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [clampWidth, node.attrs.width, updateAttributes]);

  const startPinch = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      touchMode.current = 'pan';
      lastPanY.current = e.touches[0].clientY;
      return;
    }
    if (e.touches.length === 2) {
      e.preventDefault();
      touchMode.current = 'pinch';
      document.body.classList.add('resizing');
      pinchStartDistance.current = touchDistance(e.touches);
      pinchStartWidth.current = node.attrs.width ?? imgRef.current?.offsetWidth ?? 400;
    }
  }, [node.attrs.width, touchDistance]);

  const movePinch = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 2) {
      e.preventDefault();
      if (touchMode.current !== 'pinch' || !pinchStartDistance.current) {
        touchMode.current = 'pinch';
        document.body.classList.add('resizing');
        pinchStartDistance.current = touchDistance(e.touches);
        pinchStartWidth.current = node.attrs.width ?? imgRef.current?.offsetWidth ?? 400;
      }
      const scale = touchDistance(e.touches) / pinchStartDistance.current;
      updateAttributes({ width: clampWidth(pinchStartWidth.current * scale) });
      return;
    }

    if (e.touches.length === 1 && touchMode.current === 'pan') {
      const scroller = getEditorScroller();
      if (!scroller) return;
      e.preventDefault();
      const y = e.touches[0].clientY;
      scroller.scrollTop += lastPanY.current - y;
      lastPanY.current = y;
    }
  }, [clampWidth, getEditorScroller, node.attrs.width, touchDistance, updateAttributes]);

  const endPinch = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchMode.current = 'pan';
      lastPanY.current = e.touches[0].clientY;
      pinchStartDistance.current = 0;
      document.body.classList.remove('resizing');
      return;
    }
    touchMode.current = 'idle';
    pinchStartDistance.current = 0;
    document.body.classList.remove('resizing');
  }, []);

  const align = node.attrs.align ?? 'left';
  const marginLeft = node.attrs.marginLeft ?? 0;
  const wrapStyle: React.CSSProperties = {
    display: 'block',
    textAlign: align,
    margin: '8px 0',
    marginLeft: marginLeft > 0 ? marginLeft : undefined,
    lineHeight: 0,
    userSelect: 'none',
    touchAction: 'none',
  };

  const imgStyle: React.CSSProperties = {
    width: node.attrs.width ? `${node.attrs.width}px` : 'auto',
    maxWidth: '100%',
    display: 'inline-block',
    borderRadius: 6,
    outline: selected ? '2px solid #3b82f6' : 'none',
    outlineOffset: 2,
    touchAction: 'none',
  };

  return (
    <NodeViewWrapper style={wrapStyle} data-drag-handle>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt ?? ''}
          style={imgStyle}
          draggable={false}
          onTouchStart={startPinch}
          onTouchMove={movePinch}
          onTouchEnd={endPinch}
          onTouchCancel={endPinch}
        />

        {selected && (
          <>
            {/* Corner resize handles */}
            {(['nw','ne','sw','se'] as const).map((pos) => {
              const isRight = pos.includes('e');
              const isBottom = pos.includes('s');
              return (
                <span
                  key={pos}
                  onPointerDown={(e) => startResize(e, pos)}
                  style={{
                    position: 'absolute',
                    width: 10, height: 10,
                    background: '#3b82f6',
                    borderRadius: 2,
                    border: '1.5px solid white',
                    top: isBottom ? undefined : -5,
                    bottom: isBottom ? -5 : undefined,
                    left: isRight ? undefined : -5,
                    right: isRight ? -5 : undefined,
                    cursor: `${pos}-resize`,
                    zIndex: 10,
                  }}
                />
              );
            })}

            {/* Mid-side handles (left & right centers for width resize) */}
            {(['w','e'] as const).map((pos) => {
              const isRight = pos === 'e';
              return (
                <span
                  key={`mid-${pos}`}
                  onPointerDown={(e) => startResize(e, pos)}
                  style={{
                    position: 'absolute',
                    width: 8, height: 24,
                    background: '#3b82f6',
                    borderRadius: 4,
                    border: '1.5px solid white',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    left: isRight ? undefined : -4,
                    right: isRight ? -4 : undefined,
                    cursor: 'ew-resize',
                    zIndex: 10,
                  }}
                />
              );
            })}

            {/* Floating toolbar */}
            <span
              style={{
                position: 'absolute',
                top: -38,
                left: 0,
                display: 'flex',
                gap: 2,
                background: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                padding: '3px 6px',
                zIndex: 20,
                lineHeight: '1',
                whiteSpace: 'nowrap',
              }}
            >
              {[
                { label: '⬅', title: 'Align Left',   action: () => updateAttributes({ align: 'left' }) },
                { label: '↔', title: 'Align Center', action: () => updateAttributes({ align: 'center' }) },
                { label: '➡', title: 'Align Right',  action: () => updateAttributes({ align: 'right' }) },
              ].map(({ label, title, action }) => (
                <button
                  key={title}
                  title={title}
                  onMouseDown={(e) => { e.preventDefault(); action(); }}
                  style={{
                    background: 'none', border: 'none',
                    padding: '2px 5px', borderRadius: 4,
                    cursor: 'pointer', fontSize: 13,
                    color: '#444',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f0f0f0'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                >
                  {label}
                </button>
              ))}
              <span style={{ width: 1, background: '#e0e0e0', margin: '2px 2px' }} />
              <button
                title="Delete image"
                onMouseDown={(e) => { e.preventDefault(); deleteNode(); }}
                style={{
                  background: 'none', border: 'none',
                  padding: '2px 5px', borderRadius: 4,
                  cursor: 'pointer', fontSize: 12,
                  color: '#ef4444',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                ✕
              </button>
            </span>
          </>
        )}
      </span>
    </NodeViewWrapper>
  );
}

export const ResizableImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src:   { default: null },
      alt:   { default: null },
      // Parse width back from the inline style on reload
      width: {
        default: null,
        parseHTML: (el) => {
          const w = (el as HTMLElement).style.width;
          return w ? parseInt(w, 10) : null;
        },
      },
      // Parse marginLeft back from the inline style on reload
      marginLeft: {
        default: 0,
        parseHTML: (el) => {
          const ml = (el as HTMLElement).style.marginLeft;
          return ml ? parseInt(ml, 10) : 0;
        },
      },
      align: { default: 'left' },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { width, align, marginLeft, ...rest } = HTMLAttributes;
    const style = [
      width      ? `width:${width}px`            : '',
      marginLeft ? `margin-left:${marginLeft}px`  : '',
    ].filter(Boolean).join(';');
    return ['img', mergeAttributes(rest, style ? { style } : {})];
  },

  addKeyboardShortcuts() {
    const STEP = 24; // px per Tab press, like a tab stop
    return {
      Tab: ({ editor }) => {
        const { selection } = editor.state;
        const node = selection.$anchor.nodeAfter ?? editor.state.doc.nodeAt(selection.from);
        if (!node || node.type.name !== 'image') return false;
        const cur = node.attrs.marginLeft ?? 0;
        editor.commands.updateAttributes('image', { marginLeft: cur + STEP });
        return true; // prevent default Tab behaviour
      },
      'Shift-Tab': ({ editor }) => {
        const { selection } = editor.state;
        const node = selection.$anchor.nodeAfter ?? editor.state.doc.nodeAt(selection.from);
        if (!node || node.type.name !== 'image') return false;
        const cur = node.attrs.marginLeft ?? 0;
        editor.commands.updateAttributes('image', { marginLeft: Math.max(0, cur - STEP) });
        return true;
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
