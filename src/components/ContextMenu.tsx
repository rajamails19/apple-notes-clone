'use client';

import { useEffect, useRef, useState } from 'react';
import { useContextMenu, CtxItem } from '@/store/useContextMenu';

const ITEM_H = 28;

function CtxMenuPanel({
  items, x, y, onClose, depth = 0,
}: {
  items: CtxItem[]; x: number; y: number; onClose: () => void; depth?: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Clamp to viewport
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const r  = el.getBoundingClientRect();
    if (r.right  > vw) el.style.left = `${x - r.width  - (depth ? 4 : 0)}px`;
    if (r.bottom > vh) el.style.top  = `${vh - r.height - 8}px`;
  }, [x, y, depth]);

  const w = 220;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: x, top: y,
        width: w,
        background: 'var(--ctx-bg, #f5f5f5)',
        border: '1px solid var(--ctx-border, #d0d0d0)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        padding: '5px 0',
        zIndex: 9999,
        userSelect: 'none',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} style={{ borderTop: '1px solid var(--ctx-sep, #e0e0e0)', margin: '4px 0' }} />;
        }
        const isHovered = hoveredIdx === i;
        return (
          <div
            key={i}
            style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div
              onClick={() => {
                if (item.disabled || item.submenu) return;
                item.action?.();
                onClose();
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 14px', height: ITEM_H,
                cursor: item.disabled ? 'default' : 'pointer',
                background: isHovered && !item.disabled ? '#3a82d0' : 'transparent',
                color: item.disabled
                  ? 'var(--ctx-disabled, #aaa)'
                  : isHovered
                    ? '#fff'
                    : item.danger
                      ? '#ef4444'
                      : 'var(--text-primary)',
                fontSize: 13,
                borderRadius: 5,
                margin: '0 4px',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {item.icon && <span style={{ fontSize: 14, opacity: 0.85 }}>{item.icon}</span>}
                <span>{item.label}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {item.shortcut && (
                  <span style={{ fontSize: 11, opacity: 0.55 }}>{item.shortcut}</span>
                )}
                {item.submenu && <span style={{ fontSize: 11, opacity: 0.6 }}>▶</span>}
              </span>
            </div>

            {/* Submenu */}
            {item.submenu && isHovered && (
              <CtxMenuPanel
                items={item.submenu}
                x={x + w - 4}
                y={y + i * ITEM_H}
                onClose={onClose}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ContextMenu() {
  const { visible, x, y, items, hide } = useContextMenu();

  useEffect(() => {
    if (!visible) return;
    const close = () => hide();
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
    // Suppress browser context menu everywhere while our menu is open
    const noCtx = (e: MouseEvent) => e.preventDefault();
    window.addEventListener('contextmenu', noCtx);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('contextmenu', noCtx);
    };
  }, [visible, hide]);

  // Global: prevent default browser context menu inside the app shell
  useEffect(() => {
    const prevent = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Allow browser context menu on inputs/textareas only when no TipTap editor is nearby
      if (target.closest('[data-no-ctx]')) return;
      e.preventDefault();
    };
    document.getElementById('app-shell')?.addEventListener('contextmenu', prevent as EventListener);
    return () => {
      document.getElementById('app-shell')?.removeEventListener('contextmenu', prevent as EventListener);
    };
  }, []);

  if (!visible) return null;

  return <CtxMenuPanel items={items} x={x} y={y} onClose={hide} />;
}
