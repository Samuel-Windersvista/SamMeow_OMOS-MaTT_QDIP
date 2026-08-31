# SamMeow QDIP（Quick Deployment Integration Package）

开箱即用的 AI 编程环境整合包构建仓库：把 opencode CLI、便携 Node、插件全家桶（OMOslim / superpowers / matt-skills）与首次配置引导服务组装成一个可分发 zip。玩家解压 → 双击 `启动.bat` → 浏览器配置 API key → 进入工作台。

## 目录结构

| 路径 | 说明 |
|---|---|
| `docs/` | 项目文档：需求说明书、通用版 spec、实施计划 |
| `templates/` | 打包模板源：启动器、更新脚本、引导服务与配置写入（setup/）、引导页、opencode 配置模板、玩家使用指南、验证清单 |
| `tools/` | 打包器 `build.ps1`、组件清单 `components.json`、源检查 `check-sources.ps1` |
| `build/` | 组装产物（`qdip-generic-<version>/` 目录 + zip），git 忽略 |
| `tools/cache/` | 离线组件缓存（便携 Node zip、opencode 离线包），git 忽略 |
| `spt-edition/` | 预留 SPT 专业版目录（当前为空占位） |
| `generic/` | 预留通用版辅助目录（当前为空占位） |

## 维护者工作流

1. **更新组件**：把新版本组件放入 `tools/cache/`（便携 Node 官方 zip 解压、opencode 用 `npm install --prefix` 后提取真实二进制），或更新 `components.json` 中的来源路径
2. **组装**：`powershell -ExecutionPolicy Bypass -File tools\build.ps1`（从仓库根运行）
3. **验证**：
   - `build\qdip-generic-<version>\启动.bat --check`（自检 node/opencode）
   - 首次引导冒烟（起 guide-server → .guide-url → 引导页 200）
   - 端到端：解压 zip 到全新目录走首次配置（见 docs/ 验证方案）
4. **发布**：把 `build/qdip-generic-<version>.zip` 放入 release/ 归档

## 组件来源清单

| 组件 | 来源 | 版本 | 许可 |
|---|---|---|---|
| 便携 Node | nodejs.org 官方发行版 zip | v24.14.1 | MIT |
| opencode CLI | npm registry `opencode-ai` | 1.18.25 | MIT |
| OMOslim | `oh-my-opencode-slim` 仓库 dist 构建产物 | 2.2.17+patch-kit | MIT |
| superpowers | 本机 `~/.config/opencode/node_modules/superpowers` | 6.3.0 | MIT |
| matt-skills | 本机 `~/.config/opencode/skills` | 2026-08-24 | MIT |
| OMOslim 自定义片段 | 本机 `~/.config/opencode/oh-my-opencode-slim` | latest | MIT |

## 许可

各组件遵循其上游 MIT 许可（出处见上表）。本仓库的整合脚本与文档由 SamMeow 维护，MIT 许可。
