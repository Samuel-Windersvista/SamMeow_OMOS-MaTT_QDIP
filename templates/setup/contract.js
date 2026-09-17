/* QDIP 服务商契约：浏览器（经 /setup/contract.js）与服务端（require('./contract')）共享的唯一一份。
 * 零依赖：不碰 DOM、不碰 fs、不碰 node:*。
 * 只放「两端都必须同意」的事实与纯算法；UI 文案（DESCS/TAGS/AGENT_GROUPS/提示语）留在页面。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QDIPContract = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

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

  // 自定义服务商名称规则（与服务端 assertValidCustomEntry 的校验一致）
  const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
  const NAME_MAX_LENGTH = 32;

  // 由 Base URL 派生 key 时的截断预算：后端校验 name ≤ NAME_MAX_LENGTH，
  // 给 -2/-3 等去重后缀留余量（长域名如 punycode 中文域名会派生超长 key）。
  const KEY_DERIVE_BUDGET = 28;

  /**
   * 可分配模型静态列表（v0.2，供引导页下拉渲染；v1 取舍：不动态拉取 opencode models）。
   * 键必须与 PROVIDERS 的键完全一致——原键 moonshot 是页面映射表时代的错位，已修正为 kimi。
   */
  const AVAILABLE_MODELS = {
    deepseek: ['deepseek-v4-flash', 'deepseek-v4-flash-vision-exp', 'deepseek-v4-pro'],
    kimi: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    'kimi-for-coding': ['k3', 'k3-256k', 'kimi-for-coding', 'kimi-for-coding-highspeed'],
    openai: ['gpt-4o-mini', 'gpt-4o'],
  };

  // 从 Base URL 派生 provider key：取主机名主标签（注册域左半段）；localhost / 本机 IP → 'local'；
  // 无法解析或空结果回退 'custom'。示例：open.bigmodel.cn → bigmodel；localhost:11434 → local。
  // 说明：规格示例"open.bigmodel.cn → bigmodel"按"注册域主标签"解释（api.deepseek.com → deepseek），
  // 而非主机名字面第一段（open）——两种知名 API 域名形态都能得到品牌名。
  function providerKeyFromBaseUrl(baseUrl) {
    let host;
    try {
      host = new URL(baseUrl.trim()).hostname.toLowerCase().replace(/\.$/, '');
    } catch (e) {
      return 'custom';
    }
    if (host === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(':')) return 'local';
    const parts = host.split('.');
    const seg = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    const key = seg.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return key || 'custom';
  }

  // 逗号（中英文均可）分隔解析模型 ID，去重、去空白
  function parseModelIds(text) {
    const seen = [];
    for (const raw of text.split(/[,，]/)) {
      const m = raw.trim();
      if (m && !seen.includes(m)) seen.push(m);
    }
    return seen;
  }

  // 合并「勾选的检测项」与「手填项」：勾选顺序在前，手填去重追加
  function mergeModelIds(checked, typed) {
    const out = [];
    for (const m of checked || []) {
      if (m && !out.includes(m)) out.push(m);
    }
    for (const m of typed || []) {
      if (m && !out.includes(m)) out.push(m);
    }
    return out;
  }

  // 派生不与保留名 / 已占用 key 冲突的最终 key；skipKey 用于重测时先释放本卡旧 key。
  // usedKeys 可以是 Set 或数组。
  function deriveFinalKey(baseUrl, usedKeys, skipKey) {
    const used = new Set(usedKeys || []);
    if (skipKey) used.delete(skipKey);
    let base = providerKeyFromBaseUrl(baseUrl).slice(0, KEY_DERIVE_BUDGET);
    if (!used.has(base)) return base;
    for (let i = 2; i <= 1000; i++) {
      const k = base + '-' + i;
      if (!used.has(k)) return k;
    }
    return (base + '-' + Date.now().toString(36)).slice(0, NAME_MAX_LENGTH);
  }

  // 把服务端报错翻译成玩家能看懂的话
  function friendlyError(e) {
    if (/401/.test(e)) return 'API key 无效，请检查有没有复制完整（401）';
    if (/402/.test(e)) return '账户余额不足，请先到服务商官网充值（402）';
    if (/网络错误|Failed to fetch|NetworkError|ECONN|ETIMEDOUT|timeout/i.test(e)) {
      return '连不上服务商的服务器，请检查网络（或代理）后重试';
    }
    return e;
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

  return {
    PROVIDERS,
    RESERVED_PROVIDER_NAMES,
    NAME_PATTERN,
    NAME_MAX_LENGTH,
    KEY_DERIVE_BUDGET,
    AVAILABLE_MODELS,
    providerKeyFromBaseUrl,
    parseModelIds,
    mergeModelIds,
    deriveFinalKey,
    friendlyError,
    isCustomEntry,
    isCuratedEntry,
  };
});
