import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapFolder } from '@/lib/supabase/types';

const isSupabaseConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  if (isSupabaseConfigured()) {
    const supabase = await createClient() as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('folders')
      .update({ name: name.trim() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[folders PATCH] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(mapFolder(data));
  }

  const { getDb } = await import('@/lib/db');
  const db = getDb();
  db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name.trim(), id);
  return NextResponse.json(db.prepare('SELECT * FROM folders WHERE id = ?').get(id));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (isSupabaseConfigured()) {
    const supabase = await createClient() as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase.from('folders').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      console.error('[folders DELETE] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  const { getDb } = await import('@/lib/db');
  getDb().prepare('DELETE FROM folders WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
