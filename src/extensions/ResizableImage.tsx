'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useRef, useCallback } from 'react';

function ResizableImageView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const startX = useRef(0);
  const startW = useRef(0);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.classList.add('resizing');
    startX.current = e.clientX;
    startW.current = node.attrs.width ?? imgRef.current?.offsetWidth ?? 400;

    const onMove = (ev: MouseEvent) => {
      const w = Math.max(60, Math.min(startW.current + (ev.clientX - startX.current), 1400));
      updateAttributes({ width: w });
    };
    const onUp = () => {
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [node.attrs.width, updateAttributes]);

  const align = node.attrs.align ?? 'left';
  const wrapStyle: React.CSSProperties = {
    display: 'block',
    textAlign: align,
    margin: '8px 0',
    lineHeight: 0,
    userSelect: 'none',
  };

  const imgStyle: React.CSSProperties = {
    width: node.attrs.width ? `${node.attrs.width}px` : 'auto',
    maxWidth: '100%',
    display: 'inline-block',
    borderRadius: 6,
    outline: selected ? '2px solid #3b82f6' : 'none',
    outlineOffset: 2,
  };

  return (
    <NodeViewWrapper style={wrapStyle} data-drag-handle>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <img ref={imgRef} src={node.attrs.src} alt={node.attrs.alt ?? ''} style={imgStyle} draggable={false} />

        {selected && (
          <>
            {/* Corner resize handles */}
            {(['nw','ne','sw','se'] as const).map((pos) => {
              const isRight = pos.includes('e');
              const isBottom = pos.includes('s');
              return (
                <span
                  key={pos}
                  onMouseDown={isBottom && isRight ? startResize : undefined}
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
      width: { default: null },
      align: { default: 'left' },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { width, align, ...rest } = HTMLAttributes;
    const style = [
      width ? `width:${width}px` : '',
      align && align !== 'left' ? `text-align:${align}` : '',
    ].filter(Boolean).join(';');
    return ['img', mergeAttributes(rest, style ? { style } : {})];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
