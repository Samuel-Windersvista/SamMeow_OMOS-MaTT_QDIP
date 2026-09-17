'use strict';

// QDIP 产物校验器。
//
// 把 build.ps1 [4/5] 阶段散落的异质断言收敛为一个可测试的深模块：
//   - 布局（哪些文件/目录该落在产物里）由 tools/layout.json 声明；
//   - 组件来源由 tools/components.json 声明；
//   - 本模块只负责「按声明核对产物」，不负责修复、不负责构建。
//
// 零依赖：只用 node:fs / node:path。
// 导出 verifyPackage(...) 为纯函数（不打印、不抛异常、不写文件）；直接运行本文件时作为 CLI。

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_COMPONENTS = path.join(__dirname, 'components.json');
const DEFAULT_LAYOUT = path.join(__dirname, 'layout.json');

// {env:NAME} token：与 opencode 运行时变量插值语法一致。
// 必须被引号包裹才算数——token 要真正成为配置值，必然位于字符串字面量内；
// 注释里的 {env:X} 只是文档占位符（不包裹引号），不应触发 env/unbound。
const ENV_TOKEN_RE = /(['"`])\{env:([A-Za-z_][A-Za-z0-9_]*)\}\1/g;
const ENV_TOKEN_SOURCES = [
  'opencode/config/opencode/opencode.json',
  'opencode/config/opencode/tui.json',
  'setup/config-writer.js',
];

// 含 plugin 数组的产物配置文件（相对 outDir，正斜杠）。
const PLUGIN_CONFIG_FILES = [
  'opencode/config/opencode/opencode.json',
  'opencode/config/opencode/tui.json',
];

// 环境绑定的提供方：变量绑定已集中到 env.bat（启动器只负责 call 它），
// 因此 env/unbound 只对它断言——两个启动器文件里已不再含 set 语句，
// 把它们留在列表里会导致全部误报。
const LAUNCHER_FILES = ['env.bat'];

function toPosix(p) {
  return String(p).replace(/\\/g, '/');
}

function relPosix(outDir, absPath) {
  return toPosix(path.relative(outDir, absPath));
}

function statOf(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function isFile(p) {
  const s = statOf(p);
  return !!s && s.isFile();
}

function isDir(p) {
  const s = statOf(p);
  return !!s && s.isDirectory();
}

function readTextSafe(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function parseJsonSafe(file) {
  try {
    return { ok: true, value: JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch (err) {
    return { ok: false, error: err };
  }
}

// 把 components.json 里的 source 解析为绝对路径。
// 相对路径优先按 CWD（build.ps1 会锚定到仓库根），回退到 componentsFile 的上一级（仓库根）。
function resolveSource(source, componentsFile) {
  if (typeof source !== 'string' || source.length === 0) return null;
  if (path.isAbsolute(source)) return source;
  const fromCwd = path.resolve(process.cwd(), source);
  if (fs.existsSync(fromCwd)) return fromCwd;
  const fromRepo = path.resolve(path.dirname(componentsFile), '..', source);
  if (fs.existsSync(fromRepo)) return fromRepo;
  return fromCwd;
}

// 一级子目录名集合；目录不存在/不可读返回 null（调用方静默跳过）。
function subdirNames(dir) {
  if (!dir) return null;
  try {
    return new Set(
      fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name),
    );
  } catch {
    return null;
  }
}

// 递归收集目录下所有 .json（跳过 node_modules）。
function walkJsonFiles(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue;
      walkJsonFiles(full, acc);
    } else if (e.isFile() && /\.json$/i.test(e.name)) {
      acc.push(full);
    }
  }
  return acc;
}

// 递归列出目录下所有文件与目录的绝对路径；目录不存在/不可读返回空数组。
function walkEntries(dir) {
  const acc = [];
  const visit = (d) => {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      acc.push(full);
      if (e.isDirectory()) visit(full);
    }
  };
  visit(dir);
  return acc;
}

// 最小 glob：只支持 `*` 通配符（匹配 basename 内任意字符，不跨分隔符），大小写不敏感。
// 其余正则元字符一律转义。
function globMatch(pattern, name) {
  let body = '';
  for (const ch of String(pattern)) {
    if (ch === '*') body += '[^/\\\\]*';
    else body += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${body}$`, 'i').test(String(name));
}

function componentList(componentsJson) {
  return componentsJson && Array.isArray(componentsJson.components) ? componentsJson.components : [];
}

/**
 * 校验产物目录。
 *
 * @param {{ outDir: string, componentsFile: string, layoutFile?: string }} opts
 * @returns {Array<{ rule: string, path: string, detail: string }>} 违规列表；无违规为空数组。
 */
function verifyPackage({ outDir, componentsFile, layoutFile = DEFAULT_LAYOUT }) {
  const violations = [];
  const compsRes = parseJsonSafe(componentsFile);
  const layoutRes = parseJsonSafe(layoutFile);

  // --- layout/component-missing：components.json 声明的 target 必须存在 ---
  if (compsRes.ok) {
    for (const c of componentList(compsRes.value)) {
      if (!c || typeof c.target !== 'string') continue;
      const abs = path.join(outDir, c.target);
      if (!fs.existsSync(abs)) {
        violations.push({
          rule: 'layout/component-missing',
          path: toPosix(c.target),
          detail: `组件 ${c.name} 未部署：${c.target} 不存在`,
        });
      }
    }
  }

  // --- layout/deploy-missing：layout.json 的非可选条目必须按 kind 落位 ---
  if (layoutRes.ok) {
    const deploy = layoutRes.value && Array.isArray(layoutRes.value.deploy) ? layoutRes.value.deploy : [];
    for (const d of deploy) {
      if (!d || typeof d.target !== 'string') continue;
      if (d.optional === true) continue; // 可选条目允许目标不存在
      const abs = path.join(outDir, d.target);
      let ok;
      if (d.kind === 'file') ok = isFile(abs);
      else if (d.kind === 'dir' || d.kind === 'emptydir') ok = isDir(abs);
      else ok = fs.existsSync(abs);
      if (!ok) {
        violations.push({
          rule: 'layout/deploy-missing',
          path: toPosix(d.target),
          detail: `部署条目 ${d.name}（kind=${d.kind}）未按声明落位：${d.target}`,
        });
      }
    }
  }

  // --- layout/excluded-present：被 exclude 排除的文件不应出现在产物里 ---
  if (layoutRes.ok) {
    const deploy = layoutRes.value && Array.isArray(layoutRes.value.deploy) ? layoutRes.value.deploy : [];
    for (const d of deploy) {
      if (!d || typeof d.target !== 'string') continue;
      if (!Array.isArray(d.exclude) || d.exclude.length === 0) continue;
      const root = path.join(outDir, d.target);
      for (const entry of walkEntries(root)) {
        for (const pattern of d.exclude) {
          if (globMatch(pattern, path.basename(entry))) {
            violations.push({
              rule: 'layout/excluded-present',
              path: relPosix(outDir, entry),
              detail: `条目 ${d.name} 的 exclude 模式 ${pattern} 命中：${relPosix(outDir, entry)}`,
            });
            break;
          }
        }
      }
    }
  }

  // --- runtime/missing：便携 Node 与 opencode CLI 必须存在 ---
  if (!isFile(path.join(outDir, 'runtime/node/node.exe'))) {
    violations.push({
      rule: 'runtime/missing',
      path: 'runtime/node/node.exe',
      detail: '便携 Node 缺失：runtime/node/node.exe。请将 node-v24.14.1-win-x64 放入 tools/cache/ 并按 components.json 命名',
    });
  }
  const ocExe = path.join(outDir, 'opencode/bin/opencode.exe');
  const ocCmd = path.join(outDir, 'opencode/bin/opencode.cmd');
  if (!isFile(ocExe) && !isFile(ocCmd)) {
    violations.push({
      rule: 'runtime/missing',
      path: 'opencode/bin/opencode.exe',
      detail: 'opencode CLI 缺失：opencode/bin 下既无 opencode.exe 也无 opencode.cmd。请先 npm install opencode-ai@1.18.30 并部署到 tools/cache/opencode-1.18.30',
    });
  }

  // --- skills/missing + skills/collision：合并 target 的集合比对 ---
  if (compsRes.ok) {
    const groups = new Map();
    for (const c of componentList(compsRes.value)) {
      if (!c || typeof c.target !== 'string') continue;
      const key = toPosix(c.target).replace(/\/+$/, '').toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    for (const members of groups.values()) {
      if (members.length < 2) continue; // 只处理合并到同一 target 的多源组
      const target = toPosix(members[0].target).replace(/\/+$/, '');
      const targetNames = subdirNames(path.join(outDir, target)) || new Set();

      const union = new Set();
      const owners = new Map(); // 技能名 -> 出现的 source 列表
      for (const m of members) {
        const names = subdirNames(resolveSource(m.source, componentsFile));
        if (!names) continue; // 源缺失：输入校验交给 check-sources.ps1
        for (const n of names) {
          union.add(n);
          if (!owners.has(n)) owners.set(n, []);
          owners.get(n).push(m.source);
        }
      }

      for (const n of union) {
        if (!targetNames.has(n)) {
          violations.push({
            rule: 'skills/missing',
            path: target,
            detail: `技能目录 ${n} 未合并到 ${target}`,
          });
        }
      }
      for (const [n, srcs] of owners) {
        if (srcs.length >= 2) {
          violations.push({
            rule: 'skills/collision',
            path: target,
            detail: `技能目录 ${n} 在多个源中重名：${srcs.join(' 与 ')}`,
          });
        }
      }
    }
  }

  // --- plugin/unresolved：以 . 开头的 plugin 路径条目必须解析得到 ---
  for (const relF of PLUGIN_CONFIG_FILES) {
    const abs = path.join(outDir, relF);
    if (!isFile(abs)) continue; // 缺文件由 layout/deploy-missing 报告
    const parsed = parseJsonSafe(abs);
    if (!parsed.ok) continue; // 语法错误由 config/unparseable 报告
    const plugins = Array.isArray(parsed.value.plugin) ? parsed.value.plugin : [];
    for (const entry of plugins) {
      if (typeof entry !== 'string' || !entry.startsWith('.')) continue; // npm 包名等跳过
      const resolved = path.resolve(path.dirname(abs), entry);
      if (!fs.existsSync(resolved)) {
        violations.push({
          rule: 'plugin/unresolved',
          path: relF,
          detail: `插件路径条目 ${entry} 解析为 ${resolved}，不存在`,
        });
      }
    }
  }

  // --- config/unparseable：opencode 配置目录下所有 .json 必须可解析 ---
  for (const abs of walkJsonFiles(path.join(outDir, 'opencode/config/opencode'))) {
    try {
      JSON.parse(fs.readFileSync(abs, 'utf8'));
    } catch (err) {
      violations.push({
        rule: 'config/unparseable',
        path: relPosix(outDir, abs),
        detail: `JSON 解析失败：${err.message}`,
      });
    }
  }

  // --- env/unbound：配置里引用的 {env:X} 必须被每个存在的启动器绑定 ---
  const tokens = new Set();
  for (const relF of ENV_TOKEN_SOURCES) {
    const text = readTextSafe(path.join(outDir, relF));
    if (text === null) continue;
    for (const m of text.matchAll(ENV_TOKEN_RE)) tokens.add(m[2]);
  }
  const launchers = LAUNCHER_FILES.filter((f) => isFile(path.join(outDir, f)));
  for (const name of tokens) {
    for (const launcher of launchers) {
      const text = readTextSafe(path.join(outDir, launcher));
      if (text === null) continue;
      if (!text.includes(`set "${name}=`)) {
        violations.push({
          rule: 'env/unbound',
          path: launcher,
          detail: `token {env:${name}} 未在启动器 ${launcher} 中绑定（缺少 set "${name}=...）`,
        });
      }
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage() {
  return 'Usage: node tools/verify-package.js --out <outDir> [--components <file>] [--layout <file>]';
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function main(argv) {
  const opts = { outDir: null, componentsFile: null, layoutFile: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') opts.outDir = argv[++i];
    else if (arg === '--components') opts.componentsFile = argv[++i];
    else if (arg === '--layout') opts.layoutFile = argv[++i];
    else if (arg === '--help' || arg === '-h') fail(usage());
    else fail(`未知参数：${arg}\n${usage()}`);
  }

  if (!opts.outDir) fail(`缺少必填参数 --out\n${usage()}`);

  const componentsFile = opts.componentsFile || DEFAULT_COMPONENTS;
  const layoutFile = opts.layoutFile || DEFAULT_LAYOUT;

  try {
    JSON.parse(fs.readFileSync(componentsFile, 'utf8'));
  } catch (err) {
    fail(`无法读取或解析 components.json：${componentsFile}\n${err.message}`);
  }
  try {
    JSON.parse(fs.readFileSync(layoutFile, 'utf8'));
  } catch (err) {
    fail(`无法读取或解析 layout.json：${layoutFile}\n${err.message}`);
  }

  const violations = verifyPackage({ outDir: opts.outDir, componentsFile, layoutFile });
  if (violations.length === 0) {
    process.stdout.write(`[OK] package verified: ${opts.outDir}\n`);
    process.exit(0);
  }

  const byRule = new Map();
  for (const v of violations) {
    if (!byRule.has(v.rule)) byRule.set(v.rule, []);
    byRule.get(v.rule).push(v);
  }
  for (const [rule, items] of byRule) {
    process.stdout.write(`[FAIL] ${rule} (${items.length})\n`);
    for (const it of items) {
      process.stdout.write(`  - ${it.path}: ${it.detail}\n`);
    }
  }
  process.exit(1);
}

module.exports = { verifyPackage };

if (require.main === module) {
  main(process.argv.slice(2));
}
