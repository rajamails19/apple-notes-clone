import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ ok: false });
  const res = await fetch(`${url}/rest/v1/folders?limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return NextResponse.json({ ok: res.ok, status: res.status, pingedAt: new Date().toISOString() });
}
