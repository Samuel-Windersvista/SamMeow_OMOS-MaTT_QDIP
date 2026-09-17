'use strict';

// tools/check-docs.js —— 文档/地图层校验器。
//
// 补上「文档层没有校验器」的缺口：本仓库发生过两次编码事故（.bat 的 GBK 约定被
// UTF-8 覆盖、codemap 被双重编码损坏）与两次文档死引用（引用不存在的 docs/ 方案、
// 不存在的 安装到系统.bat）。这些都属于文档层，之前只靠人记。
//
// 零依赖：只用 node:fs / node:path。导出纯函数 checkDocs(...)（不打印、不抛异常、不写文件）
// 与 describeScope(...)（暴露「范围与跳过计数」）。直接运行本文件时是 CLI。
// 违规记录形状与 tools/verify-package.js 一致：{ rule, path, detail }，无 severity。
//
// 三条规则：
//   docs/path-missing      —— include 文档里反引号包裹的路径候选必须能在某个基准上解析
//   docs/encoding-broken   —— 受检文本文件必须能按声明编码解码，且不含 U+FFFD 或私用区字符
//   docs/bom-missing       —— .ps1 必须带 UTF-8 BOM；其余受检扩展名必须不带 BOM
//
// docs/path-missing 的三种解析基准：
//   1. 仓库根：候选相对 repoRoot 解析（含「去掉路径段内空格」的二次尝试）；
//   2. 产物根：首段属于 opencode/plugins/runtime/mcp/setup/data 的候选，相对最新构建产物
//      build/qdip-generic-* 解析（产物里不存在时再查窄化运行时白名单）；找不到产物目录时
//      整类跳过并计入 describeScope().skippedProductPaths（不静默变成空操作）；
//   3. basename 索引：有已知扩展名、无 `/` 的裸文件名（如 安装到系统.bat），按仓库自有文件
//      的 basename 索引核对；未命中再查运行时 basename 白名单。

const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// 路径检查的 include 列表（显式列举，不做全仓扫描）
// ---------------------------------------------------------------------------

// 做「路径引用」检查的文档。
// CHANGELOG.md 是唯一例外：它是历史记录，旧版本条目里提到的文件可能早已改名/删除
// （例如 0.1.0 条目里的组件），对它做路径检查只会制造噪声，因此只做编码检查。
// 同理，历史规划文档（docs/00-*、docs/01-*、docs/02-*、docs/matt-pocock-workflow-report.md、
// docs/workflow-diff-and-recommendations.md、docs/agents/*）与 .superpowers/** 也明确排除在
// 路径检查之外——它们的路径本就可能过时。排除只针对路径检查；编码检查对全仓自有文本照常生效。
const PATH_CHECK_DOCS = [
  'codemap.md',
  'tools/codemap.md',
  'templates/codemap.md',
  'templates/setup/codemap.md',
  'README.md',
  'AGENTS.md',
  'CONTEXT.md',
  'docs/adr/0001-opencode-relative-path-resolution.md',
  'docs/adr/0002-layout-json-stays-out-of-the-package.md',
  'docs/整合包说明书.md',
  'docs/发布前检查清单.md',
  'templates/README.md',
  'templates/玩家使用指南.md',
];

// 已知扩展名：候选以此结尾才当作「文件路径」（无 `/` 的裸文件名也靠它识别）。
const KNOWN_EXTS = ['.md', '.js', '.json', '.bat', '.ps1', '.txt', '.exe', '.cmd', '.tsx', '.ts', '.cjs', '.mjs'];

// 基准明确的仓库目录：即使候选没有已知扩展名，也按仓库根解析（如 `docs/ 验证方案`）。
const REPO_BASES = new Set(['docs', 'tools', 'templates']);

// 产物内路径的顶层目录：这些首段的候选相对最新构建产物解析，而不是仓库根。
const PRODUCT_ROOTS = new Set(['opencode', 'plugins', 'runtime', 'mcp', 'setup', 'data']);

// 窄化运行时白名单（产物相对）：只有真正由运行时产生、构建产物里本就不存在的路径。
// 其余产物路径一律要求「在产物里真的存在」——不再整棵子树放过。
const RUNTIME_ALLOWLIST = [
  'data/.configured',
  'data/.guide-url',
  'data/workspace.txt',
  'opencode/auth/opencode/auth.json',
  'opencode/config/opencode/instructions/persona.md',
  // instructions/ 目录本身也不在构建产物里（config-writer 在玩家选人格时才创建）。
  'opencode/config/opencode/instructions/',
  'runtime/terminal/terminal-*/settings/',
];

// 产物/运行时 basename 白名单：裸文件名候选未命中 basename 索引时的兜底。
// 两类：运行时才产生的文件（persona.md 等），以及部署进产物的可执行文件
// （node.exe / opencode.exe 来自 tools/cache，仓库自有文件索引按设计排除了 tools/cache 与 build）。
const RUNTIME_BASENAMES = new Set([
  'persona.md',
  'auth.json',
  'settings.json',
  'qdip-root.txt',
  '.configured',
  '.guide-url',
  'workspace.txt',
  'node.exe',
  'opencode.exe',
]);

// 非仓库根基准的路径白名单（glob：`*` 匹配任意字符，含 `/`）。
// 这些片段在文档里合法，但它们是相对**其它基准 / 外部仓库 / 命令行**写的，不在本仓库内。
// 产物根相对路径不在此列——它们由 PRODUCT_ROOTS 走「真解析」。
const ALLOWLIST = [
  // 产物根与发布归档：build/ 被 git 忽略，release/ 由发布者创建。
  'build/*',
  'release/*',
  // 构建脚本里的变量前缀与产物简写（非仓库根路径）。
  '$PSScriptRoot/*',
  'outDir/*',
  'qdip-generic-*',
  '<包根>/*',
  'bin/*',
  // 相对产物配置目录（opencode/config/opencode/ 或插件目录）的片段简写。
  'custom/*',
  'instructions/*',
  'local/*',
  'settings/*',
  'skills/*',
  'node_modules/*',
  // 以 / 开头的 URL / 路由片段（如 /setup/、/setup/contract.js）。
  '/*',
  // 玩家本机家目录路径。
  '~/*',
  // opencode 上游源码路径（ADR 引用的是 opencode 仓库，不在本仓库）。
  'src/*',
  // 反引号里实为命令行片段，不是路径——提取口径的已知误报，见文件头「已知盲区」。
  'powershell *',
  'node *',
  'Test-Path *',
  'Replace*',
  // 校验器自己的 rule id（`docs/<词>-<词>`）不是文件路径，但形态与无扩展名的 docs 路径相同。
  'docs/path-missing',
  'docs/encoding-broken',
  'docs/bom-missing',
  // 文档刻意引用一个已删除的产物文件名来断言「产物不含它」。
  '验证清单.md',
];

// ---------------------------------------------------------------------------
// 编码检查的范围与规则
// ---------------------------------------------------------------------------

const TEXT_EXTS = new Set(['.md', '.js', '.json', '.txt', '.bat', '.ps1', '.cjs', '.mjs']);

// 排除目录（不参与编码扫描与 basename 索引）：离线制品、产物、依赖、git 内部、superpowers、归档。
const EXCLUDED_DIR_NAMES = new Set(['node_modules', '.git', '.superpowers']);
const EXCLUDED_REL_PREFIXES = ['tools/cache/', 'build/', 'release/'];

// Node 内置没有 GBK 解码器，但 Node 自带 full-icu 时 TextDecoder('gbk') 可用（本机实测可用）。
// 退化路径：若运行环境不支持 gbk，则按 latin1 读字节，并断言不含 UTF-8 替换字符的字节序列
// EF BF BD（GBK 文件里出现它即说明该文件其实是 UTF-8 且已损坏）。
let GBK_SUPPORTED = true;
try {
  new TextDecoder('gbk');
} catch {
  GBK_SUPPORTED = false;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function toPosix(p) {
  return String(p).replace(/\\/g, '/');
}

function relPosix(repoRoot, abs) {
  return toPosix(path.relative(repoRoot, abs));
}

function readTextSafe(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function existsAt(abs) {
  try {
    return fs.existsSync(abs);
  } catch {
    return false;
  }
}

// 最小 glob：`*` 匹配任意字符（含 `/`），其余正则元字符转义。
function globMatch(pattern, value) {
  let body = '';
  for (const ch of pattern) {
    if (ch === '*') body += '.*';
    else body += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${body}$`).test(value);
}

// 候选归一化：`\` → `/`；去掉 `:行号` / `:起-止` 后缀；去掉行尾标点。
function normalizeCandidate(raw) {
  let s = raw.replace(/\\/g, '/');
  s = s.replace(/:\d+(-\d+)?$/, '');
  s = s.replace(/[。，、；：）)】」』”"']+$/, '');
  return s;
}

// 候选形态判定：
//   - 无 `/`：必须带已知扩展名、且是单个文件名 token（补强 3）。
//     排除退化片段：纯扩展名（`.md`）、点开头词干（`.test.js`）、含空白（`call env.bat`）。
//   - 有 `/`：带已知扩展名 / 以 `/` 结尾 / 首段是 docs|tools|templates（补强 2）。
function isCandidateShape(cand) {
  const hasSlash = cand.includes('/');
  const hasExt = KNOWN_EXTS.some((e) => cand.toLowerCase().endsWith(e));
  if (!hasSlash) {
    if (!hasExt) return false;
    if (/\s/.test(cand)) return false;
    const ext = KNOWN_EXTS.find((e) => cand.toLowerCase().endsWith(e));
    const stem = cand.slice(0, cand.length - ext.length);
    if (stem.length === 0 || stem.startsWith('.')) return false;
    return true;
  }
  if (cand.endsWith('/') || hasExt) return true;
  return REPO_BASES.has(cand.split('/')[0]);
}

// 提取反引号里的路径候选。已知盲区（跳过，无法可靠解析到单一路径）：
//   - 含 `*` / `?` 的 glob 片段；
//   - 含 `...` 的省略写法（如 `tools/cache/...`）；
//   - 含 `<...>` 的占位符（如 `tools/cache/opencode-<version>`）。
function extractPathCandidates(text) {
  const out = [];
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const raw = m[1];
    if (raw.includes('*') || raw.includes('?') || raw.includes('...') || raw.includes('<') || raw.includes('>')) continue;
    const cand = normalizeCandidate(raw);
    if (!isCandidateShape(cand)) continue;
    out.push(cand);
  }
  return out;
}

// 去掉每个路径段内部的空白（`docs/ 验证方案` → `docs/验证方案`）。
function deSpaceCandidate(cand) {
  return cand
    .split('/')
    .map((seg) => seg.replace(/\s+/g, ''))
    .join('/');
}

function isAllowlisted(candidate) {
  return ALLOWLIST.some((pattern) => globMatch(pattern, candidate));
}

function isRuntimeAllowlisted(candidate) {
  return RUNTIME_ALLOWLIST.some((pattern) => globMatch(pattern, candidate));
}

// 选当前版本的构建产物目录 build/qdip-generic-<components.json 的 version>；没有则 null。
//
// 不以 mtime 为主：目录的 mtime 会在其**直接子项**增减时更新，与「哪次构建才是当前版本」
// 无关。曾因此在同一台机器上选中陈旧的 build/qdip-generic-0.3.4（它的目录 mtime 比刚构建
// 出来的 0.5.0 还新），产生 36 条假违规并让「真实仓库零违规」回归锁失败。
// 声明的版本目录不存在时才回退到「最新 mtime，其次名称倒序」，供尚未按当前版本构建过的
// 仓库仍能做部分检查。
function findProductDir(repoRoot) {
  const buildDir = path.join(repoRoot, 'build');
  let entries;
  try {
    entries = fs.readdirSync(buildDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const dirs = entries.filter((e) => e.isDirectory() && e.name.startsWith('qdip-generic-'));
  if (dirs.length === 0) return null;

  // 1) 首选：components.json 声明的版本
  let declared = null;
  try {
    const comps = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tools', 'components.json'), 'utf8'));
    if (comps && typeof comps.version === 'string' && comps.version.trim() !== '') {
      declared = comps.version.trim();
    }
  } catch {
    declared = null;
  }
  if (declared) {
    const exact = dirs.find((e) => e.name === `qdip-generic-${declared}`);
    if (exact) return path.join(buildDir, exact.name);
  }

  // 2) 回退：最新 mtime，其次名称倒序
  const cands = dirs.map((e) => {
    const full = path.join(buildDir, e.name);
    let mtime = 0;
    try {
      mtime = fs.statSync(full).mtimeMs;
    } catch {
      mtime = 0;
    }
    return { full, mtime, name: e.name };
  });
  cands.sort((a, b) => b.mtime - a.mtime || b.name.localeCompare(a.name));
  return cands[0].full;
}

// 仓库自有文件的 basename 索引（排除离线制品、产物、依赖、git 内部、superpowers、归档）。
function buildBasenameIndex(repoRoot) {
  const index = new Set();
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (EXCLUDED_DIR_NAMES.has(e.name)) continue;
        const relDir = relPosix(repoRoot, full) + '/';
        if (EXCLUDED_REL_PREFIXES.some((p) => relDir === p || relDir.startsWith(p))) continue;
        walk(full);
      } else if (e.isFile()) {
        index.add(e.name);
      }
    }
  };
  walk(repoRoot);
  return index;
}

// 递归收集受检文本文件（按扩展名过滤，按排除规则剪枝）。
function collectTextFiles(dir, repoRoot, acc) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (EXCLUDED_DIR_NAMES.has(e.name)) continue;
      const relDir = relPosix(repoRoot, full) + '/';
      if (EXCLUDED_REL_PREFIXES.some((p) => relDir === p || relDir.startsWith(p))) continue;
      collectTextFiles(full, repoRoot, acc);
    } else if (e.isFile() && TEXT_EXTS.has(path.extname(e.name).toLowerCase())) {
      acc.push(full);
    }
  }
  return acc;
}

// 私用区字符 U+E000–U+F8FF：编码事故的典型残留（字体私有字形/损坏字节被误映射）。
function hasPrivateUseChar(text) {
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xe000 && cp <= 0xf8ff) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 路径候选解析
// ---------------------------------------------------------------------------

// 解析单个候选；返回 { status: 'ok' | 'skipped' | 'missing', via, detail }，并累加 stats。
function resolveCandidate(cand, ctx, stats) {
  // 裸文件名（有扩展名、无 `/`）：basename 索引 → 产物/运行时 basename 白名单 → 白名单。
  if (!cand.includes('/')) {
    stats.basenameCandidates += 1;
    if (ctx.basenameIndex.has(cand)) return { status: 'ok', via: 'basename' };
    if (RUNTIME_BASENAMES.has(cand)) return { status: 'ok', via: 'runtime-basename' };
    if (isAllowlisted(cand)) return { status: 'ok', via: 'allowlist' };
    return { status: 'missing', detail: '仓库内没有任何同名文件（basename 索引未命中，也不在运行时 basename 白名单中）' };
  }

  const first = cand.split('/')[0];

  // 产物路径：相对最新产物根解析。
  if (PRODUCT_ROOTS.has(first)) {
    stats.productPathCandidates += 1;
    if (!ctx.productDir) {
      stats.skippedProductPaths += 1;
      return { status: 'skipped', detail: '未找到构建产物目录，产物路径检查已跳过' };
    }
    stats.productPathsChecked += 1;
    if (existsAt(path.join(ctx.productDir, cand))) return { status: 'ok', via: 'product' };
    if (isRuntimeAllowlisted(cand)) return { status: 'ok', via: 'runtime-product' };
    return { status: 'missing', detail: `产物 ${relPosix(ctx.repoRoot, ctx.productDir)} 中不存在（也不在运行时白名单中）` };
  }

  // 其它候选：先按仓库根解析（含去空格二次尝试），再走非仓库根基准白名单。
  stats.repoPathCandidates += 1;
  if (existsAt(path.join(ctx.repoRoot, cand))) return { status: 'ok', via: 'repo' };
  const deSpaced = deSpaceCandidate(cand);
  if (deSpaced !== cand && existsAt(path.join(ctx.repoRoot, deSpaced))) return { status: 'ok', via: 'repo-despace' };
  if (isAllowlisted(cand)) return { status: 'ok', via: 'allowlist' };
  return { status: 'missing', detail: '仓库内不存在（也不在非仓库根路径白名单中）' };
}

// 扫描所有 include 文档的路径候选，返回违规与统计。
function scanPathRefs(repoRoot) {
  const productDir = findProductDir(repoRoot);
  const basenameIndex = buildBasenameIndex(repoRoot);
  const ctx = { repoRoot, productDir, basenameIndex };
  const stats = {
    productPathCandidates: 0,
    productPathsChecked: 0,
    skippedProductPaths: 0,
    basenameCandidates: 0,
    repoPathCandidates: 0,
    basenameIndexSize: basenameIndex.size,
  };
  const violations = [];
  for (const doc of PATH_CHECK_DOCS) {
    const text = readTextSafe(path.join(repoRoot, doc));
    if (text === null) continue; // 文档本身不存在时跳过（不存在性由别处负责）
    for (const cand of extractPathCandidates(text)) {
      const res = resolveCandidate(cand, ctx, stats);
      if (res.status === 'missing') {
        violations.push({
          rule: 'docs/path-missing',
          path: cand,
          detail: `在 ${doc} 中被反引号引用，但${res.detail}`,
        });
      }
    }
  }
  return { violations, stats, productDir };
}

// ---------------------------------------------------------------------------
// 主函数
// ---------------------------------------------------------------------------

/**
 * 校验仓库文档/地图层。
 *
 * @param {{ repoRoot: string }} opts
 * @returns {Array<{ rule: string, path: string, detail: string }>} 违规列表；无违规为空数组。
 */
function checkDocs({ repoRoot }) {
  const violations = [...scanPathRefs(repoRoot).violations];

  // --- docs/encoding-broken + docs/bom-missing：全仓自有文本的编码与 BOM 约定 ---
  for (const abs of collectTextFiles(repoRoot, repoRoot, [])) {
    const ext = path.extname(abs).toLowerCase();
    const rel = relPosix(repoRoot, abs);
    let buf;
    try {
      buf = fs.readFileSync(abs);
    } catch {
      continue;
    }
    const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;

    // BOM 约定：.ps1 必须带；其余受检扩展名必须不带。
    if (ext === '.ps1') {
      if (!hasBom) {
        violations.push({
          rule: 'docs/bom-missing',
          path: rel,
          detail: '.ps1 必须带 UTF-8 BOM（PowerShell 5.1 会把无 BOM 脚本按 ANSI/GBK 解析，遇中文即语法错误）',
        });
      }
    } else if (hasBom) {
      violations.push({
        rule: 'docs/bom-missing',
        path: rel,
        detail: `${ext} 必须不带 BOM`,
      });
    }

    // 解码约定：.bat 按 GBK，其余按 UTF-8。
    let text;
    if (ext === '.bat') {
      if (GBK_SUPPORTED) {
        text = new TextDecoder('gbk').decode(buf);
      } else {
        // 退化路径：latin1 读字节，直接查 UTF-8 替换字符的字节序列 EF BF BD。
        text = buf.toString('latin1');
        if (buf.includes(Buffer.from([0xef, 0xbf, 0xbd]))) {
          violations.push({
            rule: 'docs/encoding-broken',
            path: rel,
            detail: '.bat 按 GBK 解码退化路径发现 UTF-8 替换字符字节序列 EF BF BD（文件疑似实为 UTF-8 且已损坏）',
          });
          continue;
        }
      }
    } else {
      text = buf.toString('utf8');
    }

    if (text.includes('\uFFFD')) {
      violations.push({
        rule: 'docs/encoding-broken',
        path: rel,
        detail: `按声明编码（${ext === '.bat' ? 'GBK' : 'UTF-8'}）解码后含替换字符 U+FFFD`,
      });
      continue;
    }
    if (hasPrivateUseChar(text)) {
      violations.push({
        rule: 'docs/encoding-broken',
        path: rel,
        detail: '解码后含私用区字符（U+E000–U+F8FF）',
      });
    }
  }

  return violations;
}

/**
 * 描述本次检查的范围与跳过计数（不改 checkDocs 的返回签名，额外暴露给 CLI/测试）。
 *
 * @param {{ repoRoot: string }} opts
 * @returns {{
 *   repoRoot: string,
 *   productDir: string|null,
 *   productPathCandidates: number,
 *   productPathsChecked: number,
 *   skippedProductPaths: number,
 *   basenameCandidates: number,
 *   repoPathCandidates: number,
 *   basenameIndexSize: number,
 * }}
 */
function describeScope({ repoRoot }) {
  const { stats, productDir } = scanPathRefs(repoRoot);
  return {
    repoRoot,
    productDir: productDir ? relPosix(repoRoot, productDir) : null,
    ...stats,
  };
}

module.exports = { checkDocs, describeScope };

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage() {
  return 'Usage: node tools/check-docs.js [--repo <repoRoot>]';
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function main(argv) {
  let repoRoot = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--repo') {
      repoRoot = argv[++i];
      if (!repoRoot) fail(`缺少 --repo 的值\n${usage()}`);
    } else if (arg === '--help' || arg === '-h') {
      fail(usage());
    } else {
      fail(`未知参数：${arg}\n${usage()}`);
    }
  }

  const scope = describeScope({ repoRoot });
  process.stdout.write(`[SCOPE] repo=${scope.repoRoot}\n`);
  process.stdout.write(`[SCOPE] productDir=${scope.productDir || '(none)'}\n`);
  process.stdout.write(
    `[SCOPE] product paths: candidates=${scope.productPathCandidates} checked=${scope.productPathsChecked} skipped=${scope.skippedProductPaths}\n`,
  );
  process.stdout.write(
    `[SCOPE] repo paths=${scope.repoPathCandidates} basename candidates=${scope.basenameCandidates} basename index=${scope.basenameIndexSize}\n`,
  );
  if (scope.skippedProductPaths > 0) {
    process.stdout.write(`[WARN] 未找到构建产物，已跳过 ${scope.skippedProductPaths} 条产物路径检查（先跑一次 build.ps1 可真正核对）\n`);
  }

  const violations = checkDocs({ repoRoot });
  if (violations.length === 0) {
    process.stdout.write('[OK] docs verified\n');
    process.exit(0);
  }
  const byRule = new Map();
  for (const v of violations) {
    if (!byRule.has(v.rule)) byRule.set(v.rule, []);
    byRule.get(v.rule).push(v);
  }
  for (const [rule, items] of byRule) {
    process.stdout.write(`[FAIL] ${rule} (${items.length})\n`);
    for (const it of items) process.stdout.write(`  - ${it.path}: ${it.detail}\n`);
  }
  process.exit(1);
}

if (require.main === module) {
  main(process.argv.slice(2));
}
