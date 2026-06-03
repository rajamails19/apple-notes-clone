import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('folderId');
  const search   = searchParams.get('search');
  const db = getDb();

  let query = 'SELECT * FROM notes WHERE 1=1';
  const args: string[] = [];
  if (folderId) { query += ' AND folderId = ?'; args.push(folderId); }
  if (search)   { query += ' AND (title LIKE ? OR content LIKE ?)'; args.push(`%${search}%`, `%${search}%`); }
  // Pinned notes always float to top
  query += ' ORDER BY pinned DESC, updatedAt DESC';

  return NextResponse.json(db.prepare(query).all(...args));
}

export async function POST(req: Request) {
  const { folderId, title = 'New Note', content = '', pinned = 0 } = await req.json();
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });

  const db  = getDb();
  const now = new Date().toISOString();
  const note = { id: uuidv4(), folderId, title, content, pinned, createdAt: now, updatedAt: now };
  db.prepare(
    'INSERT INTO notes (id, folderId, title, content, pinned, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)'
  ).run(note.id, note.folderId, note.title, note.content, note.pinned, note.createdAt, note.updatedAt);

  return NextResponse.json(note);
}
