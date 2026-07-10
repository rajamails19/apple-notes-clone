'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '@/store/useStore';
import { mapNote, mapFolder } from '@/lib/supabase/types';

export function useRealtimeSync() {
  const setFolders = useStore((s) => s.setFolders);
  const setNotes   = useStore((s) => s.setNotes);

  useEffect(() => {
    // Only subscribe when Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;

    const supabase = createClient();

    const channel = supabase
      .channel('realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        (payload) => {
          const { eventType, new: row, old } = payload;
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const note = mapNote(row as Parameters<typeof mapNote>[0]);
            const existing = useStore.getState().notes;
            const idx = existing.findIndex((n) => n.id === note.id);
            if (idx >= 0) {
              const updated = [...existing];
              updated[idx] = note;
              setNotes(updated);
            } else {
              setNotes([note, ...existing]);
            }
          } else if (eventType === 'DELETE') {
            const existing = useStore.getState().notes;
            setNotes(existing.filter((n) => n.id !== (old as { id: string }).id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'folders' },
        (payload) => {
          const { eventType, new: row, old } = payload;
          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const folder = mapFolder(row as Parameters<typeof mapFolder>[0]);
            const existing = useStore.getState().folders;
            const idx = existing.findIndex((f) => f.id === folder.id);
            // Preserve note count from existing
            const noteCount = existing[idx]?.noteCount ?? 0;
            const withCount = { ...folder, noteCount };
            if (idx >= 0) {
              const updated = [...existing];
              updated[idx] = withCount;
              setFolders(updated);
            } else {
              setFolders([...existing, withCount]);
            }
          } else if (eventType === 'DELETE') {
            const existing = useStore.getState().folders;
            setFolders(existing.filter((f) => f.id !== (old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
