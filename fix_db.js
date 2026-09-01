const fs = require('fs');
let code = fs.readFileSync('apps/server/src/db.ts', 'utf8');

code = code.replace("export const dbRun = promisify(db.run.bind(db));", "export const dbRun = promisify(db.run.bind(db)) as any;");
code = code.replace("export const dbGet = promisify(db.get.bind(db));", "export const dbGet = promisify(db.get.bind(db)) as any;");
code = code.replace("export const dbAll = promisify(db.all.bind(db));", "export const dbAll = promisify(db.all.bind(db)) as any;");

fs.writeFileSync('apps/server/src/db.ts', code);
