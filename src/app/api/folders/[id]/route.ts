import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const db = getDb();
  db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name.trim(), id);
  const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
  return NextResponse.json(folder);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM folders WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
