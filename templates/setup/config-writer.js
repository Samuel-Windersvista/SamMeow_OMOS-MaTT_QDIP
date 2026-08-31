const fs = require('node:fs');
const path = require('node:path');

/**
 * 服务商元数据（基于 opencode 1.18.25 实测，证据见 task-4-report.md）：
 * - builtin: 该 provider 是否在 opencode 内置注册表（~/.cache/opencode/models.json）中。
 *   实测结论：deepseek / openai 内置；moonshot(kimi) 不在注册表 → 需按 openai-compatible 注册。
 * - 内置 provider 只需写入 auth.json 即可生效，无需在 opencode.json 的 providers 段注册。
 * - 非内置 provider 注册为 { npm: '@ai-sdk/openai-compatible', options: { baseURL } }。
 */
const PROVIDERS = {
  deepseek: { label: 'DeepSeek', testModel: 'deepseek-chat', baseUrl: 'https://api.deepseek.com', builtin: true },
  kimi: { label: 'Kimi (Moonshot)', testModel: 'moonshot-v1-8k', baseUrl: 'https://api.moonshot.cn/v1', builtin: false, npm: '@ai-sdk/openai-compatible' },
  openai: { label: 'OpenAI', testModel: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1', builtin: true },
};

function rootOf(root) {
  return {
    configDir: path.join(root, 'opencode', 'config', 'opencode'),
    authFile: path.join(root, 'opencode', 'auth', 'opencode', 'auth.json'),
    configured: path.join(root, 'data', '.configured'),
  };
}

function configure({ root, providers }) {
  const { configDir, authFile, configured } = rootOf(root);
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });

  // 1) auth.json —— 实测格式为 { provider: { type: 'api', key } }（字段名是 key，不是 apiKey）
  const auth = {};
  for (const [name, p] of Object.entries(providers)) {
    auth[name] = { type: 'api', key: p.apiKey };
  }
  fs.writeFileSync(authFile, JSON.stringify(auth, null, 2) + '\n', 'utf8');

  // 2) opencode.json —— 仅注册非内置 provider（内置的 auth.json 即生效）
  const cfgPath = path.join(configDir, 'opencode.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  cfg.providers = cfg.providers || {};
  for (const [name, p] of Object.entries(providers)) {
    const meta = PROVIDERS[name];
    if (!meta || meta.builtin) continue;
    cfg.providers[name] = { npm: meta.npm || '@ai-sdk/openai-compatible', options: { baseURL: meta.baseUrl } };
  }
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n', 'utf8');

  // 3) 标记
  fs.writeFileSync(configured, JSON.stringify({ at: new Date().toISOString(), providers: Object.keys(providers) }), 'utf8');
}

async function testConnection({ provider, apiKey }) {
  const meta = PROVIDERS[provider];
  if (!meta) return { ok: false, error: `未知服务商: ${provider}` };
  try {
    const res = await fetch(`${meta.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, error: 'API key 无效（401）' };
    if (res.status === 402) return { ok: false, error: '余额不足（402）' };
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: `网络错误: ${e.message}` };
  }
}

module.exports = { configure, testConnection, PROVIDERS };
