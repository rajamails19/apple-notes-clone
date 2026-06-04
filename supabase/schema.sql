-- ═══════════════════════════════════════════════════════════════════════════
-- Apple Notes Clone — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Profiles (mirrors auth.users) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Folders ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS folders_user_id_idx ON public.folders(user_id);

-- ─── Notes ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id  UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT '',
  content    TEXT NOT NULL DEFAULT '',
  pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  trashed    BOOLEAN NOT NULL DEFAULT FALSE,
  trashed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notes_user_id_idx    ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS notes_folder_id_idx  ON public.notes(folder_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON public.notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS notes_pinned_idx     ON public.notes(pinned DESC, updated_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS notes_set_updated_at ON public.notes;
CREATE TRIGGER notes_set_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Images ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id    UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  filename   TEXT NOT NULL,
  url        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS images_note_id_idx ON public.images(note_id);

-- ─── Table grants ────────────────────────────────────────────────────────────
-- RLS policies filter rows, but Postgres still requires explicit GRANT for the
-- role to touch the table at all. Without these, authenticated users get 42501.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes    TO authenticated;
GRANT SELECT, INSERT, DELETE         ON public.images   TO authenticated;

-- anon role needs SELECT on nothing sensitive, but Supabase expects it granted
GRANT SELECT ON public.profiles TO anon;

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images   ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles: own read"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: own update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Folders
CREATE POLICY "folders: own read"   ON public.folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "folders: own insert" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "folders: own update" ON public.folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "folders: own delete" ON public.folders FOR DELETE USING (auth.uid() = user_id);

-- Notes
CREATE POLICY "notes: own read"   ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes: own insert" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes: own update" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes: own delete" ON public.notes FOR DELETE USING (auth.uid() = user_id);

-- Images
CREATE POLICY "images: own read"   ON public.images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "images: own insert" ON public.images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "images: own delete" ON public.images FOR DELETE USING (auth.uid() = user_id);

-- ─── Storage bucket ───────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('note-images', 'note-images', true, 10485760, ARRAY['image/jpeg','image/png','image/gif','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "note-images: authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "note-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'note-images');

CREATE POLICY "note-images: own delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Enable in Dashboard: Database → Replication → toggle folders + notes ON

-- ─── Future extension points (tables ready but not wired in UI) ──────────────
-- CREATE TABLE public.tags        (id UUID PK, user_id UUID, name TEXT, color TEXT);
-- CREATE TABLE public.note_tags   (note_id UUID, tag_id UUID);
-- CREATE TABLE public.trash       (note_id UUID, user_id UUID, deleted_at TIMESTAMPTZ);
-- CREATE TABLE public.archive     (note_id UUID, user_id UUID, archived_at TIMESTAMPTZ);
-- CREATE TABLE public.favorites   (note_id UUID, user_id UUID);
-- CREATE TABLE public.shares      (note_id UUID, shared_by UUID, shared_with UUID);
