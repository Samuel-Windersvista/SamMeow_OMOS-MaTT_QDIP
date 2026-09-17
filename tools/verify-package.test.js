'use strict';

// tools/verify-package.js 的单元测试。
//
// 全部使用 os.tmpdir() 下的手写最小 fixture（不依赖 build/、tools/cache/ 或真实构建），
// 每个 fixture 自带 components.json 与 layout.json，显式传给 verifyPackage。

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { verifyPackage } = require('./verify-package');

const VERIFIER = path.join(__dirname, 'verify-package.js');
const SKILL_TARGET = 'opencode/config/opencode/skills';

function mkdir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeJson(file, value) {
  write(file, JSON.stringify(value, null, 2));
}

function rm(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

// 构造一个「全绿」最小产物 fixture，返回 { root, componentsFile, layoutFile }。
function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qdip-verify-'));

  // 组件源（skills 分两个源，合并到同一 target）
  mkdir(path.join(root, 'src/node'));
  mkdir(path.join(root, 'src/opencode'));
  mkdir(path.join(root, 'src/mcp'));
  mkdir(path.join(root, 'src/skills-a/skill-1'));
  mkdir(path.join(root, 'src/skills-a/skill-2'));
  mkdir(path.join(root, 'src/skills-b/skill-3'));

  // 组件目标
  mkdir(path.join(root, 'runtime/node'));
  write(path.join(root, 'runtime/node/node.exe'), 'MZ');
  mkdir(path.join(root, 'opencode/bin'));
  write(path.join(root, 'opencode/bin/opencode.cmd'), '@echo off\r\n');
  mkdir(path.join(root, 'mcp/chrome-devtools-mcp'));
  mkdir(path.join(root, SKILL_TARGET, 'skill-1'));
  mkdir(path.join(root, SKILL_TARGET, 'skill-2'));
  mkdir(path.join(root, SKILL_TARGET, 'skill-3'));

  // 插件目录（供 plugin/unresolved 的相对路径解析）
  mkdir(path.join(root, 'plugins/oh-my-opencode-slim'));
  mkdir(path.join(root, 'plugins/opencode-quota/dist'));
  write(path.join(root, 'plugins/opencode-quota/dist/tui.tsx'), '// tui\n');
  write(path.join(root, 'plugins/oh-my-opencode-slim/tui2.js'), '// tui2\n');

  // 配置产物
  writeJson(path.join(root, 'opencode/config/opencode/opencode.json'), {
    plugin: ['../../../plugins/oh-my-opencode-slim', '../../../plugins/opencode-quota'],
    instructions: ['{env:QDIP_PREFERENCES}'],
  });
  writeJson(path.join(root, 'opencode/config/opencode/tui.json'), {
    plugin: ['../../../plugins/opencode-quota/dist/tui.tsx', '../../../plugins/oh-my-opencode-slim/tui2.js'],
  });
  write(path.join(root, 'opencode/config/opencode/preferences.md'), '# prefs\n');
  write(path.join(root, 'opencode/config/opencode/local/说明.txt'), '本地修改区\n');
  mkdir(path.join(root, 'opencode/auth'));

  // setup
  write(path.join(root, 'setup/guide-server.js'), '// guide\n');
  write(path.join(root, 'setup/config-writer.js'), '// config writer\n');

  // 文档
  write(path.join(root, '验证清单.md'), 'x\n');
  write(path.join(root, '玩家使用指南.md'), 'x\n');
  write(path.join(root, 'README.md'), 'x\n');
  write(path.join(root, 'CHANGELOG.md'), 'x\n');
  write(path.join(root, 'data/.gitkeep'), '');

  // 启动器（布局必需；env/unbound 不再扫它们）
  write(path.join(root, '启动.bat'), '@echo off\r\ncall "%~dp0env.bat"\r\n');
  write(path.join(root, '进入环境.bat'), '@echo off\r\ncall "%~dp0env.bat"\r\n');
  // 环境绑定提供方：env/unbound 只对它断言
  write(path.join(root, 'env.bat'), 'set "QDIP_PREFERENCES=%ROOT%prefs"\r\n');

  const components = {
    packageName: 'fixture',
    version: '0.0.0',
    components: [
      { name: 'node-runtime', type: 'dir', source: path.join(root, 'src/node'), target: 'runtime/node', required: true },
      { name: 'opencode-cli', type: 'dir', source: path.join(root, 'src/opencode'), target: 'opencode/bin', required: true },
      { name: 'omo-skills', type: 'dir', source: path.join(root, 'src/skills-a'), target: SKILL_TARGET, required: true },
      { name: 'matt-skills', type: 'dir', source: path.join(root, 'src/skills-b'), target: SKILL_TARGET, required: true },
      {
        name: 'chrome-devtools-mcp',
        type: 'dir',
        source: path.join(root, 'src/mcp'),
        target: 'mcp/chrome-devtools-mcp',
        required: true,
      },
    ],
  };
  const componentsFile = path.join(root, 'components.json');
  writeJson(componentsFile, components);

  const layout = {
    deploy: [
      { name: 'launcher', kind: 'file', source: 'templates/启动.bat', target: '启动.bat' },
      { name: 'env-shell', kind: 'file', source: 'templates/进入环境.bat', target: '进入环境.bat', optional: true },
      { name: 'setup', kind: 'dir', source: 'templates/setup', target: 'setup', exclude: ['*.test.js', 'codemap.md'] },
      { name: 'auth-dir', kind: 'emptydir', target: 'opencode/auth' },
      {
        name: 'local-note',
        kind: 'file',
        source: 'templates/local/说明.txt',
        target: 'opencode/config/opencode/local/说明.txt',
      },
    ],
  };
  const layoutFile = path.join(root, 'layout.json');
  writeJson(layoutFile, layout);

  return { root, componentsFile, layoutFile };
}

function run(fixture) {
  return verifyPackage({ outDir: fixture.root, componentsFile: fixture.componentsFile, layoutFile: fixture.layoutFile });
}

function assertSingle(violations, rule) {
  assert.strictEqual(violations.length, 1, `期望恰好 1 条违规，实际 ${violations.length}：${JSON.stringify(violations)}`);
  assert.strictEqual(violations[0].rule, rule);
  return violations[0];
}

test('全绿 fixture：verifyPackage 返回空数组', () => {
  const fx = makeFixture();
  assert.deepStrictEqual(run(fx), []);
});

test('相对 source：回退到 componentsFile 的上一级解析（全绿）', () => {
  const fx = makeFixture();
  // 把 components.json 放到 <root>/tools/ 下，source 改为相对 <root> 的路径：
  // resolveSource 的 CWD 分支按仓库根解析（仓库内无 src/，必然落空），
  // 回退到 dirname(componentsFile)/.. = <root> 命中。
  const components = JSON.parse(fs.readFileSync(fx.componentsFile, 'utf8'));
  components.components = components.components.map((c) => ({
    ...c,
    source: path.relative(fx.root, c.source).replace(/\\/g, '/'),
  }));
  const relComponentsFile = path.join(fx.root, 'tools', 'components.json');
  writeJson(relComponentsFile, components);

  const violations = verifyPackage({ outDir: fx.root, componentsFile: relComponentsFile, layoutFile: fx.layoutFile });
  assert.deepStrictEqual(violations, []);
});

test('layout/component-missing：删除组件 target 恰好一条', () => {
  const fx = makeFixture();
  rm(path.join(fx.root, 'mcp/chrome-devtools-mcp'));
  const v = assertSingle(run(fx), 'layout/component-missing');
  assert.strictEqual(v.path, 'mcp/chrome-devtools-mcp');
});

test('layout/deploy-missing：删除非可选文件 target 恰好一条', () => {
  const fx = makeFixture();
  rm(path.join(fx.root, 'opencode/config/opencode/local/说明.txt'));
  const v = assertSingle(run(fx), 'layout/deploy-missing');
  assert.strictEqual(v.path, 'opencode/config/opencode/local/说明.txt');
});

test('layout/deploy-missing：删除非可选目录 target（emptydir）恰好一条', () => {
  const fx = makeFixture();
  rm(path.join(fx.root, 'opencode/auth'));
  const v = assertSingle(run(fx), 'layout/deploy-missing');
  assert.strictEqual(v.path, 'opencode/auth');
});

test('layout/deploy-missing：可选条目缺失不报违规', () => {
  const fx = makeFixture();
  rm(path.join(fx.root, '进入环境.bat'));
  assert.deepStrictEqual(run(fx), []);
});

test('layout/excluded-present：setup 下残留 *.test.js 恰好一条', () => {
  const fx = makeFixture();
  write(path.join(fx.root, 'setup/foo.test.js'), '// stray\n');
  const v = assertSingle(run(fx), 'layout/excluded-present');
  assert.strictEqual(v.path, 'setup/foo.test.js');
});

test('layout/excluded-present：嵌套深度的 basename 同样命中（恰好一条）', () => {
  const fx = makeFixture();
  write(path.join(fx.root, 'setup/sub/bar.test.js'), '// stray\n');
  const v = assertSingle(run(fx), 'layout/excluded-present');
  assert.strictEqual(v.path, 'setup/sub/bar.test.js');
});

test('runtime/missing：删除 node.exe 恰好一条', () => {
  const fx = makeFixture();
  rm(path.join(fx.root, 'runtime/node/node.exe'));
  const v = assertSingle(run(fx), 'runtime/missing');
  assert.strictEqual(v.path, 'runtime/node/node.exe');
});

test('skills/missing：合并目标缺少某个技能目录恰好一条', () => {
  const fx = makeFixture();
  rm(path.join(fx.root, SKILL_TARGET, 'skill-3'));
  const v = assertSingle(run(fx), 'skills/missing');
  assert.strictEqual(v.path, SKILL_TARGET);
});

test('skills/collision：两个源出现同名技能恰好一条', () => {
  const fx = makeFixture();
  mkdir(path.join(fx.root, 'src/skills-b/skill-1')); // 与 skills-a/skill-1 重名
  const v = assertSingle(run(fx), 'skills/collision');
  assert.strictEqual(v.path, SKILL_TARGET);
});

test('plugin/unresolved：以 . 开头的插件路径不存在恰好一条', () => {
  const fx = makeFixture();
  writeJson(path.join(fx.root, 'opencode/config/opencode/opencode.json'), {
    plugin: ['../../../plugins/missing-plugin'],
  });
  const v = assertSingle(run(fx), 'plugin/unresolved');
  assert.strictEqual(v.path, 'opencode/config/opencode/opencode.json');
});

test('config/unparseable：JSON 语法错误恰好一条', () => {
  const fx = makeFixture();
  write(path.join(fx.root, 'opencode/config/opencode/opencode.json'), '{ "plugin": [');
  const v = assertSingle(run(fx), 'config/unparseable');
  assert.strictEqual(v.path, 'opencode/config/opencode/opencode.json');
});

test('env/unbound：env.bat 缺少绑定恰好一条', () => {
  const fx = makeFixture();
  writeJson(path.join(fx.root, 'opencode/config/opencode/opencode.json'), {
    plugin: ['../../../plugins/oh-my-opencode-slim', '../../../plugins/opencode-quota'],
    instructions: ['{env:QDIP_PREFERENCES}', '{env:QDIP_EXTRA}'],
  });
  const v = assertSingle(run(fx), 'env/unbound');
  assert.strictEqual(v.path, 'env.bat');
  assert.match(v.detail, /QDIP_EXTRA/);
});

test('env/unbound：未被引号包裹的 {env:X} 不计入 token（全绿）', () => {
  const fx = makeFixture();
  write(path.join(fx.root, 'setup/config-writer.js'), '// 文档占位符 {env:X}，不是真实引用\n');
  assert.deepStrictEqual(run(fx), []);
});

test('env/unbound：字符串字面量里的 token 仍被检出', () => {
  const fx = makeFixture();
  write(path.join(fx.root, 'setup/config-writer.js'), "const T = '{env:QDIP_EXTRA}';\n");
  const v = assertSingle(run(fx), 'env/unbound');
  assert.strictEqual(v.path, 'env.bat');
  assert.match(v.detail, /QDIP_EXTRA/);
});

test('env/unbound：未包裹占位符不误报、真 token 不漏报（恰好一条）', () => {
  const fx = makeFixture();
  write(
    path.join(fx.root, 'setup/config-writer.js'),
    "// 文档占位符 {env:X}，不是真实引用\nconst T = '{env:QDIP_EXTRA}';\n",
  );
  const v = assertSingle(run(fx), 'env/unbound');
  assert.strictEqual(v.path, 'env.bat');
  assert.match(v.detail, /QDIP_EXTRA/);
  assert.doesNotMatch(v.detail, /\bX\b/);
});

test('违规记录形状固定为 { rule, path, detail }（无 severity）', () => {
  const fx = makeFixture();
  rm(path.join(fx.root, 'runtime/node/node.exe'));
  const v = assertSingle(run(fx), 'runtime/missing');
  assert.deepStrictEqual(Object.keys(v).sort(), ['detail', 'path', 'rule']);
});

// ---- CLI 冒烟 ----

function runCli(args) {
  return spawnSync(process.execPath, [VERIFIER, ...args], { encoding: 'utf8' });
}

test('CLI：全绿 fixture 退出码 0', () => {
  const fx = makeFixture();
  const res = runCli(['--out', fx.root, '--components', fx.componentsFile, '--layout', fx.layoutFile]);
  assert.strictEqual(res.status, 0, res.stderr);
  assert.match(res.stdout, /\[OK\] package verified/);
});

test('CLI：坏 fixture 退出码 1 并按 rule 分组', () => {
  const fx = makeFixture();
  rm(path.join(fx.root, 'runtime/node/node.exe'));
  const res = runCli(['--out', fx.root, '--components', fx.componentsFile, '--layout', fx.layoutFile]);
  assert.strictEqual(res.status, 1);
  assert.match(res.stdout, /runtime\/missing/);
});

test('CLI：缺少 --out 退出码 2', () => {
  const res = runCli([]);
  assert.strictEqual(res.status, 2);
  assert.match(res.stderr, /--out/);
});

test('CLI：--help 退出码 2（错误路径）', () => {
  const res = runCli(['--help']);
  assert.strictEqual(res.status, 2);
});
