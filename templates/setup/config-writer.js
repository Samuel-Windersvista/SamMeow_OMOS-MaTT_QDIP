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
  deepseek: { label: 'DeepSeek', testModel: 'deepseek-v4-flash', baseUrl: 'https://api.deepseek.com', builtin: true },
  kimi: { label: 'Kimi (Moonshot)', testModel: 'moonshot-v1-8k', baseUrl: 'https://api.moonshot.cn/v1', builtin: false, npm: '@ai-sdk/openai-compatible' },
  openai: { label: 'OpenAI', testModel: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1', builtin: true },
};

/** 可选 AI 人格（v0.2）：default 不写任何文件；vaulttec/minimal/custom 写 persona.md */
const PERSONAS = {
  vaulttec: '你是 Vault-Tec 自动化研究终端 VT-OS/OPENCODE。以 1950 年代原子时代乐观主义的复古企业口吻交流：使用"Preparing for the Future!"等 Vault-Tec 口号式语气，称呼用户为 Overseer（监督者）。把 bug 称为 containment breach、错误称为 radiation leak、测试通过称为 Vault seal integrity: NOMINAL、构建成功称为 All-Clear siren、部署称为 Vault Door opening。回复简洁无废话，偶尔自然引用 Nuka-Cola、RobCo、General Atomics 等前战企业。任何时候工程准确性优先于角色扮演。',
  minimal: '直接回答，不要寒暄，不要客套，不要开场白，不要总结。只给结论、必要的代码或操作步骤。用户问什么答什么，避免任何与任务无关的文本。',
};

/** 可分配模型静态列表（v0.2，供引导页下拉渲染；v1 取舍：不动态拉取 opencode models） */
const AVAILABLE_MODELS = {
  deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  moonshot: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  openai: ['gpt-4o-mini', 'gpt-4o'],
};

// agentModels 键 → oh-my-opencode-slim.json 中的写入位置
const AGENT_MODEL_PATHS = {
  orchestrator: ['presets', 'superpowers-bridge', 'orchestrator', 'model'],
  oracle: ['presets', 'superpowers-bridge', 'oracle', 'model'],
  fixer: ['presets', 'superpowers-bridge', 'fixer', 'model'],
  designer: ['presets', 'superpowers-bridge', 'designer', 'model'],
  explorer: ['presets', 'superpowers-bridge', 'explorer', 'model'],
  librarian: ['presets', 'superpowers-bridge', 'librarian', 'model'],
  observer: ['presets', 'superpowers-bridge', 'observer', 'model'],
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
    configured: path.join(root, 'data', '.configured'),
  };
}

function setPath(obj, keys, value) {
  let cur = obj;
  for (const k of keys.slice(0, -1)) cur = cur[k];
  cur[keys[keys.length - 1]] = value;
}

function configure({ root, providers, persona, personaText, agentModels }) {
  const { configDir, authFile, configured } = rootOf(root);
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });

  // 1) auth.json —— 实测格式为 { provider: { type: 'api', key } }（字段名是 key，不是 apiKey）
  const auth = {};
  for (const [name, p] of Object.entries(providers || {})) {
    auth[name] = { type: 'api', key: p.apiKey };
  }
  fs.writeFileSync(authFile, JSON.stringify(auth, null, 2) + '\n', 'utf8');

  // 2) opencode.json —— 仅注册非内置 provider（内置的 auth.json 即生效）
  const cfgPath = path.join(configDir, 'opencode.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  cfg.providers = cfg.providers || {};
  for (const [name, p] of Object.entries(providers || {})) {
    const meta = PROVIDERS[name];
    if (!meta || meta.builtin) continue;
    cfg.providers[name] = { npm: meta.npm || '@ai-sdk/openai-compatible', options: { baseURL: meta.baseUrl } };
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
  fs.writeFileSync(configured, JSON.stringify({ at: new Date().toISOString(), providers: Object.keys(providers || {}) }), 'utf8');
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

module.exports = { configure, testConnection, PROVIDERS, PERSONAS, AVAILABLE_MODELS };
