import assert from 'assert';
import { isUrlAllowed } from './src/urlValidator.js';
import { safeResolve, ALLOWED_ROOT } from './src/pathUtils.js';

async function runTests() {
  console.log('Running Security Regression Tests...');

  // 1. SSRF Tests
  console.log('Testing SSRF validator...');
  assert.strictEqual((await isUrlAllowed('http://localhost')).allowed, false, 'localhost should be blocked');
  assert.strictEqual((await isUrlAllowed('http://127.0.0.1')).allowed, false, '127.0.0.1 should be blocked');
  assert.strictEqual((await isUrlAllowed('http://[::1]')).allowed, false, '::1 should be blocked');
  assert.strictEqual((await isUrlAllowed('http://192.168.1.1')).allowed, false, '192.168.x.x should be blocked');
  assert.strictEqual((await isUrlAllowed('http://169.254.169.254')).allowed, false, 'Cloud metadata should be blocked');
  assert.strictEqual((await isUrlAllowed('file:///etc/passwd')).allowed, false, 'file protocol should be blocked');
  assert.strictEqual((await isUrlAllowed('https://google.com')).allowed, true, 'google.com should be allowed');

  // 2. Filesystem Sandboxing Tests
  console.log('Testing Filesystem sandboxing...');
  let errorCaught = false;
  try { await safeResolve('../../etc/passwd'); } catch(e) { errorCaught = true; }
  assert.strictEqual(errorCaught, true, 'Traversal outside root should be blocked');

  errorCaught = false;
  try { await safeResolve('/etc/passwd'); } catch(e) { errorCaught = true; }
  assert.strictEqual(errorCaught, true, 'Absolute paths outside root should be blocked');

  // The test passed if we get here
  console.log('All minimal security tests PASSED.');
}

runTests().catch(e => {
  console.error('TEST FAILED:', e);
  process.exit(1);
});
