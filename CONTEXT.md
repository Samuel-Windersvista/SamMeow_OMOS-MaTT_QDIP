# SamMeow QDIP

QDIP（Quick Deployment Integration Package）是一个**便携 AI 编程环境整合包**的构建仓库。它把 opencode CLI、便携 Node 运行时、插件全家桶与首次配置引导服务组装成一个可分发的 zip；终端玩家解压后双击启动器，在浏览器完成 API key 配置即可进入工作台，全程离线、零系统安装依赖。

本文件是**术语表**，不是规格、不是计划、不是实现笔记。它只记录这个上下文中独有的概念，以及每个概念的规范用词。

## 交付物

**QDIP 整合包**：
组装完成、可分发给玩家的那份自包含目录（及其 zip）。玩家解压后不需要安装任何东西。
_Avoid_：安装包、发行版、软件包、release

**产物**：
构建流水线写出的那一份整合包目录，路径为 `build/qdip-generic-<版本>/`。它是构建的**输出**，不是仓库的一部分。
_Avoid_：输出、构建结果、dist

**组件清单**：
`tools/components.json`。声明每个外部组件的来源路径、目标路径、版本与必需性。它管的是**外部来源**（离线制品、本机插件目录），不管模板。
_Avoid_：配置清单、manifest、依赖表

**分发模板**：
`templates/` 下的自有文件——启动器、引导服务源码、配置模板、玩家文档。它们是产物内文件的**源头**，本身不参与运行时执行。
_Avoid_：模板文件、静态资源、assets

**包布局**：
整合包内部「哪个文件落在哪个路径」的契约。它同时被构建脚本、启动器、引导服务与测试引用，是跨语言的共享事实。
_Avoid_：目录结构、路径约定、文件树

## 运行时

**便携环境**：
启动器注入给 opencode 进程的那一组环境变量（`PATH`、`XDG_DATA_HOME`、`XDG_CONFIG_HOME`、`QDIP_*`、`ROOTS`）。它把运行时、认证目录与配置目录全部重定向到包内，使整合包不依赖宿主系统。
_Avoid_：运行环境、沙箱、环境配置

**启动器**：
玩家双击进入环境的那个批处理入口，共两个：`启动.bat`（首次门控 + 启动 opencode）与 `进入环境.bat`（只给一个注入了便携环境的 shell）。
_Avoid_：入口脚本、引导程序、run.bat

**首次运行门控**：
由 `data\.configured` 的存在性决定的分支：不存在则进引导流程，存在则直接启动 opencode。
_Avoid_：初始化检查、首次配置判断

**哨兵**：
用**文件的存在性或内容**在两个进程之间传递状态的朴素机制。当前有两个：`data\.configured`（是否已配置）与 `data\.guide-url`（引导服务的地址）。
_Avoid_：标记文件、flag、lockfile

**引导服务**：
`setup/guide-server.js`。首次运行时被启动器 spawn 的本地 HTTP 服务，监听 127.0.0.1 随机端口，向引导页提供 API 与静态文件。
_Avoid_：配置服务、安装向导、setup server

**引导页**：
`setup/first-run.html`。玩家在浏览器里完成服务商选择、key 填写与人格/模型分配的单页界面。
_Avoid_：配置界面、向导页

**工作目录**：
玩家选择的、opencode 实际运行所在的目录（记录在 `data\workspace.txt`）。它不是整合包自身的位置，设置后启动器会把 CWD 切到它。
_Avoid_：项目目录、工作区、cwd

## 配置

**服务商**：
一个模型 API 的提供方。分两类——**精选服务商**（在 `PROVIDERS` 静态表内，如 deepseek / kimi / openai）与**自定义服务商**（玩家自填 Base URL 与模型列表的任意 OpenAI 兼容端点）。
_Avoid_：供应商、厂商、provider 的中文替代词

**精选服务商**：
`PROVIDERS` 表里登记过的服务商。它带 `builtin` 标志：内置的只需写 `auth.json` 即生效，非内置的还需在 `opencode.json` 的 `provider` 段注册为 OpenAI 兼容。
_Avoid_：内置服务商、预置服务商

**自定义服务商**：
玩家在引导页新增的服务商。它的标识（key）由 Base URL 派生，必须避开精选服务商的保留名，且必须有非空的模型列表。
_Avoid_：第三方服务商、其它服务商

**人格**：
写入 `instructions` 的 AI 语气指令文件（`persona.md`），由引导页选择：默认不写、内置若干预设、或玩家自填。
_Avoid_：角色、提示词、system prompt

**角色模型分配**：
把某个模型绑定到某个 agent（orchestrator / oracle / fixer / 议会席位…）的配置，落盘在 `oh-my-opencode-slim.json` 的预设里。议会席位需要同时写入 `default` 与 `synthesizer` 两处。
_Avoid_：模型配置、模型路由

## 校验

**输入校验**：
`tools/check-sources.ps1`。在复制**之前**检查每个组件来源是否存在。它管的是构建的输入。
_Avoid_：前置检查、源检查

**产物校验**：
`tools/verify-package.js`。在部署**之后**检查产物是否满足包布局契约。它管的是构建的输出。
_Avoid_：构建检查、产物测试

**技能库**：
由两个技能来源（OMO 技能与 Matt 技能）合并到同一个 target 目录后的结果。因为是多来源合并，它的完整性必须按**集合**判定，而不是按数量。
_Avoid_：技能包、技能目录、插件
