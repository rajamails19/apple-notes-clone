'use client';

import { useToast } from '@/store/useToast';

const COLORS = {
  error: { background: '#fee2e2', border: '#fecaca', color: '#991b1b' },
  success: { background: '#dcfce7', border: '#bbf7d0', color: '#166534' },
  info: { background: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
};

export default function Toasts() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      right: 16,
      bottom: 16,
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      width: 'min(360px, calc(100vw - 32px))',
      pointerEvents: 'none',
    }}>
      {toasts.map((toast) => {
        const colors = COLORS[toast.type];
        return (
          <button
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              pointerEvents: 'auto',
              border: `1px solid ${colors.border}`,
              background: colors.background,
              color: colors.color,
              borderRadius: 8,
              padding: '10px 12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
              textAlign: 'left',
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.35,
              cursor: 'pointer',
            }}
          >
            {toast.message}
          </button>
        );
      })}
    </div>
  );
}
