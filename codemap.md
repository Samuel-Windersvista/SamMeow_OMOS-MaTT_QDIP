# Repository Atlas: SamMeow QDIP（Quick Deployment Integration Package）

## Project Responsibility

开箱即用的 AI 编程环境整合包（QDIP）构建仓库：把 opencode CLI、便携 Node 运行时、插件全家桶（oh-my-opencode-slim / matt-skills / opencode-quota）与首次配置引导服务组装成一个可分发 zip。终端玩家解压后双击 `启动.bat`，浏览器完成 API key 配置即可进入工作台，全程离线、零系统安装依赖。

构建流水线为清单驱动：`tools/components.json` 声明组件来源（`tools/cache/` 离线制品 + 本机插件目录），`tools/build.ps1` 按 `templates/` 行为模板组装出 `build/qdip-generic-<version>/` 并压缩为 zip。

## System Entry Points

- `tools/build.ps1`：构建编排主入口（5 阶段流水线：清理 → 复制组件 → 部署模板 → 校验 → 打包）
- `tools/components.json`：组件清单（版本号、source→target 映射、required 标志）
- `templates/启动.bat`：玩家侧主入口（便携环境注入 + 首次引导调度 + opencode 启动）
- `templates/setup/guide-server.js`：首次引导 HTTP 服务入口（被 启动.bat spawn）
- `README.md`：项目概述与维护者工作流

## Directory Map (Aggregated)

| Directory | Responsibility Summary | Detailed Map |
|-----------|------------------------|--------------|
| `tools/` | Build Orchestration 与 Packaging Pipeline：按清单把模板、离线制品、外部插件组装为分发目录与 zip，含源完整性校验闸门。 | [View Map](tools/codemap.md) |
| `templates/` | 分发模板源：启动器/更新脚本、opencode 配置模板、引导服务源码与终端用户文档的源头。 | [View Map](templates/codemap.md) |
| `templates/setup/` | 首次运行引导服务（Controller/Service/View 三层）：浏览器配置 API key，写入 opencode 便携配置目录并验证连通性。 | [View Map](templates/setup/codemap.md) |
| `docs/` | 项目文档：需求说明书、通用版 spec、实施计划（不参与构建）。 | - |
| `build/` | 组装产物（分发目录 + zip），git 忽略。 | - |
| `tools/cache/` | 离线组件缓存（便携 Node、opencode 离线包），git 忽略。 | - |
| `spt-edition/`、`generic/` | 预留专业版/通用版辅助目录（当前空占位）。 | - |

## Data & Control Flow

```
维护者: 更新 tools/cache/ 制品 → tools/build.ps1
        → [1/5] 清理 → [2/5] 复制 11 组件(runtime/opencode/plugins/skills)
        → [3/5] 部署 templates/(启动.bat、setup/、配置模板、文档)
        → [4/5] check-sources.ps1 + 制品断言校验
        → [5/5] Compress-Archive → build/qdip-generic-<version>.zip

玩家: 解压 zip → 双击 启动.bat
        → 注入 PATH/XDG_* 便携环境 → 检测 data\.configured 哨兵
        → 未配置: spawn guide-server.js → 打开引导页(first-run.html)
          → POST /api/test 验证 key → POST /api/configure 落盘
          → 写 .configured 哨兵
        → 已配置: 直接执行 opencode %* → 工作台
```

## Known Constraints

- Windows 平台假设（PowerShell、`\` 路径、`node.exe`/`opencode.exe`）
- `tools/components.json` 含多个本机开发环境绝对路径（omoslim、omoslim-append、omo-skills、matt-skills、opencode-quota），移植构建机需同步修改
- 组件版本固定：便携 Node v24.14.1、opencode CLI 1.18.30（离线缓存）
