import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('folderId');
  const search = searchParams.get('search');
  const db = getDb();
  let query = 'SELECT * FROM notes WHERE 1=1';
  const args: string[] = [];
  if (folderId) { query += ' AND folderId = ?'; args.push(folderId); }
  if (search) { query += ' AND (title LIKE ? OR content LIKE ?)'; args.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY updatedAt DESC';
  const notes = db.prepare(query).all(...args);
  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const { folderId, title = 'New Note', content = '' } = await req.json();
  if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 });
  const db = getDb();
  const now = new Date().toISOString();
  const note = { id: uuidv4(), folderId, title, content, createdAt: now, updatedAt: now };
  db.prepare('INSERT INTO notes (id, folderId, title, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(
    note.id, note.folderId, note.title, note.content, note.createdAt, note.updatedAt
  );
  return NextResponse.json(note);
}
