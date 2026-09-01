const { execSync } = require('child_process');
try {
  const out = execSync('pm2 jlist', { encoding: 'utf-8' });
  const data = JSON.parse(out);
  console.log(data.map(app => app.name));
} catch (e) {
  console.log("pm2 failed", e.message);
}
