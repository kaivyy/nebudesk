import assert from 'assert';
import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { dbGet, initDb } from './src/db.js';
import { parseDiagnostics } from './src/diagnosticsParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('================================================================');
  console.log('  P18 DIAGNOSTICS & PROBLEMS VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function pass(msg: string) {
    passed++;
    total++;
    console.log(`[PASS] P18: ${msg}`);
  }

  function fail(msg: string, err: any) {
    total++;
    console.error(`[FAIL] P18: ${msg}`);
    console.error(err);
  }

  // Setup auth token for API calls
  await initDb();
  const secretRow = await dbGet<{ value: string }>("SELECT value FROM Settings WHERE key = 'JWT_SECRET'");
  const jwtSecret = secretRow?.value || 'nebudesk-super-secret';
  const fastifyApp = Fastify();
  await fastifyApp.register(jwt, { secret: jwtSecret });
  const user = await dbGet('SELECT * FROM User LIMIT 1') as { id: string; username: string };
  const token = fastifyApp.jwt.sign({ id: user.id, username: user.username });

  const apiRequest = async (endpoint: string, body: any): Promise<{ status: number; body: any }> => {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = http.request(`http://127.0.0.1:3030${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          Cookie: `token=${token}`
        }
      }, (res) => {
        let resData = '';
        res.on('data', chunk => resData += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, body: JSON.parse(resData) });
          } catch {
            resolve({ status: res.statusCode || 500, body: resData });
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  };

  // 1. TypeScript Diagnostic Parser (Parentheses & Colon formats)
  try {
    const tsOutput = `
src/index.ts(42,15): error TS2304: Cannot find name 'foo'.
src/utils.ts:18:5 - warning TS6133: 'bar' is declared but its value is never read.
    `;
    const res = parseDiagnostics(tsOutput, '/root/project');
    assert.strictEqual(res.diagnostics.length, 2);
    assert.strictEqual(res.summary.errors, 1);
    assert.strictEqual(res.summary.warnings, 1);
    
    assert.strictEqual(res.diagnostics[0]?.file, 'src/index.ts');
    assert.strictEqual(res.diagnostics[0]?.line, 42);
    assert.strictEqual(res.diagnostics[0]?.column, 15);
    assert.strictEqual(res.diagnostics[0]?.code, 'TS2304');
    assert.strictEqual(res.diagnostics[0]?.severity, 'error');

    assert.strictEqual(res.diagnostics[1]?.file, 'src/utils.ts');
    assert.strictEqual(res.diagnostics[1]?.line, 18);
    assert.strictEqual(res.diagnostics[1]?.column, 5);
    assert.strictEqual(res.diagnostics[1]?.code, 'TS6133');
    assert.strictEqual(res.diagnostics[1]?.severity, 'warning');
    pass('TypeScript Diagnostics Parser: Extracted errors, warnings, codes and coordinates accurately');
  } catch (e) {
    fail('TypeScript Diagnostics Parser: Extracted errors, warnings, codes and coordinates accurately', e);
  }

  // 2. ESLint Diagnostic Parser (Tabular and Inline formats)
  try {
    const eslintOutput = `
src/App.tsx:25:10: error: 'x' is defined but never used. [eslint/no-unused-vars]
/root/project/src/Header.tsx
  14:5  warning  Unexpected console statement  no-console
    `;
    const res = parseDiagnostics(eslintOutput, '/root/project');
    assert.strictEqual(res.diagnostics.length, 2);
    assert.strictEqual(res.diagnostics[0]?.file, 'src/App.tsx');
    assert.strictEqual(res.diagnostics[0]?.code, 'eslint/no-unused-vars');
    assert.strictEqual(res.diagnostics[0]?.severity, 'error');

    assert.strictEqual(res.diagnostics[1]?.file, 'src/Header.tsx');
    assert.strictEqual(res.diagnostics[1]?.line, 14);
    assert.strictEqual(res.diagnostics[1]?.column, 5);
    assert.strictEqual(res.diagnostics[1]?.code, 'no-console');
    assert.strictEqual(res.diagnostics[1]?.severity, 'warning');
    pass('ESLint Diagnostics Parser: Handled inline and tabular outputs with normalized paths');
  } catch (e) {
    fail('ESLint Diagnostics Parser: Handled inline and tabular outputs with normalized paths', e);
  }

  // 3. Rust Diagnostics Parser (rustc / cargo check)
  try {
    const rustOutput = `
error[E0425]: cannot find value \`x\` in this scope
  --> src/main.rs:14:5
   |
14 |     x + 1
   |     ^ not found in this scope
warning[W0001]: unused variable: \`y\`
  --> src/lib.rs:22:9
    `;
    const res = parseDiagnostics(rustOutput, '/root/rust_proj');
    assert.strictEqual(res.diagnostics.length, 2);
    assert.strictEqual(res.diagnostics[0]?.file, 'src/main.rs');
    assert.strictEqual(res.diagnostics[0]?.line, 14);
    assert.strictEqual(res.diagnostics[0]?.column, 5);
    assert.strictEqual(res.diagnostics[0]?.code, 'E0425');
    assert.strictEqual(res.diagnostics[0]?.source, 'rustc');
    assert.strictEqual(res.diagnostics[0]?.severity, 'error');

    assert.strictEqual(res.diagnostics[1]?.file, 'src/lib.rs');
    assert.strictEqual(res.diagnostics[1]?.code, 'W0001');
    assert.strictEqual(res.diagnostics[1]?.severity, 'warning');
    pass('Rust Diagnostics Parser: Handled multi-line compiler errors with arrow pointers');
  } catch (e) {
    fail('Rust Diagnostics Parser: Handled multi-line compiler errors with arrow pointers', e);
  }

  // 4. Python Diagnostics Parser (Flake8 and Tracebacks)
  try {
    const pythonOutput = `
app/main.py:10:5: F401 'os' imported but unused
app/main.py:12:1: E302 expected 2 blank lines
Traceback (most recent call last):
  File "app/calc.py", line 42, in <module>
    res = 10 / 0
ZeroDivisionError: division by zero
    `;
    const res = parseDiagnostics(pythonOutput, '/root/py_proj');
    assert.strictEqual(res.diagnostics.length, 3);
    assert.strictEqual(res.diagnostics[0]?.file, 'app/main.py');
    assert.strictEqual(res.diagnostics[0]?.code, 'F401');
    assert.strictEqual(res.diagnostics[0]?.source, 'flake8');

    assert.strictEqual(res.diagnostics[2]?.file, 'app/calc.py');
    assert.strictEqual(res.diagnostics[2]?.line, 42);
    assert.strictEqual(res.diagnostics[2]?.code, 'ZeroDivisionError');
    assert.strictEqual(res.diagnostics[2]?.source, 'python');
    pass('Python Diagnostics Parser: Handled linter codes (F401, E302) and runtime tracebacks');
  } catch (e) {
    fail('Python Diagnostics Parser: Handled linter codes (F401, E302) and runtime tracebacks', e);
  }

  // 5. Go Diagnostics Parser
  try {
    const goOutput = `
./main.go:15:2: undefined: fmt.Printlnn
pkg/utils.go:20:10: syntax error: unexpected semicolon
    `;
    const res = parseDiagnostics(goOutput, '/root/go_proj');
    assert.strictEqual(res.diagnostics.length, 2);
    assert.strictEqual(res.diagnostics[0]?.file, 'main.go');
    assert.strictEqual(res.diagnostics[0]?.line, 15);
    assert.strictEqual(res.diagnostics[0]?.column, 2);
    assert.strictEqual(res.diagnostics[0]?.source, 'go');
    pass('Go Diagnostics Parser: Handled go build / go vet compiler syntax and error formats');
  } catch (e) {
    fail('Go Diagnostics Parser: Handled go build / go vet compiler syntax and error formats', e);
  }

  // 6. API: POST /api/diagnostics/parse
  try {
    const res = await apiRequest('/api/diagnostics/parse', {
      output: 'src/app.ts(10,5): error TS2304: Cannot find name \'test\'.',
      workspace: '/root/nebudesk'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.diagnostics.length, 1);
    assert.strictEqual(res.body.diagnostics[0].code, 'TS2304');
    assert.strictEqual(res.body.summary.errors, 1);
    pass('API /api/diagnostics/parse: Parsed arbitrary compiler output into structured response');
  } catch (e) {
    fail('API /api/diagnostics/parse: Parsed arbitrary compiler output into structured response', e);
  }

  // 7. API: POST /api/diagnostics/run with project workspace
  try {
    const res = await apiRequest('/api/diagnostics/run', {
      workspace: '/root/nebudesk/apps/server',
      tool: 'tsc'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.diagnostics), 'Diagnostics should be an array');
    assert(typeof res.body.summary === 'object', 'Summary should be an object');
    pass('API /api/diagnostics/run: Executed project diagnostics safely and parsed output');
  } catch (e) {
    fail('API /api/diagnostics/run: Executed project diagnostics safely and parsed output', e);
  }

  // 8. Security: Path Traversal on /api/diagnostics/run
  try {
    const res = await apiRequest('/api/diagnostics/run', {
      workspace: '/root/nebudesk/../../etc',
      tool: 'tsc'
    });
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
    pass('Security Traversal: Diagnostics execution outside sandbox rejected with 403');
  } catch (e) {
    fail('Security Traversal: Diagnostics execution outside sandbox rejected with 403', e);
  }

  // 9. Security: Command Injection & Non-Whitelisted Binary Rejection
  try {
    const res1 = await apiRequest('/api/diagnostics/run', {
      workspace: '/root/nebudesk',
      command: 'npx tsc; cat /etc/passwd'
    });
    assert.strictEqual(res1.status, 400, 'Shell metacharacters must be rejected with 400');

    const res2 = await apiRequest('/api/diagnostics/run', {
      workspace: '/root/nebudesk',
      command: 'curl http://evil.com'
    });
    assert.strictEqual(res2.status, 400, 'Non-whitelisted executable must be rejected with 400');
    pass('Security Injection: Command injection metacharacters and unwhitelisted tools blocked');
  } catch (e) {
    fail('Security Injection: Command injection metacharacters and unwhitelisted tools blocked', e);
  }

  // 10. Frontend Implementation Contracts (CodeApp.tsx)
  try {
    const codeAppSrc = await fs.readFile(path.resolve(__dirname, '../web/src/apps/code/CodeApp.tsx'), 'utf-8');
    assert(codeAppSrc.includes("bottomPanelTab === 'problems'"), 'CodeApp must have Problems bottom panel tab');
    assert(codeAppSrc.includes('/api/diagnostics/run'), 'CodeApp must wire /api/diagnostics/run endpoint');
    assert(codeAppSrc.includes('setModelMarkers'), 'CodeApp must sync diagnostics with Monaco editor markers');
    assert(codeAppSrc.includes('jumpToProblem'), 'CodeApp must implement click-to-jump navigation');
    assert(codeAppSrc.includes("KeyCode.KeyM"), 'CodeApp must support Ctrl+Shift+M shortcut for Problems');
    assert(codeAppSrc.includes('AlertCircle') && codeAppSrc.includes('AlertTriangle'), 'CodeApp must render severity icons');
    pass('Frontend Contracts: Problems panel, Monaco markers, click-to-jump & keybindings verified');
  } catch (e) {
    fail('Frontend Contracts: Problems panel, Monaco markers, click-to-jump & keybindings verified', e);
  }

  console.log('\n================================================================');
  console.log(`  P18 VERIFICATION COMPLETE: ${passed}/${total} PASS (${Math.round(passed / total * 100)}%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error in verify_p18:', err);
  process.exit(1);
});
