import LoginPage from '@/components/auth/LoginPage';

// Never statically prerender — Supabase client requires env vars at runtime
export const dynamic = 'force-dynamic';

export default function Page() {
  return <LoginPage />;
}
