'use strict';

// templates/setup/contract.js 的单元测试。
// 契约是浏览器引导页与服务端 config-writer.js 共享的唯一一份服务商事实与纯算法，
// 这里锁死键名一致性（AVAILABLE_MODELS ⊆ PROVIDERS）与各纯函数行为。

const { test } = require('node:test');
const assert = require('node:assert');
const QDIPContract = require('./contract');

const {
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
} = QDIPContract;

test('providerKeyFromBaseUrl：注册域主标签', () => {
  assert.strictEqual(providerKeyFromBaseUrl('https://open.bigmodel.cn/api/paas/v4'), 'bigmodel');
  assert.strictEqual(providerKeyFromBaseUrl('https://api.zhipuai.cn/v1'), 'zhipuai');
  assert.strictEqual(providerKeyFromBaseUrl('https://api.deepseek.com'), 'deepseek');
});

test('providerKeyFromBaseUrl：本机端点归为 local', () => {
  assert.strictEqual(providerKeyFromBaseUrl('http://localhost:11434/v1'), 'local');
  assert.strictEqual(providerKeyFromBaseUrl('http://127.0.0.1:1234/v1'), 'local');
});

test('providerKeyFromBaseUrl：非法串回退 custom，大小写与尾点归一', () => {
  assert.strictEqual(providerKeyFromBaseUrl('not-a-url'), 'custom');
  assert.strictEqual(providerKeyFromBaseUrl(''), 'custom');
  assert.strictEqual(providerKeyFromBaseUrl('https://Open.BigModel.CN./api'), 'bigmodel');
});

test('parseModelIds：中英文逗号、去重、去空白、空串', () => {
  assert.deepStrictEqual(parseModelIds('a, b，c'), ['a', 'b', 'c']);
  assert.deepStrictEqual(parseModelIds('a, a ,  b '), ['a', 'b']);
  assert.deepStrictEqual(parseModelIds(''), []);
  assert.deepStrictEqual(parseModelIds('   '), []);
  assert.deepStrictEqual(parseModelIds(',,，'), []);
});

test('mergeModelIds：勾选项在前、手填去重追加、皆空', () => {
  assert.deepStrictEqual(mergeModelIds(['a', 'b'], ['b', 'c']), ['a', 'b', 'c']);
  assert.deepStrictEqual(mergeModelIds(['a'], []), ['a']);
  assert.deepStrictEqual(mergeModelIds([], ['x']), ['x']);
  assert.deepStrictEqual(mergeModelIds([], []), []);
  assert.deepStrictEqual(mergeModelIds(undefined, undefined), []);
});

test('deriveFinalKey：不与保留名冲突，撞名加 -2', () => {
  // deepseek 是保留名 → 加后缀
  assert.strictEqual(deriveFinalKey('https://api.deepseek.com', RESERVED_PROVIDER_NAMES, undefined), 'deepseek-2');
  assert.strictEqual(deriveFinalKey('https://open.bigmodel.cn', ['bigmodel'], undefined), 'bigmodel-2');
  assert.strictEqual(deriveFinalKey('https://open.bigmodel.cn', ['bigmodel', 'bigmodel-2'], undefined), 'bigmodel-3');
});

test('deriveFinalKey：skipKey 释放本卡旧键', () => {
  assert.strictEqual(deriveFinalKey('https://open.bigmodel.cn', ['bigmodel'], 'bigmodel'), 'bigmodel');
  // 本卡旧键是 bigmodel-2（bigmodel 被别的卡占用）：重测时释放旧键后应重新拿回 bigmodel-2
  assert.strictEqual(deriveFinalKey('https://open.bigmodel.cn', ['bigmodel', 'bigmodel-2'], 'bigmodel-2'), 'bigmodel-2');
});

test('deriveFinalKey：长域名截断到 KEY_DERIVE_BUDGET', () => {
  const long = deriveFinalKey('https://x.abcdefghijklmnopqrstuvwxyz0123456789.cn', [], undefined);
  assert.strictEqual(long.length, KEY_DERIVE_BUDGET);
  assert.strictEqual(long, 'abcdefghijklmnopqrstuvwxyz01');
});

test('friendlyError：401 / 402 / 网络错误 / 其它原样', () => {
  assert.match(friendlyError('API key 无效（401）'), /401/);
  assert.match(friendlyError('余额不足（402）'), /余额不足/);
  assert.match(friendlyError('网络错误: connect ECONNREFUSED'), /连不上服务商/);
  assert.match(friendlyError('Failed to fetch'), /连不上服务商/);
  assert.strictEqual(friendlyError('HTTP 500'), 'HTTP 500');
});

test('规则常量：名称长度、保留名、派生预算', () => {
  assert.strictEqual(NAME_MAX_LENGTH, 32);
  assert.strictEqual(KEY_DERIVE_BUDGET < NAME_MAX_LENGTH, true);
  assert.strictEqual(RESERVED_PROVIDER_NAMES.length, 5);
  for (const n of ['deepseek', 'kimi', 'moonshot', 'openai', 'kimi-for-coding']) {
    assert.ok(RESERVED_PROVIDER_NAMES.includes(n), `保留名缺少 ${n}`);
  }
  assert.strictEqual(NAME_PATTERN.test('my-provider-2'), true);
  assert.strictEqual(NAME_PATTERN.test('Bad Name!'), false);
});

test('isCustomEntry / isCuratedEntry：精选名带 baseUrl 按自定义处理', () => {
  assert.strictEqual(isCuratedEntry('deepseek', { apiKey: 'sk-x' }), true);
  assert.strictEqual(isCuratedEntry('deepseek', { baseUrl: 'https://other.example/v1' }), false);
  assert.strictEqual(isCustomEntry({ baseUrl: 'https://other.example/v1' }), true);
  assert.strictEqual(isCustomEntry({ apiKey: 'sk-x' }), false);
  assert.strictEqual(isCuratedEntry('unknown', {}), false);
});

test('AVAILABLE_MODELS 的键是 PROVIDERS 键的子集（锁死键名错位）', () => {
  for (const key of Object.keys(AVAILABLE_MODELS)) {
    assert.ok(Object.prototype.hasOwnProperty.call(PROVIDERS, key), `models 键 ${key} 不在 PROVIDERS 中`);
  }
  assert.ok(!Object.prototype.hasOwnProperty.call(AVAILABLE_MODELS, 'moonshot'), 'moonshot 键应已修正为 kimi');
  assert.ok(Array.isArray(AVAILABLE_MODELS.kimi));
});
