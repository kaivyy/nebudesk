import sqlite3 from 'sqlite3';


import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../dev.db');
const db = new sqlite3.Database(dbPath);

export function dbRun(sql: string, params: unknown[] = []): Promise<sqlite3.RunResult> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function dbGet<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

export function dbAll<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve((rows || []) as T[]);
    });
  });
}

export async function initDb() {
  await dbRun('PRAGMA journal_mode = WAL');
  await dbRun('PRAGMA busy_timeout = 5000');
  await dbRun('PRAGMA synchronous = NORMAL');

  await dbRun(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS DesktopState (
      id TEXT PRIMARY KEY,
      userId TEXT UNIQUE,
      wallpaper TEXT DEFAULT 'default',
      theme TEXT DEFAULT 'system',
      windowsJson TEXT DEFAULT '[]',
      FOREIGN KEY (userId) REFERENCES User(id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS Applications (
      id TEXT PRIMARY KEY,
      name TEXT,
      runtime TEXT,
      identifier TEXT,
      internalHost TEXT DEFAULT '127.0.0.1',
      internalPort INTEGER,
      publicDomain TEXT,
      proxyEnabled INTEGER DEFAULT 0,
      cfEnabled INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS Settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS Documents (
      id TEXT PRIMARY KEY,
      userId TEXT,
      name TEXT,
      type TEXT,
      content TEXT DEFAULT '',
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id)
    )
  `);

  // Ensure JWT Secret exists in Settings
  let jwtSecretRow = await dbGet<{ value: string }>(`SELECT value FROM Settings WHERE key = 'JWT_SECRET'`);
  if (!jwtSecretRow) {
    const crypto = await import('crypto');
    const newSecret = process.env.NEBUDESK_JWT_SECRET || crypto.randomBytes(64).toString('hex');
    await dbRun(`INSERT INTO Settings (key, value) VALUES ('JWT_SECRET', ?)`, [newSecret]);
    jwtSecretRow = { value: newSecret };
  }
  process.env.RUNTIME_JWT_SECRET = jwtSecretRow.value;

  // Check if admin user exists
  const admin = await dbGet(`SELECT * FROM User WHERE username = 'admin'`);
  if (!admin) {
    const bcrypt = await import('bcrypt');
    const crypto = await import('crypto');
    
    // Use environment provided password or generate a random one
    const isProvided = !!process.env.ADMIN_PASSWORD;
    const initialPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('hex');
    const hash = await bcrypt.hash(initialPassword, 10);
    const userId = crypto.randomUUID();
    
    await dbRun(`INSERT INTO User (id, username, password) VALUES (?, ?, ?)`, [userId, 'admin', hash]);
    await dbRun(`INSERT INTO DesktopState (id, userId) VALUES (?, ?)`, [crypto.randomUUID(), userId]);
    
    if (!isProvided) {
      await dbRun(`INSERT OR REPLACE INTO Settings (key, value) VALUES ('ADMIN_SETUP_REQUIRED', 'true')`);
      console.log('======================================================================');
      console.log('🔒 SECURITY NOTICE: Default admin user created.');
      console.log(`🔑 Initial Password: ${initialPassword}`);
      console.log('⚠️  Please login and change this password immediately.');
      console.log('======================================================================');
    }
  }
}

export async function getJwtSecret() {
  const row = await dbGet(`SELECT value FROM Settings WHERE key = 'JWT_SECRET'`);
  return row ? row.value : (process.env.RUNTIME_JWT_SECRET || 'fallback-error');
}
