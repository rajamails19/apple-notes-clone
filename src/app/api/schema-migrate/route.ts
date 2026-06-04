import { NextResponse } from 'next/server';

/**
 * One-time schema migration: adds trashed + trashed_at columns to Supabase notes table.
 * Call POST /api/schema-migrate once from the browser to apply.
 */
export async function POST() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ message: 'Supabase not configured.' }, { status: 400 });
  }

  // Use pg via the Supabase postgres connection (direct REST not available for DDL)
  // Instead, use the Supabase REST API with service role to insert/select;
  // for DDL we use the pg package via env DATABASE_URL if available,
  // otherwise fall back to a raw fetch to the Supabase SQL endpoint.

  // Try the Supabase "execute SQL" endpoint (available in some plans)
  const sqlEndpoint = `${url}/rest/v1/rpc/execute_sql`;

  const migrations = [
    'ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS trashed BOOLEAN NOT NULL DEFAULT FALSE',
    'ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ',
  ];

  // Since we can't run DDL via REST easily, we'll use a workaround:
  // Supabase allows DDL via the pg connection. We'll use node-postgres if available,
  // or return the SQL for the user to run manually.

  try {
    const { Client } = await import('pg');

    // Supabase pooler connection string format
    const projectRef = url.replace('https://', '').replace('.supabase.co', '');
    const dbUrl = process.env.DATABASE_URL ||
      `postgresql://postgres.${projectRef}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

    if (!process.env.DATABASE_URL && !process.env.SUPABASE_DB_PASSWORD) {
      // Can't connect — return the SQL for manual execution
      return NextResponse.json({
        message: 'Cannot auto-migrate. Run this SQL in your Supabase Dashboard → SQL Editor:',
        sql: migrations.join(';\n') + ';',
      }, { status: 200 });
    }

    const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    for (const sql of migrations) {
      await client.query(sql);
    }
    await client.end();
    return NextResponse.json({ message: 'Migration applied successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Return the SQL so the user can run it manually
    return NextResponse.json({
      message: 'Auto-migration failed. Run this SQL in Supabase Dashboard → SQL Editor:',
      sql: migrations.join(';\n') + ';',
      error: message,
    }, { status: 200 });
  }
}
