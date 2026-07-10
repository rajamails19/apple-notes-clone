import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { createClient } from '@/lib/supabase/server';

const isSupabaseConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req: Request) {
  const formData = await req.formData();
  const file   = formData.get('file') as File;
  const noteId = formData.get('noteId') as string;
  if (!file || !noteId) return NextResponse.json({ error: 'file and noteId required' }, { status: 400 });

  const ext      = path.extname(file.name) || '.png';
  const id       = uuidv4();
  const filename = `${id}${ext}`;

  if (isSupabaseConfigured()) {
    const supabase = await createClient() as any; // eslint-disable-line
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const arrayBuffer = await file.arrayBuffer();
      const storagePath = `${user.id}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('note-images')
        .upload(storagePath, arrayBuffer, { contentType: file.type || 'image/png' });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('note-images').getPublicUrl(storagePath);
        const url = urlData.publicUrl;
        await supabase.from('images').insert({ id, note_id: noteId, filename, url, user_id: user.id });
        return NextResponse.json({ id, noteId, filename, url });
      }
    }
  }

  // Local file fallback
  const { getDb, UPLOADS_DIR } = await import('@/lib/db');
  const fs = await import('fs');
  const filepath = path.join(UPLOADS_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
  const url = `/uploads/${filename}`;
  const db = getDb();
  db.prepare('INSERT INTO images (id, noteId, filename, url) VALUES (?, ?, ?, ?)').run(id, noteId, filename, url);
  return NextResponse.json({ id, noteId, filename, url });
}
