'use client';

import { useEffect, useState } from 'react';
import { useSyncStatus } from '@/store/useSyncStatus';

export default function SyncStatus() {
  const { state, lastSaved } = useSyncStatus();
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (state !== 'saved' || !lastSaved) return;
    const update = () => {
      const diff = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
      if (diff < 5) setTimeAgo('just now');
      else if (diff < 60) setTimeAgo(`${diff}s ago`);
      else setTimeAgo(`${Math.floor(diff / 60)}m ago`);
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, [state, lastSaved]);

  if (state === 'idle') return null;

  const config = {
    syncing: { icon: '⟳', text: 'Saving…',   color: 'var(--text-muted)' },
    saved:   { icon: '✓',  text: `Saved ${timeAgo}`, color: '#22c55e' },
    error:   { icon: '⚠',  text: 'Sync error', color: '#ef4444' },
  }[state] ?? null;

  if (!config) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: 11, color: config.color,
      opacity: 0.85, userSelect: 'none', whiteSpace: 'nowrap',
      transition: 'color 0.3s',
    }}>
      <span style={{ fontSize: state === 'syncing' ? 14 : 11 }}>{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
}
