import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const note = getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id);
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(note);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params;
  const body    = await req.json();
  const db      = getDb();
  const now     = new Date().toISOString();
  const allowed = ['title', 'content', 'folderId', 'pinned'];
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const key of allowed) {
    if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
  }
  // Always update updatedAt unless it's a pure pin toggle on behalf of server
  fields.push('updatedAt = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return NextResponse.json(db.prepare('SELECT * FROM notes WHERE id = ?').get(id));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  getDb().prepare('DELETE FROM notes WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
