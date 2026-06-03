import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const db = getDb();
  const folders = db.prepare(`
    SELECT f.*, COUNT(n.id) as noteCount
    FROM folders f
    LEFT JOIN notes n ON n.folderId = f.id
    GROUP BY f.id
    ORDER BY f.createdAt ASC
  `).all();
  return NextResponse.json(folders);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const db = getDb();
  const folder = { id: uuidv4(), name: name.trim(), createdAt: new Date().toISOString() };
  db.prepare('INSERT INTO folders (id, name, createdAt) VALUES (?, ?, ?)').run(folder.id, folder.name, folder.createdAt);
  return NextResponse.json({ ...folder, noteCount: 0 });
}
