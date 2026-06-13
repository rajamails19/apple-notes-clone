'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const searchParams  = useSearchParams();
  const showForm      = searchParams.get('mode') === 'signin';

  const [mode, setMode]         = useState<'signin' | 'signup'>('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [message, setMessage]   = useState('');

  const supabase = createClient();

  // If no ?mode=signin, auto-sign in as guest and land on the app
  useEffect(() => {
    if (showForm) return;
    setLoading(true);
    supabase.auth.signInAnonymously().then(({ error }) => {
      if (error) { setError(error.message); setLoading(false); }
      else window.location.href = '/';
    });
  }, [showForm]);

  async function handleGoogle() {
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); }
      else window.location.href = '/';
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setMessage('Check your email for a confirmation link.');
      setLoading(false);
    }
  }

  // Guest auto-redirect — show a plain loading screen
  if (!showForm) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-editor)', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        flexDirection: 'column', gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 11,
          background: 'linear-gradient(145deg, #f9d878, #e8a020)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
          </svg>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
          {error || 'Opening Notes…'}
        </p>
        {error && (
          <button
            onClick={() => window.location.href = '/login?mode=signin'}
            style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Sign in instead
          </button>
        )}
      </div>
    );
  }

  // Full sign-in / sign-up form (reached via /login?mode=signin)
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-editor)', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    }}>
      <div style={{
        width: 360, padding: '40px 36px',
        background: 'var(--bg-notes)',
        borderRadius: 18,
        border: '1px solid var(--border)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 12px',
            background: 'linear-gradient(145deg, #f9d878, #e8a020)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(232,160,32,0.35)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Notes</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </p>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%', padding: '10px 16px', borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg-editor)', color: 'var(--text-primary)',
            fontSize: 14, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            marginBottom: 16,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-editor)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address" required
            style={inputStyle}
            onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(232,160,32,0.15)'; }}
            onBlur={(e)  => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';  (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" required minLength={6}
            style={inputStyle}
            onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(232,160,32,0.15)'; }}
            onBlur={(e)  => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';  (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          />

          {error   && <p style={{ margin: 0, fontSize: 12, color: '#ef4444', textAlign: 'center' }}>{error}</p>}
          {message && <p style={{ margin: 0, fontSize: 12, color: '#22c55e', textAlign: 'center' }}>{message}</p>}

          <button
            type="submit" disabled={loading}
            style={{
              padding: '10px', borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: 'white',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 2,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle mode */}
        <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: 0 }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        {/* Back to guest */}
        <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>
          <button
            onClick={() => window.location.href = '/'}
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 12, padding: 0 }}
          >
            ← Back to app
          </button>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 9, fontSize: 14,
  border: '1px solid var(--border)',
  background: 'var(--bg-editor)', color: 'var(--text-primary)',
  outline: 'none', fontFamily: 'inherit', width: '100%',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
