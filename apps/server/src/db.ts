import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./dev.db');

export const dbRun = promisify(db.run.bind(db));
export const dbGet = promisify(db.get.bind(db));
export const dbAll = promisify(db.all.bind(db));

export async function initDb() {
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

  // Seed default admin
  const admin = await dbGet(`SELECT * FROM User WHERE username = 'admin'`);
  if (!admin) {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('admin', 10);
    const userId = crypto.randomUUID();
    await dbRun(`INSERT INTO User (id, username, password) VALUES (?, ?, ?)`, [userId, 'admin', hash]);
    await dbRun(`INSERT INTO DesktopState (id, userId) VALUES (?, ?)`, [crypto.randomUUID(), userId]);
    console.log('Seeded admin user');
  }
}
