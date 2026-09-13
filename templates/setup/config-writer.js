const fs = require('node:fs');
const path = require('node:path');

/**
 * 服务商元数据（基于 opencode 1.18.25 实测，证据见 task-4-report.md）：
 * - builtin: 该 provider 是否在 opencode 内置注册表（~/.cache/opencode/models.json）中。
 *   实测结论：deepseek / openai 内置；moonshot(kimi) 不在注册表 → 需按 openai-compatible 注册。
 * - 内置 provider 只需写入 auth.json 即可生效，无需在 opencode.json 的 provider 段注册。
 * - 非内置 provider 注册为 { npm: '@ai-sdk/openai-compatible', options: { baseURL } }。
 */
const PROVIDERS = {
  deepseek: { label: 'DeepSeek', testModel: 'deepseek-v4-flash', baseUrl: 'https://api.deepseek.com', builtin: true },
  kimi: { label: 'Kimi (Moonshot)', testModel: 'moonshot-v1-8k', baseUrl: 'https://api.moonshot.cn/v1', builtin: false, npm: '@ai-sdk/openai-compatible' },
  'kimi-for-coding': { label: 'Kimi For Coding(编程版)', testModel: 'k3', baseUrl: 'https://api.kimi.com/coding/v1', builtin: true },
  openai: { label: 'OpenAI', testModel: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1', builtin: true },
};

// 自定义服务商不得使用的保留名（精选卡 key + opencode 内置模型表键 moonshot）
const RESERVED_PROVIDER_NAMES = ['deepseek', 'kimi', 'moonshot', 'openai', 'kimi-for-coding'];

// 无 key 的自定义服务商（如本地 Ollama）在 auth.json 中写占位 key：
// opencode 要求 provider 的 auth 条目存在，本地端点会忽略该头
const LOCAL_PLACEHOLDER_KEY = 'sk-local';

/** 可选 AI 人格（v0.2）：default 不写任何文件；vaulttec/minimal/custom 写 persona.md */
const PERSONAS = {
  vaulttec: '你是 Vault-Tec 自动化研究终端 VT-OS/OPENCODE。以 1950 年代原子时代乐观主义的复古企业口吻交流：使用"Preparing for the Future!"等 Vault-Tec 口号式语气，称呼用户为 Overseer（监督者）。把 bug 称为 containment breach、错误称为 radiation leak、测试通过称为 Vault seal integrity: NOMINAL、构建成功称为 All-Clear siren、部署称为 Vault Door opening。回复简洁无废话，偶尔自然引用 Nuka-Cola、RobCo、General Atomics 等前战企业。任何时候工程准确性优先于角色扮演。',
  minimal: '直接回答，不要寒暄，不要客套，不要开场白，不要总结。只给结论、必要的代码或操作步骤。用户问什么答什么，避免任何与任务无关的文本。',
};

/** 可分配模型静态列表（v0.2，供引导页下拉渲染；v1 取舍：不动态拉取 opencode models） */
const AVAILABLE_MODELS = {
  deepseek: ['deepseek-v4-flash', 'deepseek-v4-flash-vision-exp', 'deepseek-v4-pro'],
  moonshot: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  'kimi-for-coding': ['k3', 'k3-256k', 'kimi-for-coding', 'kimi-for-coding-highspeed'],
  openai: ['gpt-4o-mini', 'gpt-4o'],
};

// 分发默认预设名（oh-my-opencode-slim.json 的 presets 键）；所有 agent 模型分配统一写入该预设
const DEFAULT_PRESET = 'matt-bridge';

// agentModels 键 → oh-my-opencode-slim.json 中的写入位置
const AGENT_MODEL_PATHS = {
  orchestrator: ['presets', DEFAULT_PRESET, 'orchestrator', 'model'],
  oracle: ['presets', DEFAULT_PRESET, 'oracle', 'model'],
  fixer: ['presets', DEFAULT_PRESET, 'fixer', 'model'],
  designer: ['presets', DEFAULT_PRESET, 'designer', 'model'],
  explorer: ['presets', DEFAULT_PRESET, 'explorer', 'model'],
  librarian: ['presets', DEFAULT_PRESET, 'librarian', 'model'],
  observer: ['presets', DEFAULT_PRESET, 'observer', 'model'],
  'council-alpha': ['council', 'presets', 'default', 'alpha', 'model'],
  'council-beta': ['council', 'presets', 'default', 'beta', 'model'],
  'council-gamma': ['council', 'presets', 'default', 'gamma', 'model'],
};

// council 席位额外写入 synthesizer 预设
const COUNCIL_SEATS = { 'council-alpha': 'alpha', 'council-beta': 'beta', 'council-gamma': 'gamma' };

// 实测：instructions 相对路径以 CWD（包根）为基准（启动器 cd /d "%~dp0" 保证 CWD=包根）
const PERSONA_INSTRUCTION_REL = 'opencode/config/opencode/instructions/persona.md';

function rootOf(root) {
  return {
    configDir: path.join(root, 'opencode', 'config', 'opencode'),
    authFile: path.join(root, 'opencode', 'auth', 'opencode', 'auth.json'),
    dataDir: path.join(root, 'data'),
    configured: path.join(root, 'data', '.configured'),
  };
}

function setPath(obj, keys, value) {
  let cur = obj;
  for (const k of keys.slice(0, -1)) cur = cur[k];
  cur[keys[keys.length - 1]] = value;
}

/** providers 参数统一归一为 [name, 条目] 列表：对象 { name: p } 或数组 [{ name, ...p }]（数组形态用于防御重复 name 校验） */
function providerEntries(providers) {
  if (Array.isArray(providers)) return providers.map(p => [p && p.name, p]);
  return Object.entries(providers || {});
}

/** 自定义条目 = 值带非空 baseUrl（前端派生好 name；后端据此走自定义分支） */
function isCustomEntry(p) {
  return !!(p && typeof p.baseUrl === 'string' && p.baseUrl.trim() !== '');
}

/** 精选条目 = 名称在精选表内，且未带自定义特征（baseUrl/models） */
function isCuratedEntry(name, p) {
  if (!PROVIDERS[name]) return false;
  if (!p) return true;
  return !(typeof p.baseUrl === 'string' || Array.isArray(p.models));
}

/** 自定义条目防御性校验：违规抛中文错误，configure 在落盘前统一执行 */
function assertValidCustomEntry(name, p) {
  if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new Error(`服务商名称只能由小写字母、数字和连字符组成，且必须以字母或数字开头: ${name}`);
  }
  if (name.length > 32) {
    throw new Error(`服务商名称不能超过 32 个字符: ${name}`);
  }
  if (RESERVED_PROVIDER_NAMES.includes(name)) {
    throw new Error(`服务商名称 ${name} 是保留名称，不能用于自定义服务商`);
  }
  if (typeof p.baseUrl !== 'string' || p.baseUrl.trim() === '') {
    throw new Error(`服务商 ${name} 的 Base URL 缺失或不是合法的 http(s) 地址`);
  }
  let url;
  try {
    url = new URL(p.baseUrl.trim());
  } catch {
    throw new Error(`服务商 ${name} 的 Base URL 缺失或不是合法的 http(s) 地址`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`服务商 ${name} 的 Base URL 缺失或不是合法的 http(s) 地址`);
  }
  if (!Array.isArray(p.models) || p.models.length === 0 || p.models.some(m => typeof m !== 'string' || m.trim() === '')) {
    throw new Error(`服务商 ${name} 的模型列表不能为空`);
  }
}

function configure({ root, providers, persona, personaText, agentModels, workspace }) {
  const { configDir, authFile, dataDir, configured } = rootOf(root);
  // 统一为 [name, p] 条目；非精选条目（自定义/畸形）整体校验通过后才落盘（部分覆盖原则：未涉及字段不动）
  const entries = providerEntries(providers);
  const seen = new Set();
  for (const [name, p] of entries) {
    if (seen.has(name)) throw new Error(`服务商名称重复: ${name}`);
    seen.add(name);
    if (!isCuratedEntry(name, p)) assertValidCustomEntry(name, p);
  }
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });

  // 1) auth.json —— 实测格式为 { provider: { type: 'api', key } }（字段名是 key，不是 apiKey）
  const auth = {};
  for (const [name, p] of entries) {
    let key = p.apiKey;
    // 本地端点（无 key 的自定义服务商）写占位 key，保证 auth 条目存在
    if (!isCuratedEntry(name, p) && (key === undefined || key === null || String(key).trim() === '')) {
      key = LOCAL_PLACEHOLDER_KEY;
    }
    auth[name] = { type: 'api', key };
  }
  fs.writeFileSync(authFile, JSON.stringify(auth, null, 2) + '\n', 'utf8');

  // 2) opencode.json —— 仅注册非内置 provider（内置的 auth.json 即生效）；自定义条目一律注册并声明模型
  // 注意：opencode 配置键是单数 `provider`（1.18.27 起复数 `providers` 被诊断为 unsupported 并丢弃）
  const cfgPath = path.join(configDir, 'opencode.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  cfg.provider = cfg.provider || {};
  for (const [name, p] of entries) {
    if (isCuratedEntry(name, p)) {
      const meta = PROVIDERS[name];
      if (meta.builtin) continue;
      cfg.provider[name] = { npm: meta.npm || '@ai-sdk/openai-compatible', options: { baseURL: meta.baseUrl } };
      continue;
    }
    cfg.provider[name] = {
      npm: '@ai-sdk/openai-compatible',
      options: { baseURL: p.baseUrl.trim() },
      models: Object.fromEntries(p.models.map(m => m.trim()).map(m => [m, { name: m }])),
    };
  }

  // 2b) 人格（v0.2）：default/省略 = 不写；vaulttec/minimal 用内置文本；custom 用 personaText
  if (persona && persona !== 'default') {
    const content = persona === 'custom' ? (personaText || '') : PERSONAS[persona];
    if (content) {
      const instrDir = path.join(configDir, 'instructions');
      fs.mkdirSync(instrDir, { recursive: true });
      fs.writeFileSync(path.join(instrDir, 'persona.md'), content, 'utf8');
      cfg.instructions = cfg.instructions || [];
      if (!cfg.instructions.includes(PERSONA_INSTRUCTION_REL)) {
        cfg.instructions.push(PERSONA_INSTRUCTION_REL);
      }
    }
  }
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n', 'utf8');

  // 2c) 按角色/议会分配模型（v0.2）：只覆盖显式选择的 agent，未选择保持原值
  if (agentModels && Object.keys(agentModels).length > 0) {
    const slimPath = path.join(configDir, 'oh-my-opencode-slim.json');
    const slim = JSON.parse(fs.readFileSync(slimPath, 'utf8'));
    for (const [agentKey, model] of Object.entries(agentModels)) {
      const base = AGENT_MODEL_PATHS[agentKey];
      if (!base) continue;
      setPath(slim, base, model);
      const seat = COUNCIL_SEATS[agentKey];
      if (seat) {
        setPath(slim, ['council', 'presets', 'synthesizer', seat, 'model'], model);
      }
    }
    fs.writeFileSync(slimPath, JSON.stringify(slim, null, 2) + '\n', 'utf8');
  }

  // 3) 标记
  fs.writeFileSync(configured, JSON.stringify({ at: new Date().toISOString(), providers: entries.map(([name]) => name) }), 'utf8');

  // 4) 工作目录（v0.4）：workspace 非空时写 data\workspace.txt（UTF-8 单行，trim 后的路径）；空/省略不写
  if (workspace && typeof workspace === 'string' && workspace.trim() !== '') {
    fs.writeFileSync(path.join(dataDir, 'workspace.txt'), workspace.trim(), 'utf8');
  }
}

/** OpenAI 兼容 /models 响应解析：{ data: [{ id }] } → id 列表；非 JSON / 无 data 数组 / 无合法 id → [] */
function extractModelIds(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (e) {
    return [];
  }
  if (!payload || !Array.isArray(payload.data)) return [];
  return payload.data.filter(d => d && typeof d.id === 'string' && d.id.trim() !== '').map(d => d.id.trim());
}

async function testConnection({ provider, apiKey, baseUrl }) {
  // 自定义模式：请求体带 baseUrl 时直连该端点（本地 Ollama 等服务商无需在精选表内）
  const custom = isCustomEntry({ baseUrl });
  let url;
  let headers;
  if (custom) {
    url = baseUrl.trim().replace(/\/+$/, '') + '/models';
    headers = {};
    if (apiKey && String(apiKey).trim() !== '') headers.Authorization = `Bearer ${apiKey}`;
  } else {
    const meta = PROVIDERS[provider];
    if (!meta) return { ok: false, error: `未知服务商: ${provider}` };
    url = `${meta.baseUrl}/models`;
    headers = { Authorization: `Bearer ${apiKey}` };
  }
  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      // 自定义模式扩展：成功时解析响应 JSON 提取模型 id 列表（OpenAI 格式 data[].id），供前端“检测到的模型”勾选
      if (custom) return { ok: true, models: extractModelIds(await res.text()) };
      return { ok: true };
    }
    if (res.status === 401) return { ok: false, error: 'API key 无效（401）' };
    if (res.status === 402) return { ok: false, error: '余额不足（402）' };
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: `网络错误: ${e.message}` };
  }
}

module.exports = { configure, testConnection, PROVIDERS, PERSONAS, AVAILABLE_MODELS };
