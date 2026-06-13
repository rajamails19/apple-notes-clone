'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function UserMenu() {
  const [user, setUser]     = useState<User | null>(null);
  const [open, setOpen]     = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function migrateLocal() {
    setMigrating(true); setMigrateMsg('');
    try {
      const res = await fetch('/api/migrate', { method: 'POST' });
      const data = await res.json();
      setMigrateMsg(data.message ?? 'Done!');
    } catch {
      setMigrateMsg('Migration failed.');
    }
    setMigrating(false);
  }

  if (!user) return null;

  const isGuest = user.is_anonymous === true;
  const initial = isGuest ? '?' : (user.user_metadata?.full_name ?? user.email ?? '?')[0].toUpperCase();
  const name    = isGuest ? 'Guest' : (user.user_metadata?.full_name ?? user.email ?? 'User');
  const email   = isGuest ? '' : (user.email ?? '');

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={isGuest ? 'Guest — click to sign in' : name}
        style={{
          width: 28, height: 28, borderRadius: '50%', border: 'none',
          background: isGuest ? 'var(--text-muted)' : 'var(--accent)', color: 'white',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {!isGuest && user.user_metadata?.avatar_url
          ? <img src={user.user_metadata.avatar_url} alt={initial} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          : initial}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 220, zIndex: 200,
          background: 'var(--bg-menu)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          padding: '8px 0',
        }}>
          {/* User info */}
          <div style={{ padding: '4px 14px 10px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</p>
            {isGuest
              ? <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Session only · notes lost on sign out</p>
              : <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
            }
          </div>

          {/* Guest: create account CTA */}
          {isGuest && (
            <div style={{ padding: '4px 0' }}>
              <button
                onClick={() => { window.location.href = '/login?mode=signin'; }}
                style={{
                  width: '100%', textAlign: 'left', padding: '6px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                <span>✨</span>
                <span>Create Account to Save Notes</span>
              </button>
            </div>
          )}

          {/* Migrate local notes — only for signed-in users */}
          {!isGuest && (
            <div style={{ padding: '4px 0' }}>
              <button
                onClick={migrateLocal}
                disabled={migrating}
                style={{
                  width: '100%', textAlign: 'left', padding: '6px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                <span>📦</span>
                <span>{migrating ? 'Migrating…' : 'Migrate Local Notes'}</span>
              </button>
              {migrateMsg && (
                <p style={{ margin: '2px 14px 4px', fontSize: 11, color: 'var(--text-muted)' }}>{migrateMsg}</p>
              )}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', margin: '2px 0' }} />

          <button
            onClick={signOut}
            style={{
              width: '100%', textAlign: 'left', padding: '7px 14px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
          >
            <span>↩</span> {isGuest ? 'End Session' : 'Sign Out'}
          </button>
        </div>
      )}
    </div>
  );
}
