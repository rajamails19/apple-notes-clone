import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'notes.db');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
    runMigrations(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id        TEXT PRIMARY KEY,
      folderId  TEXT NOT NULL,
      title     TEXT NOT NULL DEFAULT '',
      content   TEXT NOT NULL DEFAULT '',
      pinned    INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (folderId) REFERENCES folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS images (
      id       TEXT PRIMARY KEY,
      noteId   TEXT NOT NULL,
      filename TEXT NOT NULL,
      url      TEXT NOT NULL,
      FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE
    );
  `);

  // Seed default folders once
  const count = (db.prepare('SELECT COUNT(*) as c FROM folders').get() as { c: number }).c;
  if (count === 0) {
    const now = new Date().toISOString();
    const ins = db.prepare('INSERT INTO folders (id, name, createdAt) VALUES (?, ?, ?)');
    ['Notes', 'Ideas', 'Personal', 'Work'].forEach((name, i) => ins.run(`default-${i + 1}`, name, now));
  }
}

function runMigrations(db: Database.Database) {
  const migrations = [
    'ALTER TABLE notes ADD COLUMN pinned    INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE notes ADD COLUMN trashed   INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE notes ADD COLUMN trashedAt TEXT',
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
}

export { getDb, UPLOADS_DIR };
