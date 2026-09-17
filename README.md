# SamMeow QDIP（Quick Deployment Integration Package）

开箱即用的 AI 编程环境整合包构建仓库：把 opencode CLI、便携 Node、插件全家桶（OMOslim / matt-skills / opencode-quota）与首次配置引导服务组装成一个可分发 zip。玩家解压 → 双击 `启动.bat` → 浏览器配置 API key → 进入工作台。

## 目录结构

| 路径 | 说明 |
|---|---|
| `docs/` | 项目文档：需求说明书、通用版 spec、实施计划、工作流诊断报告（Matt Pocock 思想差异与建议）、维护者说明书、发布前检查清单 |
| `templates/` | 打包模板源：便携环境模块 `env.bat`（被两个启动器 call）、启动器（`启动.bat`/`进入环境.bat`）、更新脚本、引导服务与配置写入（setup/）、引导页、opencode 配置模板（含 `tui.json`）、玩家本地修改区说明模板（local/）、数据目录占位模板（data/）、玩家使用指南 |
| `tools/` | 打包器 `build.ps1`、组件清单 `components.json`、包布局声明 `layout.json`、产物校验器 `verify-package.js`、源检查 `check-sources.ps1`、文档校验器 `check-docs.js`、vendored 依赖清单（`tools/omoslim-runtime/`、`tools/quota-runtime/`） |
| `build/` | 组装产物（`qdip-generic-<version>/` 目录 + zip），git 忽略 |
| `tools/cache/` | 离线组件缓存（便携 Node zip、opencode 离线包、Windows Terminal、chrome-devtools-mcp），git 忽略 |
| `spt-edition/` | 预留 SPT 专业版目录（当前为空占位） |
| `generic/` | 预留通用版辅助目录（当前为空占位） |

## 维护者工作流

1. **更新组件**：把新版本组件放入 `tools/cache/`（便携 Node 官方 zip 解压、opencode 用 `npm install --prefix` 后提取真实二进制），或更新 `components.json` 中的来源路径。OMOslim 升级时同步检查 `tools/omoslim-runtime/package.json` 依赖并刷新缓存（在 `tools/cache/omoslim-runtime` 下 `npm ci`）
2. **组装**：`powershell -ExecutionPolicy Bypass -File tools\build.ps1`（从仓库根运行）
3. **验证**：
   - 自动化：`node --test "tools/*.test.js"`（产物校验器 + 启动器环境模块 + 文档/地图层校验器单测；该 glob 已包含 `check-docs.test.js`）+ `node --test "templates/setup/*.test.js"`（服务商契约、配置写入器与引导服务单测）。`build.ps1` 的 [4/5] 阶段先由 `check-sources.ps1` 做存在性校验、再做版本校验（各打印一行 `[OK]`），随后由 `verify-package.js` 做产物校验；版本不符时按输出的 `[HINT]` 处理（换对应版本制品，或更新 `components.json` 的 `version`）。
   - `build\qdip-generic-<version>\启动.bat --check`（自检 node/opencode + OMOslim 插件加载 + Windows Terminal 存在性）
   - 首次引导冒烟（起 guide-server → .guide-url → 引导页 200）
   - 端到端：解压 zip 到全新目录走首次配置
4. **发布**：先逐条过 `docs/发布前检查清单.md`，再把 `build/qdip-generic-<version>.zip` 复制到 `release/` 归档。该目录已加入 `.gitignore`——单个 zip 约 158 MB，超过 GitHub 的 100 MB 单文件上限，不要试图提交它

## 组件来源清单

| 组件 | 来源 | 版本 | 许可 |
|---|---|---|---|
| 便携 Node | nodejs.org 官方发行版 zip | v24.14.1 | MIT |
| 便携 Windows Terminal | GitHub microsoft/terminal release 官方 unpackaged ZIP | 1.24.11911.0 | MIT |
| opencode CLI | npm registry `opencode-ai` | 1.18.30 | MIT |
| OMOslim | `oh-my-opencode-slim` 仓库 dist 构建产物 | 2.2.18+patch-kit | MIT |
| OMOslim 运行时依赖 | npm registry(zod/jsdom/@opencode-ai/plugin/@opentui/core/@opentui/solid/solid-js,经 tools/omoslim-runtime 清单 vendored)| 2.2.18-deps+tui | MIT |
| matt-skills | 本机 `~/.agents/skills` | 2026-09-11 | MIT |
| OMO 技能 | 本机 `~/.config/opencode/skills` | 2.2.18 | MIT |
| 个人倾向文件 | `templates/preferences.md`（同步自本机 `~/.config/opencode/preferences.md`） | v2 (2026-09-08) | MIT |
| opencode-quota | 本机 `~/.config/opencode/node_modules/@slkiser/opencode-quota`(用量/配额显示插件) | 3.8.3 | MIT |
| quota 运行时依赖 | npm registry(comment-json/xdg-basedir/solid-js 等,经 tools/quota-runtime 清单 vendored) | 3.8.3-deps | MIT |
| chrome-devtools-mcp | `tools/cache/chrome-devtools-mcp`（Chrome DevTools MCP，浏览器自动化） | 1.8.0 | MIT |
| OMOslim 自定义片段 | 本机 `~/.config/opencode/oh-my-opencode-slim` | latest | MIT |

## 许可

各组件遵循其上游 MIT 许可（出处见上表）。本仓库的整合脚本与文档由 SamMeow 维护，MIT 许可。
