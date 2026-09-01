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

// ---- v0.2: persona + per-agent model assignment ----

test('configure writes persona.md and appends instructions for persona=vaulttec', () => {
  const root = makeRoot();
  configure({ root, providers: { deepseek: { apiKey: 'sk-test-123' } }, persona: 'vaulttec' });
  const personaPath = path.join(root, 'opencode', 'config', 'opencode', 'instructions', 'persona.md');
  assert.ok(fs.existsSync(personaPath));
  const content = fs.readFileSync(personaPath, 'utf8');
  assert.ok(content.length > 0);
  assert.ok(content.length <= 1000);
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'opencode.json'), 'utf8'));
  assert.ok(Array.isArray(cfg.instructions));
  assert.ok(cfg.instructions.includes('opencode/config/opencode/instructions/persona.md'));
});

test('configure writes custom personaText for persona=custom', () => {
  const root = makeRoot();
  configure({ root, providers: { deepseek: { apiKey: 'sk-test-123' } }, persona: 'custom', personaText: '自定义人格文本XYZ' });
  const personaPath = path.join(root, 'opencode', 'config', 'opencode', 'instructions', 'persona.md');
  assert.strictEqual(fs.readFileSync(personaPath, 'utf8'), '自定义人格文本XYZ');
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'opencode.json'), 'utf8'));
  assert.ok(cfg.instructions.includes('opencode/config/opencode/instructions/persona.md'));
});

test('configure without persona does not write persona file', () => {
  const root = makeRoot();
  configure({ root, providers: { deepseek: { apiKey: 'sk-test-123' } } });
  assert.ok(!fs.existsSync(path.join(root, 'opencode', 'config', 'opencode', 'instructions', 'persona.md')));
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'opencode.json'), 'utf8'));
  assert.strictEqual(cfg.instructions, undefined);
});

test('configure overrides only specified agent models, preserving other agents and fields', () => {
  const root = makeRoot();
  configure({
    root,
    providers: { deepseek: { apiKey: 'sk-test-123' } },
    agentModels: { orchestrator: 'deepseek/deepseek-v4-flash', oracle: 'openai/gpt-4o-mini' },
  });
  const slim = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'oh-my-opencode-slim.json'), 'utf8'));
  const sp = slim.presets['superpowers-bridge'];
  assert.strictEqual(sp.orchestrator.model, 'deepseek/deepseek-v4-flash');
  assert.strictEqual(sp.oracle.model, 'openai/gpt-4o-mini');
  assert.strictEqual(sp.fixer.model, 'deepseek/deepseek-v4-flash'); // 未选择，保持模板原值
  assert.strictEqual(sp.orchestrator.variant, 'max'); // 其他字段不变
  assert.strictEqual(sp['orchestrator-beta'].model, 'kimi-for-coding/k3'); // 未在可分配列表，保持原值
});

test('configure writes council-alpha to both default and synthesizer presets', () => {
  const root = makeRoot();
  configure({
    root,
    providers: { deepseek: { apiKey: 'sk-test-123' } },
    agentModels: { 'council-alpha': 'deepseek/deepseek-v4-pro' },
  });
  const slim = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'oh-my-opencode-slim.json'), 'utf8'));
  assert.strictEqual(slim.council.presets.default.alpha.model, 'deepseek/deepseek-v4-pro');
  assert.strictEqual(slim.council.presets.synthesizer.alpha.model, 'deepseek/deepseek-v4-pro');
  assert.strictEqual(slim.council.presets.default.beta.model, 'deepseek/deepseek-v4-flash'); // 未选择，保持原值
  assert.strictEqual(slim.council.presets.synthesizer.gamma.model, 'kimi-for-coding/k3');
});

test('configure without agentModels leaves oh-my-opencode-slim.json unchanged', () => {
  const root = makeRoot();
  const before = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'oh-my-opencode-slim.json'), 'utf8'));
  configure({ root, providers: { deepseek: { apiKey: 'sk-test-123' } } });
  const after = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'oh-my-opencode-slim.json'), 'utf8'));
  assert.deepStrictEqual(after, before);
});
