const { test } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function boot(root) {
  const portFile = path.join(root, 'data', '.guide-url');
  const proc = spawn(process.execPath, [path.join(__dirname, 'guide-server.js'), root], { stdio: 'ignore' });
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const timer = setInterval(() => {
      if (fs.existsSync(portFile)) {
        clearInterval(timer);
        resolve({ proc, url: fs.readFileSync(portFile, 'utf8').trim() });
      } else if (Date.now() - t0 > 8000) {
        clearInterval(timer);
        reject(new Error('guide-url not written in time'));
      }
    }, 100);
  });
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qdip-guide-'));
  fs.mkdirSync(path.join(root, 'data'), { recursive: true });
  return root;
}

test('server writes .guide-url and answers /api/status with providers', async () => {
  const root = makeRoot();
  const { proc, url } = await boot(root);
  try {
    const res = await fetch(url.replace('/setup/first-run.html', '/api/status'));
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.ok, true);
    assert.ok(body.providers.deepseek);
  } finally {
    proc.kill();
  }
});

test('POST /api/test with fake key returns ok:false structure', async () => {
  const root = makeRoot();
  const { proc, url } = await boot(root);
  try {
    const base = url.replace('/setup/first-run.html', '');
    const res = await fetch(base + '/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'deepseek', apiKey: 'sk-invalid-dummy-key-123' }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.ok, false);
    assert.strictEqual(typeof body.error, 'string');
  } finally {
    proc.kill();
  }
});

test('path traversal does not leak files outside setup', async () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'data', '.configured'), 'secret', 'utf8');
  const { proc, url } = await boot(root);
  try {
    const base = url.replace('/setup/first-run.html', '');
    const res = await fetch(base + '/setup/../data/.configured');
    assert.notStrictEqual(res.status, 200);
  } finally {
    proc.kill();
  }
});
