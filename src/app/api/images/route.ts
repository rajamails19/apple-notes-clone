import { NextResponse } from 'next/server';
import { getDb, UPLOADS_DIR } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const noteId = formData.get('noteId') as string;

  if (!file || !noteId) return NextResponse.json({ error: 'file and noteId required' }, { status: 400 });

  const ext = path.extname(file.name) || '.png';
  const id = uuidv4();
  const filename = `${id}${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filepath, buffer);

  const url = `/uploads/${filename}`;
  const db = getDb();
  db.prepare('INSERT INTO images (id, noteId, filename, url) VALUES (?, ?, ?, ?)').run(id, noteId, filename, url);

  return NextResponse.json({ id, noteId, filename, url });
}
