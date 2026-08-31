const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { configure } = require('./config-writer');

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qdip-test-'));
  fs.mkdirSync(path.join(root, 'opencode', 'config', 'opencode'), { recursive: true });
  fs.mkdirSync(path.join(root, 'opencode', 'auth'), { recursive: true });
  fs.mkdirSync(path.join(root, 'data'), { recursive: true });
  fs.copyFileSync(path.join(__dirname, '..', 'opencode.json'), path.join(root, 'opencode', 'config', 'opencode', 'opencode.json'));
  fs.copyFileSync(path.join(__dirname, '..', 'oh-my-opencode-slim.json'), path.join(root, 'opencode', 'config', 'opencode', 'oh-my-opencode-slim.json'));
  return root;
}

test('configure writes auth.json in measured opencode format (type + key)', () => {
  const root = makeRoot();
  configure({ root, providers: { deepseek: { apiKey: 'sk-test-123' } } });
  const auth = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'auth', 'opencode', 'auth.json'), 'utf8'));
  assert.strictEqual(auth.deepseek.type, 'api');
  assert.strictEqual(auth.deepseek.key, 'sk-test-123');
});

test('configure does not inject builtin providers (deepseek) into providers section', () => {
  const root = makeRoot();
  configure({ root, providers: { deepseek: { apiKey: 'sk-test-123' } } });
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'opencode.json'), 'utf8'));
  assert.deepStrictEqual(cfg.providers, {});
});

test('configure registers non-builtin provider (kimi) as openai-compatible', () => {
  const root = makeRoot();
  configure({ root, providers: { kimi: { apiKey: 'sk-test-123' } } });
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'opencode.json'), 'utf8'));
  assert.strictEqual(cfg.providers.kimi.npm, '@ai-sdk/openai-compatible');
  assert.strictEqual(cfg.providers.kimi.options.baseURL, 'https://api.moonshot.cn/v1');
});

test('configure writes .configured marker', () => {
  const root = makeRoot();
  configure({ root, providers: { deepseek: { apiKey: 'sk-test-123' } } });
  assert.ok(fs.existsSync(path.join(root, 'data', '.configured')));
});
