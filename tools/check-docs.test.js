'use strict';

// tools/check-docs.js 的单元测试。
//
// 全部使用 os.tmpdir() 下手写最小 fixture（不依赖真实仓库结构）。
// 注意：check-docs 的「路径检查」只认固定的 include 文档名（如 README.md），
// 因此 fixture 必须把内容写在这些固定路径上，而不是自定义文件名。

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkDocs, describeScope } = require('./check-docs');

function writeBytes(file, buf) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
}

function writeText(file, text) {
  writeBytes(file, Buffer.from(text, 'utf8'));
}

// 最小全绿仓库：README.md（受路径检查）引用一个存在的 docs/other.md。
function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qdip-docs-'));
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  writeText(path.join(root, 'docs', 'other.md'), '# other\n');
  writeText(path.join(root, 'README.md'), '见 `docs/other.md`。\n');
  return root;
}

function run(root) {
  return checkDocs({ repoRoot: root });
}

function assertSingle(violations, rule) {
  assert.strictEqual(violations.length, 1, `期望恰好 1 条违规，实际 ${violations.length}：${JSON.stringify(violations)}`);
  assert.strictEqual(violations[0].rule, rule);
  return violations[0];
}

test('全绿 fixture：零违规', () => {
  assert.deepStrictEqual(run(makeFixture()), []);
});

test('历史事故回归：`docs/ 验证方案` 与 `安装到系统.bat` 各报一条；产物路径在无产物时跳过', () => {
  const root = makeFixture();
  writeText(
    path.join(root, 'README.md'),
    '见 `docs/ 验证方案` 与 `安装到系统.bat`，配置在 `opencode/config/opencode/opencode.json`。\n',
  );

  const violations = run(root);
  const missing = violations.filter((v) => v.rule === 'docs/path-missing').map((v) => v.path).sort();
  assert.deepStrictEqual(missing, ['docs/ 验证方案', '安装到系统.bat'].sort());
  // 第三条是产物路径：fixture 没有产物目录 → 跳过，不报违规。
  assert.ok(!missing.includes('opencode/config/opencode/opencode.json'));

  const scope = describeScope({ repoRoot: root });
  assert.strictEqual(scope.productDir, null);
  assert.strictEqual(scope.productPathsChecked, 0);
  assert.strictEqual(scope.skippedProductPaths, 1);
});

test('docs/path-missing：`docs/ 验证方案`（空格形态）恰好一条', () => {
  const root = makeFixture();
  writeText(path.join(root, 'README.md'), '见 `docs/ 验证方案`。\n');
  const v = assertSingle(run(root), 'docs/path-missing');
  assert.strictEqual(v.path, 'docs/ 验证方案');
});

test('docs/path-missing：去空格后能解析 → 零违规', () => {
  const root = makeFixture();
  fs.mkdirSync(path.join(root, 'docs', '验证方案'), { recursive: true });
  writeText(path.join(root, 'README.md'), '见 `docs/ 验证方案`。\n');
  assert.deepStrictEqual(run(root), []);
});

test('docs/path-missing：裸文件名不存在恰好一条', () => {
  const root = makeFixture();
  writeText(path.join(root, 'README.md'), '见 `安装到系统.bat`。\n');
  const v = assertSingle(run(root), 'docs/path-missing');
  assert.strictEqual(v.path, '安装到系统.bat');
});

test('裸文件名在仓库里存在 → 零违规', () => {
  const root = makeFixture();
  writeText(path.join(root, '安装到系统.bat'), '@echo off\n');
  writeText(path.join(root, 'README.md'), '见 `安装到系统.bat`。\n');
  assert.deepStrictEqual(run(root), []);
});

test('产物路径在产物里存在 → 零违规', () => {
  const root = makeFixture();
  writeText(path.join(root, 'build', 'qdip-generic-0.0.0', 'opencode', 'config', 'opencode', 'opencode.json'), '{}\n');
  writeText(path.join(root, 'README.md'), '配置在 `opencode/config/opencode/opencode.json`。\n');
  const scope = describeScope({ repoRoot: root });
  assert.strictEqual(scope.productDir, 'build/qdip-generic-0.0.0');
  assert.strictEqual(scope.productPathsChecked, 1);
  assert.strictEqual(scope.skippedProductPaths, 0);
  assert.deepStrictEqual(run(root), []);
});

test('产物路径在产物里不存在 → 恰好一条', () => {
  const root = makeFixture();
  fs.mkdirSync(path.join(root, 'build', 'qdip-generic-0.0.0'), { recursive: true });
  writeText(path.join(root, 'README.md'), '配置在 `opencode/config/opencode/missing.json`。\n');
  const v = assertSingle(run(root), 'docs/path-missing');
  assert.strictEqual(v.path, 'opencode/config/opencode/missing.json');
});

test('docs/path-missing：引用不存在的 .md 恰好一条', () => {
  const root = makeFixture();
  writeText(path.join(root, 'README.md'), '见 `docs/missing.md`。\n');
  const v = assertSingle(run(root), 'docs/path-missing');
  assert.strictEqual(v.path, 'docs/missing.md');
});

test('docs/path-missing：`:行号` 后缀被剥离，合法路径零违规', () => {
  const root = makeFixture();
  writeText(path.join(root, 'README.md'), '见 `docs/other.md:12-20` 与 `docs/other.md:7`。\n');
  assert.deepStrictEqual(run(root), []);
});

test('docs/path-missing：含 * 的 glob 片段跳过（已知盲区）', () => {
  const root = makeFixture();
  writeText(path.join(root, 'README.md'), '见 `docs/*.md`。\n');
  assert.deepStrictEqual(run(root), []);
});

test('docs/encoding-broken：含 U+FFFD 的 .md 恰好一条', () => {
  const root = makeFixture();
  writeBytes(path.join(root, 'notes.md'), Buffer.concat([Buffer.from('# bad\n', 'utf8'), Buffer.from([0xef, 0xbf, 0xbd]), Buffer.from('\n', 'utf8')]));
  const v = assertSingle(run(root), 'docs/encoding-broken');
  assert.strictEqual(v.path, 'notes.md');
});

test('docs/encoding-broken：GBK 编码的 .bat 零违规', () => {
  const root = makeFixture();
  writeBytes(
    path.join(root, 'run.bat'),
    Buffer.concat([Buffer.from('@echo off\r\nrem ', 'ascii'), Buffer.from([0xc4, 0xe3, 0xba, 0xc3]), Buffer.from('\r\n', 'ascii')]),
  );
  assert.deepStrictEqual(run(root), []);
});

test('docs/bom-missing：无 BOM 的 .ps1 恰好一条，带 BOM 的 .ps1 零违规', () => {
  const root = makeFixture();
  writeText(path.join(root, 'tools', 'no-bom.ps1'), 'Write-Host "hi"\n');
  const v = assertSingle(run(root), 'docs/bom-missing');
  assert.strictEqual(v.path, 'tools/no-bom.ps1');

  const root2 = makeFixture();
  writeBytes(
    path.join(root2, 'tools', 'with-bom.ps1'),
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('Write-Host "hi"\n', 'utf8')]),
  );
  assert.deepStrictEqual(run(root2), []);
});

test('docs/bom-missing：带 BOM 的 .md 恰好一条', () => {
  const root = makeFixture();
  writeBytes(path.join(root, 'docs', 'bom.md'), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('# doc\n', 'utf8')]));
  const v = assertSingle(run(root), 'docs/bom-missing');
  assert.strictEqual(v.path, 'docs/bom.md');
});

test('真实仓库：文档层零违规（核心回归锁）', () => {
  const repoRoot = path.join(__dirname, '..');
  assert.deepStrictEqual(checkDocs({ repoRoot }), []);
});
