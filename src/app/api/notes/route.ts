import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import { mapNote } from '@/lib/supabase/types';

const useSupabase = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('folderId');
  const search   = searchParams.get('search');

  if (useSupabase()) {
    const supabase = await createClient() as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      let query = supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (folderId) query = query.eq('folder_id', folderId);
      if (search)   query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);

      const { data, error } = await query;
      if (!error && data) return NextResponse.json(data.map(mapNote));
    }
  }

  const { getDb } = await import('@/lib/db');
  const db = getDb();
  let sql = 'SELECT * FROM notes WHERE 1=1';
  const args: string[] = [];
  if (folderId) { sql += ' AND folderId = ?'; args.push(folderId); }
  if (search)   { sql += ' AND (title LIKE ? OR content LIKE ?)'; args.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY pinned DESC, updatedAt DESC';
  return NextResponse.json(db.prepare(sql).all(...args));
}

export async function POST(req: Request) {
  const { folderId, title = 'New Note', content = '', pinned = 0 } = await req.json();
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  if (useSupabase()) {
    const supabase = await createClient() as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('notes')
        .insert({ id: uuidv4(), folder_id: folderId, title, content, pinned: pinned === 1, user_id: user.id })
        .select()
        .single();
      if (!error && data) return NextResponse.json(mapNote(data));
    }
  }

  const { getDb } = await import('@/lib/db');
  const db = getDb();
  const now = new Date().toISOString();
  const note = { id: uuidv4(), folderId, title, content, pinned, createdAt: now, updatedAt: now };
  db.prepare(
    'INSERT INTO notes (id, folderId, title, content, pinned, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)'
  ).run(note.id, note.folderId, note.title, note.content, note.pinned, note.createdAt, note.updatedAt);
  return NextResponse.json(note);
}
