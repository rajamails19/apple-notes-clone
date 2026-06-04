/** Supabase database types — matches supabase/schema.sql */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row:    { id: string; email: string | null; full_name: string | null; avatar_url: string | null; created_at: string; updated_at: string; };
        Insert: { id: string; email?: string | null; full_name?: string | null; avatar_url?: string | null; };
        Update: { email?: string | null; full_name?: string | null; avatar_url?: string | null; };
      };
      folders: {
        Row:    { id: string; user_id: string; name: string; created_at: string; };
        Insert: { id?: string; user_id: string; name: string; created_at?: string; };
        Update: { name?: string; };
      };
      notes: {
        Row:    { id: string; user_id: string; folder_id: string; title: string; content: string; pinned: boolean; created_at: string; updated_at: string; };
        Insert: { id?: string; user_id: string; folder_id: string; title?: string; content?: string; pinned?: boolean; created_at?: string; updated_at?: string; };
        Update: { folder_id?: string; title?: string; content?: string; pinned?: boolean; updated_at?: string; };
      };
      images: {
        Row:    { id: string; user_id: string; note_id: string; filename: string; url: string; created_at: string; };
        Insert: { id?: string; user_id: string; note_id: string; filename: string; url: string; };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ─── Row types ────────────────────────────────────────────────────────────────
export type DbFolder = Database['public']['Tables']['folders']['Row'];
export type DbNote   = Database['public']['Tables']['notes']['Row'];
export type DbImage  = Database['public']['Tables']['images']['Row'];

// ─── Mappers: DB (snake_case) → App (camelCase) ───────────────────────────────
import type { Folder, Note } from '@/types';

export function mapFolder(row: DbFolder, noteCount = 0): Folder {
  return { id: row.id, name: row.name, createdAt: row.created_at, noteCount };
}

export function mapNote(row: DbNote & { trashed?: boolean; trashed_at?: string | null }): Note {
  return {
    id:        row.id,
    folderId:  row.folder_id,
    title:     row.title,
    content:   row.content,
    pinned:    row.pinned ? 1 : 0,
    trashed:   row.trashed ? 1 : 0,
    trashedAt: row.trashed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
