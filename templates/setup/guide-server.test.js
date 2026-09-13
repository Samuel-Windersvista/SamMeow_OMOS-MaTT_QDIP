const { test } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const http = require('node:http');
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

function makeConfigureRoot() {
  const root = makeRoot();
  fs.mkdirSync(path.join(root, 'opencode', 'config', 'opencode'), { recursive: true });
  fs.copyFileSync(path.join(__dirname, '..', 'opencode.json'), path.join(root, 'opencode', 'config', 'opencode', 'opencode.json'));
  fs.copyFileSync(path.join(__dirname, '..', 'oh-my-opencode-slim.json'), path.join(root, 'opencode', 'config', 'opencode', 'oh-my-opencode-slim.json'));
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

// ---- v0.2: persona + agentModels through the API ----

test('GET /api/status includes models list for the UI', async () => {
  const root = makeRoot();
  const { proc, url } = await boot(root);
  try {
    const res = await fetch(url.replace('/setup/first-run.html', '/api/status'));
    const body = await res.json();
    assert.ok(body.models);
    assert.ok(Array.isArray(body.models.deepseek));
    assert.ok(Array.isArray(body.models.moonshot));
    assert.ok(Array.isArray(body.models.openai));
    assert.ok(body.models.deepseek.includes('deepseek-v4-flash'));
  } finally {
    proc.kill();
  }
});

test('POST /api/configure with persona and agentModels writes persona and agent models', async () => {
  const root = makeConfigureRoot();
  const { proc, url } = await boot(root);
  try {
    const base = url.replace('/setup/first-run.html', '');
    const res = await fetch(base + '/api/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providers: { deepseek: { apiKey: 'sk-fake-e2e' } },
        persona: 'vaulttec',
        agentModels: { orchestrator: 'deepseek/deepseek-v4-flash', 'council-beta': 'openai/gpt-4o' },
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.ok, true);

    const personaPath = path.join(root, 'opencode', 'config', 'opencode', 'instructions', 'persona.md');
    assert.ok(fs.existsSync(personaPath));
    const cfg = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'opencode.json'), 'utf8'));
    assert.ok(cfg.instructions.includes('opencode/config/opencode/instructions/persona.md'));
    const slim = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'oh-my-opencode-slim.json'), 'utf8'));
    assert.strictEqual(slim.presets['matt-bridge'].orchestrator.model, 'deepseek/deepseek-v4-flash');
    assert.strictEqual(slim.council.presets.default.beta.model, 'openai/gpt-4o');
    assert.strictEqual(slim.council.presets.synthesizer.beta.model, 'openai/gpt-4o');
    assert.strictEqual(slim.presets['matt-bridge'].fixer.model, 'deepseek/deepseek-v4-flash-vision-exp');
  } finally {
    proc.kill();
  }
});

// ---- v0.3: 自定义 OpenAI 兼容服务商 ----

// 本地 stub：模拟一个 OpenAI 兼容 /models 端点
function makeStubServer(handler) {
  return new Promise(resolve => {
    const srv = http.createServer(handler);
    srv.listen(0, '127.0.0.1', () => resolve({ srv, base: `http://127.0.0.1:${srv.address().port}` }));
  });
}

test('POST /api/test with custom baseUrl and no key hits stub /models without Authorization', async () => {
  const root = makeRoot();
  const seen = {};
  const stub = await makeStubServer((req, res) => {
    seen.url = req.url;
    seen.hasAuth = Object.prototype.hasOwnProperty.call(req.headers, 'authorization');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"object":"list"}');
  });
  const { proc, url } = await boot(root);
  try {
    const base = url.replace('/setup/first-run.html', '');
    const res = await fetch(base + '/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // 带尾斜杠 baseUrl：应 trim 后再拼 /models
      body: JSON.stringify({ provider: 'ollama', baseUrl: stub.base + '/v1/' }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.ok, true);
    assert.strictEqual(seen.url, '/v1/models');
    assert.strictEqual(seen.hasAuth, false);
  } finally {
    proc.kill();
    stub.srv.close();
  }
});

test('POST /api/test with custom baseUrl sends Bearer key and maps stub 401 to ok:false', async () => {
  const root = makeRoot();
  const seen = {};
  const stub = await makeStubServer((req, res) => {
    seen.auth = req.headers.authorization;
    res.writeHead(401);
    res.end('{"error":"bad key"}');
  });
  const { proc, url } = await boot(root);
  try {
    const base = url.replace('/setup/first-run.html', '');
    const res = await fetch(base + '/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'myproxy', apiKey: 'sk-abc', baseUrl: stub.base + '/v1' }),
    });
    const body = await res.json();
    assert.strictEqual(body.ok, false);
    assert.strictEqual(typeof body.error, 'string');
    assert.match(body.error, /401/);
    assert.strictEqual(seen.auth, 'Bearer sk-abc');
  } finally {
    proc.kill();
    stub.srv.close();
  }
});

test('POST /api/configure with two custom providers writes auth.json and opencode.json end to end', async () => {
  const root = makeConfigureRoot();
  const { proc, url } = await boot(root);
  try {
    const base = url.replace('/setup/first-run.html', '');
    const res = await fetch(base + '/api/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providers: {
          bigmodel: { apiKey: 'sk-e2e', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4', 'glm-4-flash'] },
          ollama: { baseUrl: 'http://localhost:11434/v1', models: ['qwen2.5:7b'] },
        },
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.ok, true);

    const auth = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'auth', 'opencode', 'auth.json'), 'utf8'));
    assert.strictEqual(auth.bigmodel.key, 'sk-e2e');
    assert.strictEqual(auth.ollama.key, 'sk-local');
    const cfg = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'opencode.json'), 'utf8'));
    assert.deepStrictEqual(Object.keys(cfg.provider).sort(), ['bigmodel', 'ollama']);
    assert.strictEqual(cfg.provider.bigmodel.options.baseURL, 'https://open.bigmodel.cn/api/paas/v4');
    assert.strictEqual(cfg.provider.ollama.options.baseURL, 'http://localhost:11434/v1');
    assert.deepStrictEqual(cfg.provider.ollama.models, { 'qwen2.5:7b': { name: 'qwen2.5:7b' } });
    // 未涉及字段保持模板原值（部分覆盖）
    assert.strictEqual(cfg.lsp, true);
    assert.deepStrictEqual(cfg.plugin, ['../../../plugins/oh-my-opencode-slim', '../../../plugins/opencode-quota']);
  } finally {
    proc.kill();
  }
});

// ---- v0.4: 自定义模式模型探测 + workspace 端到端 ----

test('POST /api/test with custom baseUrl returns detected OpenAI model ids in models', async () => {
  const root = makeRoot();
  const stub = await makeStubServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    // OpenAI 格式 { data: [{ id }] }；无 id 字段的条目应被过滤
    res.end(JSON.stringify({ data: [{ id: 'glm-4' }, { id: 'glm-4-flash' }, { object: 'list' }] }));
  });
  const { proc, url } = await boot(root);
  try {
    const base = url.replace('/setup/first-run.html', '');
    const res = await fetch(base + '/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'bigmodel', baseUrl: stub.base + '/v1' }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.ok, true);
    assert.deepStrictEqual(body.models, ['glm-4', 'glm-4-flash']);
  } finally {
    proc.kill();
    stub.srv.close();
  }
});

test('POST /api/test with custom baseUrl returns empty models when endpoint returns non-JSON', async () => {
  const root = makeRoot();
  const stub = await makeStubServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
  });
  const { proc, url } = await boot(root);
  try {
    const base = url.replace('/setup/first-run.html', '');
    const res = await fetch(base + '/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'bigmodel', baseUrl: stub.base }),
    });
    const body = await res.json();
    assert.strictEqual(body.ok, true);
    assert.deepStrictEqual(body.models, []);
  } finally {
    proc.kill();
    stub.srv.close();
  }
});

test('POST /api/configure with workspace writes data/workspace.txt end to end', async () => {
  const root = makeConfigureRoot();
  const { proc, url } = await boot(root);
  try {
    const base = url.replace('/setup/first-run.html', '');
    const res = await fetch(base + '/api/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providers: { deepseek: { apiKey: 'sk-ws' } }, workspace: 'C:\\code\\my-proj' }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.ok, true);
    const ws = fs.readFileSync(path.join(root, 'data', 'workspace.txt'), 'utf8');
    assert.strictEqual(ws, 'C:\\code\\my-proj');
  } finally {
    proc.kill();
  }
});
