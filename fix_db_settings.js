const fs = require('fs');
let code = fs.readFileSync('apps/server/src/db.ts', 'utf8');
const target = `  await dbRun(\`
    CREATE TABLE IF NOT EXISTS Documents (`;
const replacement = `  await dbRun(\`
    CREATE TABLE IF NOT EXISTS Settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  \`);

  await dbRun(\`
    CREATE TABLE IF NOT EXISTS Documents (`;
code = code.replace(target, replacement);
fs.writeFileSync('apps/server/src/db.ts', code);
