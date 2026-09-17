# SamMeow QDIP — AI 编程工作台整合包

开箱即用的 AI 编程环境：把你自己的 API key 填进浏览器配置页，双击一个 bat 就能进 AI 工作台（opencode + 插件全家桶）。你负责描述需求，AI 负责写代码。

- 当前版本：0.5.0（变更记录见 `CHANGELOG.md`）
- 第一次使用建议先看 `玩家使用指南.md`（工作流建议与常见报错对照）

## 系统要求

| 项 | 要求 |
|---|---|
| 系统 | Windows 10 2004 及以上（自带便携 Windows Terminal，显示效果更好） |
| 网络 | 首次运行需联网（配置页测试连接 + 后续 AI 对话） |
| 权限 | 一般无需管理员；被杀毒软件拦截了 bat 时请添加信任 |

## 快速开始（5 步）

1. 解压到任意文件夹（建议在 D:\ 或 E:\ 根目录下新建一个文件夹再解压，路径别太深、别带空格）
2. 双击 `启动.bat`
3. 浏览器弹出配置页：勾选模型服务商 → 粘贴 API key → 点"测试连接"（显示成功）
4. 点"保存配置"，关闭浏览器
5. 重新双击 `启动.bat` → 进入工作台

## 目录结构

| 路径 | 作用 | 玩家能做什么 |
|---|---|---|
| `启动.bat` | 主入口：首次运行拉引导配置页；已配置后直接进入工作台 | 别改 |
| `进入环境.bat` | 已配置环境的快速入口（新标签页即 QDIP 环境） | 别改 |
| `更新组件.bat` | 组件更新脚本（联网更新 opencode） | 可选 |
| `README.md` | 本文件：包结构说明 | - |
| `CHANGELOG.md` | 版本变更记录 | - |
| `玩家使用指南.md` | 高效使用工作流、自定义服务商教程 | - |
| `data\` | 玩家数据：配置状态标记、工作目录记忆 | 可删（=重置回首次配置） |
| `setup\` | 首次引导服务（浏览器配置页的后端） | 别改 |
| `opencode\bin\` | opencode CLI 可执行文件 | 别改 |
| `opencode\auth\` | 登录密钥（API key） | 保留可续用 |
| `opencode\config\opencode\` | 主配置：`opencode.json`、`oh-my-opencode-slim.json`、`tui.json`、`preferences.md`（个人倾向/工作流指令）、`skills\` 技能库 | 可改（建议只动 `local\`） |
| `opencode\config\opencode\local\` | 玩家本地修改区：手动覆盖配置放这里 | 推荐改这里 |
| `plugins\` | 插件：oh-my-opencode-slim / opencode-quota | 别改 |
| `mcp\chrome-devtools-mcp\` | 浏览器自动化 MCP（AI 可控浏览器） | 别改 |
| `runtime\` | 便携运行时：Node 24、Windows Terminal | 别改 |

> 更新整合包时保留 `opencode\auth` 与 `opencode\config\opencode\local` 即可保留密钥与自定义配置。

## 更新与重置

- **更新**：等新版整合包发布，下载新版 zip 解压覆盖到同一目录（重要数据建议先手动备份）。
- **重置**：删除整个 `data` 文件夹 = 回到首次配置状态（配置与 API key 一起重置）。

## 注意事项

- 不要在盘符根目录直接解压（如解压到 C:\ 或 D:\ 根目录），请先新建一个文件夹。
- AI 默认在整合包根目录干活；用带参数方式运行 `启动.bat --workspace` 可选择工作目录（选择会被记住）。注意双击 bat 不会传递参数，带参数的具体做法见 `玩家使用指南.md` 第 6 节。
- 本包组件（opencode、Node、各插件与技能）均为开源 MIT 许可项目，出处与版本见维护者仓库 README。
