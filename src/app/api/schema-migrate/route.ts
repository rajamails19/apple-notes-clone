import { NextResponse } from 'next/server';

/**
 * Returns the SQL needed to add soft-delete columns to the Supabase notes table.
 * Run the returned SQL in: Supabase Dashboard → SQL Editor
 */
export async function POST() {
  const sql = [
    'ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS trashed BOOLEAN NOT NULL DEFAULT FALSE;',
    'ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ;',
  ].join('\n');

  return NextResponse.json({
    message: 'Run this SQL in your Supabase Dashboard → SQL Editor:',
    sql,
  });
}
