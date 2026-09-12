import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('===============================================================');
console.log('  NEBUDESK P8: DEPENDENCY, INSTALL & RUNTIME OPTIMIZATION     ');
console.log('===============================================================');

// 1. Check server compiled artifacts
console.log('\n>>> CHECK 1: COMPILED ARTIFACTS');
const distDir = path.resolve(__dirname, 'dist');
assert.ok(fs.existsSync(path.join(distDir, 'index.js')), 'apps/server/dist/index.js must exist');
assert.ok(fs.existsSync(path.join(distDir, 'pathUtils.js')), 'apps/server/dist/pathUtils.js must exist');
assert.ok(fs.existsSync(path.join(distDir, 'urlValidator.js')), 'apps/server/dist/urlValidator.js must exist');
console.log('[PASS] Compiled server dist/ artifacts exist and are ready for production');

// 2. Check web package separation
console.log('\n>>> CHECK 2: FRONTEND BUILD DEPENDENCY SEPARATION');
const webPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../web/package.json'), 'utf8'));
assert.ok(!webPkg.dependencies['@tailwindcss/vite'], '@tailwindcss/vite must be in devDependencies');
assert.ok(!webPkg.dependencies['tailwindcss'], 'tailwindcss must be in devDependencies');
assert.ok(webPkg.devDependencies['@tailwindcss/vite'], '@tailwindcss/vite must exist in devDependencies');
assert.ok(webPkg.devDependencies['tailwindcss'], 'tailwindcss must exist in devDependencies');
console.log('[PASS] Build-only CSS compiler dependencies moved to devDependencies');

// 3. Check server package scripts
console.log('\n>>> CHECK 3: SERVER SCRIPTS & RUNTIME TARGET');
const serverPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));
assert.strictEqual(serverPkg.scripts.build, 'tsc', 'Build script must be tsc');
assert.strictEqual(serverPkg.scripts.start, 'node dist/index.js', 'Start script must run compiled node dist/index.js');
console.log('[PASS] Server package.json contains production build & start scripts');

// 4. Verify ZERO Chromium / Playwright / CDP in dependencies
console.log('\n>>> CHECK 4: ZERO BROWSER DEPENDENCIES');
const allDeps = {
  ...serverPkg.dependencies,
  ...serverPkg.devDependencies,
  ...webPkg.dependencies,
  ...webPkg.devDependencies
};
const forbidden = ['chromium', 'chrome', 'playwright', 'playwright-core', 'puppeteer'];
for (const f of forbidden) {
  assert.ok(!allDeps[f], `Forbidden dependency ${f} must not exist in any package.json`);
}
console.log('[PASS] Zero browser automation dependencies in package manifests');

// 5. Verify PM2 runs compiled backend
console.log('\n>>> CHECK 5: PM2 RUNTIME ARTIFACT VERIFICATION');
const pm2Data = JSON.parse(execSync('pm2 jlist', { encoding: 'utf8' }));
const backend = pm2Data.find((p: any) => p.name === 'nebudesk-backend');
assert.ok(backend, 'nebudesk-backend must be registered in PM2');
assert.strictEqual(backend.pm2_env.status, 'online', 'nebudesk-backend must be online');
assert.ok(
  backend.pm2_env.pm_exec_path.includes('dist/index.js') || (backend.pm2_env.args && backend.pm2_env.args.includes('dist/index.js')),
  'nebudesk-backend must execute dist/index.js'
);
console.log('[PASS] PM2 executes compiled JavaScript dist/index.js directly without tsx wrapper');

console.log('\n===============================================================');
console.log('  P8 OPTIMIZATION CHECKS: ALL 5/5 PASSED                       ');
console.log('===============================================================');
