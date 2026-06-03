import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import { mapFolder } from '@/lib/supabase/types';

const useSupabase = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function GET() {
  if (useSupabase()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: folders, error } = await supabase
        .from('folders')
        .select('*, notes(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (!error && folders) {
        return NextResponse.json(
          (folders as Array<Record<string, unknown>>).map((f) => {
            const noteArr = f.notes as unknown as Array<{ count: number }>;
            const count = noteArr?.[0]?.count ?? 0;
            return { ...mapFolder(f as Parameters<typeof mapFolder>[0]), noteCount: count };
          })
        );
      }
    }
  }

  // SQLite fallback
  const { getDb } = await import('@/lib/db');
  const db = getDb();
  const rows = db.prepare(`
    SELECT f.*, COUNT(n.id) as noteCount
    FROM folders f
    LEFT JOIN notes n ON n.folderId = f.id
    GROUP BY f.id
    ORDER BY f.createdAt ASC
  `).all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  if (useSupabase()) {
    const supabase = await createClient() as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('folders')
        .insert({ id: uuidv4(), name: name.trim(), user_id: user.id })
        .select()
        .single();
      if (!error && data) return NextResponse.json({ ...mapFolder(data), noteCount: 0 });
    }
  }

  const { getDb } = await import('@/lib/db');
  const db = getDb();
  const folder = { id: uuidv4(), name: name.trim(), createdAt: new Date().toISOString() };
  db.prepare('INSERT INTO folders (id, name, createdAt) VALUES (?, ?, ?)').run(folder.id, folder.name, folder.createdAt);
  return NextResponse.json({ ...folder, noteCount: 0 });
}
