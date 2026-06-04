import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapNote } from '@/lib/supabase/types';

const useSupabase = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (useSupabase()) {
    const supabase = await createClient() as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase.from('notes').select('*').eq('id', id).eq('user_id', user.id).single();
    if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(mapNote(data));
  }

  const { getDb } = await import('@/lib/db');
  const note = getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id);
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(note);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params;
  const body    = await req.json();

  if (useSupabase()) {
    const supabase = await createClient() as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const update: Record<string, unknown> = {};
    if (body.title    !== undefined) update.title     = body.title;
    if (body.content  !== undefined) update.content   = body.content;
    if (body.folderId !== undefined) update.folder_id = body.folderId;
    if (body.pinned   !== undefined) update.pinned    = body.pinned === 1;
    if (body.trashed  !== undefined) {
      update.trashed   = body.trashed === 1;
      update.trashed_at = body.trashed === 1 ? new Date().toISOString() : null;
    }

    const { data, error } = await supabase
      .from('notes')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[notes PATCH] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(mapNote(data));
  }

  // Local-only
  const { getDb } = await import('@/lib/db');
  const db  = getDb();
  const now = new Date().toISOString();
  const allowed = ['title', 'content', 'folderId', 'pinned'];
  const fields: string[] = [];
  const values: unknown[] = [];
  for (const key of allowed) {
    if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
  }
  // Handle trashed / restore
  if (body.trashed !== undefined) {
    fields.push('trashed = ?');   values.push(body.trashed);
    fields.push('trashedAt = ?'); values.push(body.trashed === 1 ? now : null);
  }
  fields.push('updatedAt = ?');
  values.push(now);
  values.push(id);
  db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return NextResponse.json(db.prepare('SELECT * FROM notes WHERE id = ?').get(id));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const permanent = new URL(req.url).searchParams.get('permanent') === 'true';

  if (useSupabase()) {
    const supabase = await createClient() as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (permanent) {
      const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }
    // Soft-delete
    const now = new Date().toISOString();
    const { error } = await supabase.from('notes')
      .update({ trashed: true, trashed_at: now })
      .eq('id', id).eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { getDb } = await import('@/lib/db');
  if (permanent) {
    getDb().prepare('DELETE FROM notes WHERE id = ?').run(id);
  } else {
    const now = new Date().toISOString();
    getDb().prepare('UPDATE notes SET trashed = 1, trashedAt = ? WHERE id = ?').run(now, id);
  }
  return NextResponse.json({ success: true });
}
