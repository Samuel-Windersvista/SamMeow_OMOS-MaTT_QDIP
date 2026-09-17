'use strict';

// templates/env.bat 的行为测试：在子 cmd 中 call 它，读回导出的环境变量。
// 只断言 ASCII 安全的内容——绝对路径含中文，不做整串比较。

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const envBat = path.join(__dirname, '..', 'templates', 'env.bat');

function readEnv() {
  // windowsVerbatimArguments：Node 默认会把参数内的 " 转义成 \"，cmd 不认；逐字传参
  // 让 cmd /c 拿到完整命令行，内含引号的 env.bat 路径才能被正确 call。
  const r = spawnSync('cmd', ['/d', '/c', `chcp 65001 >nul && call "${envBat}" && set`], {
    encoding: 'utf8',
    windowsVerbatimArguments: true,
  });
  assert.strictEqual(r.status, 0, r.stderr || String(r.error));
  const vars = new Map();
  for (const line of r.stdout.split(/\r?\n/)) {
    const eq = line.indexOf('=');
    if (eq <= 0) continue; // 跳过 "=C:=..." 之类的驱动当前目录行
    vars.set(line.slice(0, eq).toUpperCase(), line.slice(eq + 1));
  }
  return vars;
}

const EXPECTED_VARS = [
  'ROOT',
  'PATH',
  'XDG_DATA_HOME',
  'XDG_CONFIG_HOME',
  'OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS',
  'QDIP_MCP_CHROME',
  'QDIP_PREFERENCES',
  'QDIP_PERSONA',
  'ROOTS',
  'WSDIR',
];

test('env.bat 导出全部十个便携环境变量', () => {
  const env = readEnv();
  for (const name of EXPECTED_VARS) {
    assert.ok(env.has(name), `缺少变量 ${name}`);
  }
});

test('env.bat 导出值符合预期', () => {
  const env = readEnv();
  assert.strictEqual(env.get('OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS'), 'true');

  assert.ok(
    env.get('QDIP_MCP_CHROME').endsWith('/mcp/chrome-devtools-mcp/build/src/bin/chrome-devtools-mcp.js'),
    env.get('QDIP_MCP_CHROME'),
  );
  assert.ok(
    env.get('QDIP_PREFERENCES').endsWith('/opencode/config/opencode/preferences.md'),
    env.get('QDIP_PREFERENCES'),
  );
  assert.ok(
    env.get('QDIP_PERSONA').endsWith('/opencode/config/opencode/instructions/persona.md'),
    env.get('QDIP_PERSONA'),
  );

  assert.ok(env.get('PATH').includes('runtime\\node'), env.get('PATH'));
  assert.ok(env.get('PATH').includes('opencode\\bin'), env.get('PATH'));

  assert.ok(!env.get('ROOTS').endsWith('\\'), env.get('ROOTS'));
  assert.strictEqual(env.get('WSDIR'), env.get('ROOTS'));

  for (const name of ['QDIP_MCP_CHROME', 'QDIP_PREFERENCES', 'QDIP_PERSONA']) {
    assert.ok(!env.get(name).includes('\\'), `${name} 应为正斜杠形态: ${env.get(name)}`);
  }
});
