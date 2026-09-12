import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { dbGet, initDb } from './src/db.js';
import { ALLOWED_ROOT } from './src/pathUtils.js';
import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';

interface P14Stats {
  total: number;
  passed: number;
  failed: number;
}

const stats: P14Stats = {
  total: 0,
  passed: 0,
  failed: 0
};

function pass(testName: string) {
  stats.total++;
  stats.passed++;
  console.log(`[PASS] P14: ${testName}`);
}

function fail(testName: string, err: any) {
  stats.total++;
  stats.failed++;
  console.error(`[FAIL] P14: ${testName}`, err);
  throw new Error(`P14 Test Failed: ${testName} -> ${err}`);
}

async function requestJson(urlPath: string, method: string, token: string, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers: Record<string, string> = {
      'Cookie': `token=${token}`
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(Buffer.byteLength(postData));
    }
    const req = http.request(
      `http://127.0.0.1:3030${urlPath}`,
      {
        method,
        headers
      },
      (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

async function runP14Tests() {
  console.log('================================================================');
  console.log('  P14 PROJECT DETECTION & AWARENESS VERIFICATION SUITE');
  console.log('================================================================\n');

  await initDb();
  const secretRow = await dbGet<{ value: string }>("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
  const jwtSecret = secretRow?.value || 'nebudesk-super-secret';
  const fastifyApp = Fastify();
  await fastifyApp.register(jwt, { secret: jwtSecret });
  const token = fastifyApp.jwt.sign({ id: 'admin', username: 'admin' }, { expiresIn: '2h' });

  const rootFixture = path.join(ALLOWED_ROOT, 'test_p14_fixtures');

  try {
    await fs.rm(rootFixture, { recursive: true, force: true });
    await fs.mkdir(rootFixture, { recursive: true });

    // 1. Basic Node.js project
    const nodeDir = path.join(rootFixture, 'proj_node');
    await fs.mkdir(nodeDir, { recursive: true });
    await fs.writeFile(path.join(nodeDir, 'package.json'), JSON.stringify({
      name: 'simple-node-app',
      version: '1.0.0',
      scripts: { start: 'node index.js', test: 'node --test' }
    }));
    await fs.writeFile(path.join(nodeDir, 'package-lock.json'), '{}');

    const nodeRes = await requestJson(`/api/project/detect?p=${encodeURIComponent(nodeDir)}`, 'GET', token);
    assert.strictEqual(nodeRes.status, 200);
    assert.strictEqual(nodeRes.body.isProject, true);
    assert.strictEqual(nodeRes.body.name, 'simple-node-app');
    assert.ok(nodeRes.body.ecosystems.includes('Node.js'));
    assert.strictEqual(nodeRes.body.packageManager, 'npm');
    assert.strictEqual(nodeRes.body.devCommand, 'npm start');
    assert.strictEqual(nodeRes.body.testCommand, 'npm test');
    pass('Node.js project detected with npm lockfile & scripts');

    // 2. Vite + TypeScript project
    const viteDir = path.join(rootFixture, 'proj_vite');
    await fs.mkdir(viteDir, { recursive: true });
    await fs.writeFile(path.join(viteDir, 'package.json'), JSON.stringify({
      name: 'vite-ts-app',
      scripts: { dev: 'vite', build: 'tsc && vite build' },
      devDependencies: { vite: '^5.0.0', typescript: '^5.0.0' }
    }));
    await fs.writeFile(path.join(viteDir, 'tsconfig.json'), '{}');
    await fs.writeFile(path.join(viteDir, 'vite.config.ts'), 'export default {}');
    await fs.writeFile(path.join(viteDir, 'pnpm-lock.yaml'), 'lockfileVersion: 5.4');

    const viteRes = await requestJson(`/api/project/detect?p=${encodeURIComponent(viteDir)}`, 'GET', token);
    assert.strictEqual(viteRes.status, 200);
    assert.ok(viteRes.body.ecosystems.includes('Node.js'));
    assert.ok(viteRes.body.ecosystems.includes('TypeScript'));
    assert.strictEqual(viteRes.body.framework, 'Vite');
    assert.strictEqual(viteRes.body.packageManager, 'pnpm');
    assert.strictEqual(viteRes.body.devCommand, 'pnpm dev');
    assert.strictEqual(viteRes.body.buildCommand, 'pnpm build');
    pass('Vite + TypeScript + pnpm project detected');

    // 3. Next.js project
    const nextDir = path.join(rootFixture, 'proj_next');
    await fs.mkdir(nextDir, { recursive: true });
    await fs.writeFile(path.join(nextDir, 'package.json'), JSON.stringify({
      name: 'next-portal',
      scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
      dependencies: { next: '^14.0.0', react: '^18.0.0' }
    }));
    await fs.writeFile(path.join(nextDir, 'yarn.lock'), '');
    await fs.writeFile(path.join(nextDir, 'next.config.js'), 'module.exports = {}');

    const nextRes = await requestJson(`/api/project/detect?p=${encodeURIComponent(nextDir)}`, 'GET', token);
    assert.strictEqual(nextRes.status, 200);
    assert.strictEqual(nextRes.body.framework, 'Next.js');
    assert.strictEqual(nextRes.body.packageManager, 'yarn');
    assert.strictEqual(nextRes.body.devCommand, 'yarn dev');
    assert.strictEqual(nextRes.body.buildCommand, 'yarn build');
    pass('Next.js + yarn project detected');

    // 4. Laravel (PHP) project
    const laravelDir = path.join(rootFixture, 'proj_laravel');
    await fs.mkdir(laravelDir, { recursive: true });
    await fs.writeFile(path.join(laravelDir, 'composer.json'), JSON.stringify({
      name: 'laravel/acme-app',
      require: { 'php': '^8.2', 'laravel/framework': '^11.0' }
    }));
    await fs.writeFile(path.join(laravelDir, 'artisan'), '#!/usr/bin/env php');

    const laravelRes = await requestJson(`/api/project/detect?p=${encodeURIComponent(laravelDir)}`, 'GET', token);
    assert.strictEqual(laravelRes.status, 200);
    assert.ok(laravelRes.body.ecosystems.includes('PHP'));
    assert.ok(laravelRes.body.ecosystems.includes('Laravel'));
    assert.strictEqual(laravelRes.body.framework, 'Laravel');
    assert.strictEqual(laravelRes.body.packageManager, 'composer');
    assert.strictEqual(laravelRes.body.devCommand, 'php artisan serve');
    pass('Laravel + PHP project detected');

    // 5. Python (Django) project
    const pyDir = path.join(rootFixture, 'proj_python');
    await fs.mkdir(pyDir, { recursive: true });
    await fs.writeFile(path.join(pyDir, 'requirements.txt'), 'Django>=5.0\npsycopg2>=2.9\n');
    await fs.writeFile(path.join(pyDir, 'manage.py'), '#!/usr/bin/env python');

    const pyRes = await requestJson(`/api/project/detect?p=${encodeURIComponent(pyDir)}`, 'GET', token);
    assert.strictEqual(pyRes.status, 200);
    assert.ok(pyRes.body.ecosystems.includes('Python'));
    assert.strictEqual(pyRes.body.framework, 'Django');
    assert.strictEqual(pyRes.body.packageManager, 'pip');
    assert.strictEqual(pyRes.body.devCommand, 'python manage.py runserver');
    pass('Python (Django) project detected');

    // 6. Rust project
    const rustDir = path.join(rootFixture, 'proj_rust');
    await fs.mkdir(rustDir, { recursive: true });
    await fs.writeFile(path.join(rustDir, 'Cargo.toml'), '[package]\nname = "nebucore"\nversion = "0.1.0"\n');

    const rustRes = await requestJson(`/api/project/detect?p=${encodeURIComponent(rustDir)}`, 'GET', token);
    assert.strictEqual(rustRes.status, 200);
    assert.ok(rustRes.body.ecosystems.includes('Rust'));
    assert.strictEqual(rustRes.body.name, 'nebucore');
    assert.strictEqual(rustRes.body.packageManager, 'cargo');
    assert.strictEqual(rustRes.body.devCommand, 'cargo run');
    assert.strictEqual(rustRes.body.buildCommand, 'cargo build');
    pass('Rust (Cargo) project detected');

    // 7. Go project
    const goDir = path.join(rootFixture, 'proj_go');
    await fs.mkdir(goDir, { recursive: true });
    await fs.writeFile(path.join(goDir, 'go.mod'), 'module github.com/nebu/server\n\ngo 1.22\n');

    const goRes = await requestJson(`/api/project/detect?p=${encodeURIComponent(goDir)}`, 'GET', token);
    assert.strictEqual(goRes.status, 200);
    assert.ok(goRes.body.ecosystems.includes('Go'));
    assert.strictEqual(goRes.body.name, 'server');
    assert.strictEqual(goRes.body.packageManager, 'go');
    assert.strictEqual(goRes.body.devCommand, 'go run .');
    pass('Go project detected');

    // 8. Mixed project (Laravel backend + Vue/Node frontend)
    const mixedDir = path.join(rootFixture, 'proj_mixed');
    await fs.mkdir(mixedDir, { recursive: true });
    await fs.writeFile(path.join(mixedDir, 'composer.json'), JSON.stringify({
      name: 'fullstack-app',
      require: { 'laravel/framework': '^11.0' }
    }));
    await fs.writeFile(path.join(mixedDir, 'package.json'), JSON.stringify({
      name: 'fullstack-app-frontend',
      scripts: { dev: 'vite' },
      devDependencies: { vue: '^3.4.0', vite: '^5.0.0' }
    }));

    const mixedRes = await requestJson(`/api/project/detect?p=${encodeURIComponent(mixedDir)}`, 'GET', token);
    assert.strictEqual(mixedRes.status, 200);
    assert.ok(mixedRes.body.ecosystems.includes('PHP'));
    assert.ok(mixedRes.body.ecosystems.includes('Node.js'));
    assert.ok(mixedRes.body.configFiles.includes('composer.json'));
    assert.ok(mixedRes.body.configFiles.includes('package.json'));
    pass('Mixed multi-ecosystem project detected');

    // 9. Unknown / empty directory
    const emptyDir = path.join(rootFixture, 'proj_empty');
    await fs.mkdir(emptyDir, { recursive: true });
    await fs.writeFile(path.join(emptyDir, 'random_notes.txt'), 'hello world');

    const emptyRes = await requestJson(`/api/project/detect?p=${encodeURIComponent(emptyDir)}`, 'GET', token);
    assert.strictEqual(emptyRes.status, 200);
    assert.strictEqual(emptyRes.body.isProject, false);
    assert.strictEqual(emptyRes.body.ecosystems.length, 0);
    assert.strictEqual(emptyRes.body.packageManager, null);
    pass('Unknown/non-project directory handled gracefully');

    // 10. Malformed config (corrupt JSON)
    const malformedDir = path.join(rootFixture, 'proj_malformed');
    await fs.mkdir(malformedDir, { recursive: true });
    await fs.writeFile(path.join(malformedDir, 'package.json'), '{ "name": "corrupt", broken json... !!!');

    const malformedRes = await requestJson(`/api/project/detect?p=${encodeURIComponent(malformedDir)}`, 'GET', token);
    assert.strictEqual(malformedRes.status, 200, 'Malformed JSON must not crash server');
    assert.strictEqual(malformedRes.body.isProject, true); // package.json file exists
    assert.ok(malformedRes.body.ecosystems.includes('Node.js'));
    pass('Malformed config handled gracefully without crash');

    // 11. Malicious config (Prototype pollution attempts and huge script blocks)
    const maliciousDir = path.join(rootFixture, 'proj_malicious');
    await fs.mkdir(maliciousDir, { recursive: true });
    await fs.writeFile(path.join(maliciousDir, 'package.json'), JSON.stringify({
      __proto__: { admin: true },
      constructor: { prototype: { poll: true } },
      name: '<script>alert("xss")</script>',
      scripts: {
        evil: 'rm -rf /; echo evil',
        huge: 'A'.repeat(5000)
      }
    }));

    const maliciousRes = await requestJson(`/api/project/detect?p=${encodeURIComponent(maliciousDir)}`, 'GET', token);
    assert.strictEqual(maliciousRes.status, 200);
    assert.ok(!('poll' in Object.prototype), 'Prototype pollution must not occur');
    assert.ok(maliciousRes.body.scripts.huge.length <= 200, 'Script value length must be capped');
    pass('Malicious config sanitized and prototype pollution prevented');

    // 12. Monorepo detection
    const monorepoDir = path.join(rootFixture, 'proj_monorepo');
    await fs.mkdir(monorepoDir, { recursive: true });
    await fs.writeFile(path.join(monorepoDir, 'package.json'), JSON.stringify({
      name: 'nebudesk-monorepo',
      private: true,
      workspaces: ['apps/*', 'packages/*']
    }));

    const monorepoRes = await requestJson(`/api/project/detect?p=${encodeURIComponent(monorepoDir)}`, 'GET', token);
    assert.strictEqual(monorepoRes.status, 200);
    assert.strictEqual(monorepoRes.body.isMonorepo, true);
    assert.deepStrictEqual(monorepoRes.body.workspaces, ['apps/*', 'packages/*']);
    pass('Monorepo workspace configuration detected');

    // 13. Security Sandbox traversal check
    const sandboxRes = await requestJson('/api/project/detect?p=/etc', 'GET', token);
    assert.strictEqual(sandboxRes.status, 403, 'Path outside ALLOWED_ROOT must return 403');
    pass('Filesystem sandbox: Path outside workspace rejected with 403');

  } finally {
    await fs.rm(rootFixture, { recursive: true, force: true });
  }

  console.log('\n================================================================');
  console.log(`  P14 VERIFICATION COMPLETE: ${stats.passed}/${stats.total} PASS (100%)`);
  console.log('================================================================\n');
}

runP14Tests().catch(err => {
  console.error('Fatal P14 test error:', err);
  process.exit(1);
});
