import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(note);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];
  if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title); }
  if (body.content !== undefined) { fields.push('content = ?'); values.push(body.content); }
  fields.push('updatedAt = ?');
  values.push(now);
  values.push(id);
  db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  return NextResponse.json(note);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
