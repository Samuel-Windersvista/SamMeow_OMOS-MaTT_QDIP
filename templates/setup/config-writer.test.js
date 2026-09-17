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
  assert.deepStrictEqual(cfg.provider, {});
});

test('configure registers non-builtin provider (kimi) as openai-compatible', () => {
  const root = makeRoot();
  configure({ root, providers: { kimi: { apiKey: 'sk-test-123' } } });
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'opencode.json'), 'utf8'));
  assert.strictEqual(cfg.provider.kimi.npm, '@ai-sdk/openai-compatible');
  assert.strictEqual(cfg.provider.kimi.options.baseURL, 'https://api.moonshot.cn/v1');
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
  assert.ok(cfg.instructions.includes('{env:QDIP_PERSONA}'));
});

test('configure writes custom personaText for persona=custom', () => {
  const root = makeRoot();
  configure({ root, providers: { deepseek: { apiKey: 'sk-test-123' } }, persona: 'custom', personaText: '自定义人格文本XYZ' });
  const personaPath = path.join(root, 'opencode', 'config', 'opencode', 'instructions', 'persona.md');
  assert.strictEqual(fs.readFileSync(personaPath, 'utf8'), '自定义人格文本XYZ');
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'opencode.json'), 'utf8'));
  assert.ok(cfg.instructions.includes('{env:QDIP_PERSONA}'));
});

test('configure without persona does not write persona file', () => {
  const root = makeRoot();
  configure({ root, providers: { deepseek: { apiKey: 'sk-test-123' } } });
  assert.ok(!fs.existsSync(path.join(root, 'opencode', 'config', 'opencode', 'instructions', 'persona.md')));
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'opencode.json'), 'utf8'));
  // 模板自带基础 instructions（{env:QDIP_PREFERENCES}），此处仅断言未注入 persona 指令
  assert.ok(!(cfg.instructions || []).includes('{env:QDIP_PERSONA}'));
});

test('configure overrides only specified agent models, preserving other agents and fields', () => {
  const root = makeRoot();
  configure({
    root,
    providers: { deepseek: { apiKey: 'sk-test-123' } },
    agentModels: { orchestrator: 'deepseek/deepseek-v4-flash', oracle: 'openai/gpt-4o-mini' },
  });
  const slim = JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'oh-my-opencode-slim.json'), 'utf8'));
  const sp = slim.presets['matt-bridge'];
  assert.strictEqual(sp.orchestrator.model, 'deepseek/deepseek-v4-flash');
  assert.strictEqual(sp.oracle.model, 'openai/gpt-4o-mini');
  assert.strictEqual(sp.fixer.model, 'deepseek/deepseek-v4-flash-vision-exp'); // 未选择，保持模板原值
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

// ---- v0.3: 自定义 OpenAI 兼容服务商（条目形态 { name: { apiKey?, baseUrl, models[] } }） ----

function readAuth(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'auth', 'opencode', 'auth.json'), 'utf8'));
}
function readCfg(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'opencode', 'config', 'opencode', 'opencode.json'), 'utf8'));
}

test('configure writes single custom provider with key into auth.json and opencode.json providers', () => {
  const root = makeRoot();
  configure({
    root,
    providers: {
      bigmodel: { apiKey: 'sk-custom-1', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4', 'glm-4-flash'] },
    },
  });
  const auth = readAuth(root);
  assert.strictEqual(auth.bigmodel.type, 'api');
  assert.strictEqual(auth.bigmodel.key, 'sk-custom-1');
  const cfg = readCfg(root);
  assert.strictEqual(cfg.provider.bigmodel.npm, '@ai-sdk/openai-compatible');
  assert.strictEqual(cfg.provider.bigmodel.options.baseURL, 'https://open.bigmodel.cn/api/paas/v4');
  assert.deepStrictEqual(cfg.provider.bigmodel.models, { 'glm-4': { name: 'glm-4' }, 'glm-4-flash': { name: 'glm-4-flash' } });
});

test('configure trims whitespace from custom provider model ids when writing', () => {
  const root = makeRoot();
  configure({
    root,
    providers: {
      bigmodel: { apiKey: 'sk-custom-1', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: [' glm-4 ', 'glm-4-flash'] },
    },
  });
  const cfg = readCfg(root);
  assert.deepStrictEqual(cfg.provider.bigmodel.models, { 'glm-4': { name: 'glm-4' }, 'glm-4-flash': { name: 'glm-4-flash' } });
});

test('configure writes sk-local placeholder when custom provider has no api key', () => {
  const root = makeRoot();
  configure({ root, providers: { ollama: { baseUrl: 'http://localhost:11434/v1', models: ['qwen2.5:7b'] } } });
  const auth = readAuth(root);
  assert.strictEqual(auth.ollama.type, 'api');
  assert.strictEqual(auth.ollama.key, 'sk-local');
  const cfg = readCfg(root);
  assert.strictEqual(cfg.provider.ollama.options.baseURL, 'http://localhost:11434/v1');
  assert.deepStrictEqual(cfg.provider.ollama.models, { 'qwen2.5:7b': { name: 'qwen2.5:7b' } });
});

test('configure writes two custom providers in a single call', () => {
  const root = makeRoot();
  configure({
    root,
    providers: {
      bigmodel: { apiKey: 'sk-bm', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4'] },
      ollama: { apiKey: 'sk-ll', baseUrl: 'http://localhost:11434/v1', models: ['qwen2.5:7b', 'llama3.1:8b'] },
    },
  });
  const auth = readAuth(root);
  assert.strictEqual(auth.bigmodel.key, 'sk-bm');
  assert.strictEqual(auth.ollama.key, 'sk-ll');
  const cfg = readCfg(root);
  assert.deepStrictEqual(Object.keys(cfg.provider).sort(), ['bigmodel', 'ollama']);
  assert.strictEqual(cfg.provider.bigmodel.options.baseURL, 'https://open.bigmodel.cn/api/paas/v4');
  assert.strictEqual(cfg.provider.ollama.options.baseURL, 'http://localhost:11434/v1');
  assert.deepStrictEqual(Object.keys(cfg.provider.ollama.models), ['qwen2.5:7b', 'llama3.1:8b']);
});

test('configure rejects custom provider name that is not lowercase alphanumeric+dash', () => {
  const root = makeRoot();
  assert.throws(
    () => configure({ root, providers: { 'Bad Name!': { baseUrl: 'https://x.example/v1', models: ['m1'] } } }),
    /服务商名称/
  );
});

test('configure rejects duplicate custom provider names when given an array', () => {
  const root = makeRoot();
  const entry = { name: 'dup', apiKey: 'sk-x', baseUrl: 'https://dup.example/v1', models: ['m1'] };
  assert.throws(
    () => configure({ root, providers: [entry, { ...entry, apiKey: 'sk-y' }] }),
    /重复/
  );
});

test('configure rejects reserved names (deepseek/kimi/moonshot/openai) for custom providers', () => {
  const root = makeRoot();
  assert.throws(
    () => configure({ root, providers: { deepseek: { baseUrl: 'https://other.example/v1', models: ['m1'] } } }),
    /保留/
  );
  assert.throws(
    () => configure({ root, providers: { moonshot: { baseUrl: 'https://other.example/v1', models: ['m1'] } } }),
    /保留/
  );
});

test('configure rejects custom provider without a valid http(s) baseUrl', () => {
  const root = makeRoot();
  assert.throws(
    () => configure({ root, providers: { x: { baseUrl: 'not-a-url', models: ['m1'] } } }),
    /Base URL/
  );
  assert.throws(
    () => configure({ root, providers: { x: { baseUrl: 'ftp://x.example/v1', models: ['m1'] } } }),
    /Base URL/
  );
  assert.throws(
    () => configure({ root, providers: { x: { models: ['m1'] } } }),
    /Base URL/
  );
});

test('configure rejects custom provider with empty or malformed models list', () => {
  const root = makeRoot();
  assert.throws(
    () => configure({ root, providers: { x: { baseUrl: 'https://x.example/v1', models: [] } } }),
    /模型/
  );
  assert.throws(
    () => configure({ root, providers: { x: { baseUrl: 'https://x.example/v1', models: ['  '] } } }),
    /模型/
  );
  assert.throws(
    () => configure({ root, providers: { x: { baseUrl: 'https://x.example/v1' } } }),
    /模型/
  );
});

test('configure mixes curated and custom providers while preserving untouched fields', () => {
  const root = makeRoot();
  configure({
    root,
    providers: {
      deepseek: { apiKey: 'sk-ds' },
      bigmodel: { apiKey: 'sk-bm', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4'] },
    },
  });
  const auth = readAuth(root);
  assert.strictEqual(auth.deepseek.key, 'sk-ds'); // 精选
  assert.strictEqual(auth.bigmodel.key, 'sk-bm'); // 自定义
  const cfg = readCfg(root);
  // 精选内置不注入 providers 段，自定义注入；未涉及字段全部保持模板原值
  assert.strictEqual(cfg.provider.deepseek, undefined);
  assert.strictEqual(cfg.provider.bigmodel.npm, '@ai-sdk/openai-compatible');
  assert.strictEqual(cfg.$schema, 'https://opencode.ai/config.json');
  assert.deepStrictEqual(cfg.plugin, ['../../../plugins/oh-my-opencode-slim', '../../../plugins/opencode-quota']);
  assert.strictEqual(cfg.lsp, true);
});

// ---- v0.4: kimi-for-coding 精选卡（builtin）+ 保留名 ----

test('configure treats kimi-for-coding as builtin (writes auth.json only, no providers injection)', () => {
  const root = makeRoot();
  configure({ root, providers: { 'kimi-for-coding': { apiKey: 'sk-kfc-1' } } });
  const auth = readAuth(root);
  assert.strictEqual(auth['kimi-for-coding'].type, 'api');
  assert.strictEqual(auth['kimi-for-coding'].key, 'sk-kfc-1');
  const cfg = readCfg(root);
  assert.strictEqual(cfg.provider['kimi-for-coding'], undefined);
});

test('configure rejects kimi-for-coding as a custom provider name (reserved)', () => {
  const root = makeRoot();
  assert.throws(
    () => configure({ root, providers: { 'kimi-for-coding': { baseUrl: 'https://other.example/v1', models: ['m1'] } } }),
    /保留/
  );
});

// ---- v0.4: workspace 工作目录 ----

test('configure writes trimmed workspace path to data/workspace.txt when workspace provided', () => {
  const root = makeRoot();
  configure({ root, providers: { deepseek: { apiKey: 'sk-x' } }, workspace: '  D:\\my-project  ' });
  const ws = fs.readFileSync(path.join(root, 'data', 'workspace.txt'), 'utf8');
  assert.strictEqual(ws, 'D:\\my-project');
});

test('configure does not write data/workspace.txt when workspace omitted or blank', () => {
  const root = makeRoot();
  configure({ root, providers: { deepseek: { apiKey: 'sk-x' } } });
  assert.ok(!fs.existsSync(path.join(root, 'data', 'workspace.txt')));
  configure({ root, providers: { deepseek: { apiKey: 'sk-x' } }, workspace: '   ' });
  assert.ok(!fs.existsSync(path.join(root, 'data', 'workspace.txt')));
});
