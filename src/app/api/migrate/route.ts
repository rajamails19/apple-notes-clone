import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ message: 'Supabase not configured.' }, { status: 400 });
  }

  const supabase = await createClient() as any; // eslint-disable-line
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });

  let db: ReturnType<typeof import('@/lib/db')['getDb']>;
  try {
    const dbModule = await import('@/lib/db');
    db = dbModule.getDb();
  } catch {
    return NextResponse.json({ message: 'No local database found.' });
  }

  // --- Migrate folders ---
  const localFolders = db.prepare('SELECT * FROM folders').all() as Array<{
    id: string; name: string; createdAt: string;
  }>;
  let foldersMigrated = 0;
  for (const f of localFolders) {
    const { error } = await supabase.from('folders').upsert(
      { id: f.id, name: f.name, user_id: user.id, created_at: f.createdAt },
      { onConflict: 'id' }
    );
    if (!error) foldersMigrated++;
  }

  // --- Migrate notes ---
  const localNotes = db.prepare('SELECT * FROM notes').all() as Array<{
    id: string; folderId: string; title: string; content: string;
    pinned: number; createdAt: string; updatedAt: string;
  }>;
  let notesMigrated = 0;
  for (const n of localNotes) {
    const { error } = await supabase.from('notes').upsert(
      {
        id: n.id, folder_id: n.folderId, title: n.title, content: n.content,
        pinned: n.pinned === 1, user_id: user.id,
        created_at: n.createdAt, updated_at: n.updatedAt,
      },
      { onConflict: 'id' }
    );
    if (!error) notesMigrated++;
  }

  // --- Migrate images ---
  let imagesMigrated = 0;
  try {
    const localImages = db.prepare('SELECT * FROM images').all() as Array<{
      id: string; noteId: string; filename: string; url: string;
    }>;
    const { UPLOADS_DIR } = await import('@/lib/db');

    for (const img of localImages) {
      const localPath = path.join(UPLOADS_DIR, img.filename);
      if (!fs.existsSync(localPath)) continue;
      const buffer = fs.readFileSync(localPath);
      const storagePath = `${user.id}/${img.filename}`;
      const contentType = img.filename.endsWith('.png') ? 'image/png'
                        : img.filename.endsWith('.gif') ? 'image/gif'
                        : 'image/jpeg';

      const { error: uploadError } = await supabase.storage
        .from('note-images')
        .upload(storagePath, buffer, { contentType, upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('note-images').getPublicUrl(storagePath);
        await supabase.from('images').upsert(
          { id: img.id, note_id: img.noteId, filename: img.filename, url: urlData.publicUrl, user_id: user.id },
          { onConflict: 'id' }
        );
        imagesMigrated++;
      }
    }
  } catch {
    // images table may not exist locally — ignore
  }

  const f = foldersMigrated, n = notesMigrated, i = imagesMigrated;
  return NextResponse.json({
    message: `Migrated ${f} folder${f !== 1 ? 's' : ''}, ${n} note${n !== 1 ? 's' : ''}, ${i} image${i !== 1 ? 's' : ''}.`,
  });
}
