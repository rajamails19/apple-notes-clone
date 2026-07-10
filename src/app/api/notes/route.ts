import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import { mapNote } from '@/lib/supabase/types';
import { VIRTUAL_FOLDER_ALL, VIRTUAL_FOLDER_TRASH } from '@/types';

const isSupabaseConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('folderId');
  const search   = searchParams.get('search');

  const isAll   = folderId === VIRTUAL_FOLDER_ALL;
  const isTrash = folderId === VIRTUAL_FOLDER_TRASH;

  if (isSupabaseConfigured()) {
    const supabase = await createClient() as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (isTrash)       query = query.eq('trashed', true);
    else if (isAll)    query = query.eq('trashed', false);
    else if (folderId) query = query.eq('folder_id', folderId).eq('trashed', false);
    else               query = query.eq('trashed', false);

    if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data ?? []).map(mapNote));
  }

  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { getDb } = await import('@/lib/db');
  const db = getDb();
  let sql = 'SELECT * FROM notes WHERE 1=1';
  const args: unknown[] = [];

  if (isTrash)       { sql += ' AND trashed = 1'; }
  else if (isAll)    { sql += ' AND trashed = 0'; }
  else if (folderId) { sql += ' AND folderId = ? AND trashed = 0'; args.push(folderId); }
  else               { sql += ' AND trashed = 0'; }

  if (search) { sql += ' AND (title LIKE ? OR content LIKE ?)'; args.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY pinned DESC, updatedAt DESC';
  return NextResponse.json(db.prepare(sql).all(...args));
}

export async function POST(req: Request) {
  const { folderId, title = 'New Note', content = '', pinned = 0 } = await req.json();
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  if (isSupabaseConfigured()) {
    const supabase = await createClient() as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('notes')
      .insert({ id: uuidv4(), folder_id: folderId, title, content, pinned: pinned === 1, user_id: user.id, trashed: false })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(mapNote(data));
  }

  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { getDb } = await import('@/lib/db');
  const db = getDb();
  const now = new Date().toISOString();
  const note = { id: uuidv4(), folderId, title, content, pinned, trashed: 0, trashedAt: null, createdAt: now, updatedAt: now };
  db.prepare(
    'INSERT INTO notes (id, folderId, title, content, pinned, trashed, trashedAt, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(note.id, note.folderId, note.title, note.content, note.pinned, note.trashed, note.trashedAt, note.createdAt, note.updatedAt);
  return NextResponse.json(note);
}
