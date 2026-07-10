import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import { mapFolder } from '@/lib/supabase/types';

const isSupabaseConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function GET() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient() as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Use a plain folder query so empty folders are included.
    const { data: allFolders, error: allError } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (allError) {
      console.error('[folders GET] Supabase error:', allError);
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }

    // Get non-trashed note counts per folder
    const { data: counts } = await supabase
      .from('notes')
      .select('folder_id')
      .eq('user_id', user.id)
      .eq('trashed', false);

    const countMap: Record<string, number> = {};
    for (const n of (counts ?? [])) {
      countMap[n.folder_id] = (countMap[n.folder_id] ?? 0) + 1;
    }

    return NextResponse.json(
      (allFolders ?? []).map((f: Parameters<typeof mapFolder>[0]) =>
        ({ ...mapFolder(f), noteCount: countMap[f.id] ?? 0 })
      )
    );
  }

  // Local-only
  const { getDb } = await import('@/lib/db');
  const db = getDb();
  return NextResponse.json(db.prepare(`
    SELECT f.*, COUNT(n.id) as noteCount
    FROM folders f
    LEFT JOIN notes n ON n.folderId = f.id AND n.trashed = 0
    GROUP BY f.id
    ORDER BY f.createdAt ASC
  `).all());
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  if (isSupabaseConfigured()) {
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
