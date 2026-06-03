import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import { mapFolder } from '@/lib/supabase/types';

const useSupabase = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function GET() {
  if (useSupabase()) {
    const supabase = await createClient() as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: folders, error } = await supabase
      .from('folders')
      .select('*, notes(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[folders GET] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      (folders ?? []).map((f: Record<string, unknown>) => {
        const noteArr = f.notes as unknown as Array<{ count: number }>;
        const count = noteArr?.[0]?.count ?? 0;
        return { ...mapFolder(f as Parameters<typeof mapFolder>[0]), noteCount: count };
      })
    );
  }

  // Local-only
  const { getDb } = await import('@/lib/db');
  const db = getDb();
  return NextResponse.json(db.prepare(`
    SELECT f.*, COUNT(n.id) as noteCount
    FROM folders f
    LEFT JOIN notes n ON n.folderId = f.id
    GROUP BY f.id
    ORDER BY f.createdAt ASC
  `).all());
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  if (useSupabase()) {
    const supabase = await createClient() as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('folders')
      .insert({ id: uuidv4(), name: name.trim(), user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('[folders POST] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ...mapFolder(data), noteCount: 0 });
  }

  // Local-only
  const { getDb } = await import('@/lib/db');
  const db = getDb();
  const folder = { id: uuidv4(), name: name.trim(), createdAt: new Date().toISOString() };
  db.prepare('INSERT INTO folders (id, name, createdAt) VALUES (?, ?, ?)').run(folder.id, folder.name, folder.createdAt);
  return NextResponse.json({ ...folder, noteCount: 0 });
}
