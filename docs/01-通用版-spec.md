# QDIP 通用版 — 设计规格 (Spec)

> 项目：SamMeow_OMOS+SP+MaTT_QDIP (Quick Deployment Integration Package)
> 版本：通用版 v1.0（SPT 专业版见 spt-edition/，后话）
> 日期：2026-08-31
> 关联文档：`00-可行性报告.md`

---

## 1. 目标

让看视频的观众"拿来即用"：下载 zip → 解压 → 双击启动器 → 勾选模型填 key → 进入可用的 vibecoding 环境（opencode + OMOslim + superpowers + matt skills）。玩家无需安装 Node/bun/git，无需手工配置。

## 2. 成功标准

1. 全新 Windows 10/11 机器上，解压到可用状态的操作 ≤ 5 步（解压 → 双击 → 勾选 → 填 key → 进入）
2. 玩家零依赖：不要求预装 Node/bun/git/任何运行时
3. 首次引导可完成：API key 配置、模型勾选、连接测试、错误提示
4. 打包器可重复运行：组件更新后一键重新打包 zip
5. 更新不丢配置：覆盖组件目录后 auth/ 与 config/local/ 保持

## 3. 范围

### 3.1 包含（通用版）

- opencode CLI 1.18.25（离线捆绑）
- OMOslim（本地仓库 dist 构建产物，含 patch-kit 合并特性）
- superpowers 6.3.0
- matt pocock skills（10 个已同步技能 + 前缀定制）
- append 定制（superpowers-bridge 预设的 agent 提示词）
- 便携 Node（zip 版捆绑）
- 启动器 run.bat（环境注入 + 引导检测 + 启动）
- 首次运行引导页（本地网页：勾选模型 + 填 key + 测试）
- 打包器 build.ps1 + components.json（仅开发者使用，不进 zip）
- 更新组件.bat（半自动组件更新，进阶玩家）

### 3.2 不包含（明确不做）

- SPT 专业版内容（spt-mcp、知识库）——spt-edition/ 目录预留
- 自动更新检测
- 图形化安装向导
- macOS/Linux 支持
- opencode 2.x（beta，观望）

## 4. 架构

### 4.1 整合包目录结构（zip 解压后）

```
qdip-generic/
├── 启动.bat                    # 玩家唯一入口：环境注入 + 引导检测 + 启动 opencode
├── 更新组件.bat                # 半自动组件更新（进阶）
├── setup/
│   ├── first-run.html          # 引导页（浏览器打开）
│   ├── guide-server.js         # 微型本地 HTTP 服务（Node 实现）
│   └── lib/
│       └── config-writer.js    # 配置读写（auth.json / provider 配置 / 标记文件）
├── runtime/                    # 内置便携 Node（zip 版）
│   └── node/                   # node.exe + npm
├── opencode/
│   ├── bin/                    # opencode CLI（npm 全局安装产物或便携二进制）
│   ├── config/
│   │   ├── opencode.json       # 主配置模板（plugin 注册、MCP、指令）
│   │   ├── oh-my-opencode-slim.json  # OMOslim 预设（模型路由模板）
│   │   └── local/              # 玩家本地修改区（打包器生成占位说明）
│   ├── auth/                   # 引导页写入：auth.json（provider + apiKey）
│   └── skills/                 # matt skills 副本（可覆盖更新）
├── plugins/
│   ├── oh-my-opencode-slim/    # dist 构建产物 + 预设 append 定制
│   └── superpowers/            # node_modules 内容（6.3.0）
└── data/                       # 运行时数据（会话/缓存/标记），删除 = 重置
```

### 4.2 启动器（启动.bat）流程

```
1. 设置环境：PATH 前置 runtime/node + opencode/bin；窗口标题"SamMeow AI 工作台"
2. 检查 data/.configured 标记
   ├─ 不存在 → 启动 setup：node setup/guide-server.js → 浏览器打开 http://127.0.0.1:<port>
   │           引导页流程：勾选服务商 → 填 key → 测试连接 → 写 auth.json + 配置 → 写标记 → 提示重启启动器
   └─ 存在 → 直接运行 opencode（工作目录 = 整合包根目录）
3. opencode 退出后窗口保留（玩家可继续使用已注入的 node/npm/git 命令）
```

### 4.3 引导页（first-run.html + guide-server.js）

- 纯本地：127.0.0.1 随机端口，无外网依赖
- 功能：
  - 服务商列表（预置 deepseek / kimi / 其他，勾选启用）
  - API key 输入 + 保存到 opencode/auth/auth.json
  - 连接测试（调用模型 API 的轻量探测，如 models 列表或最小 completion）
  - 常见错误提示（key 无效 / 网络不通 / 余额不足）
  - 完成 → 写 data/.configured 标记
- 配置写入格式遵循 opencode 的 provider 配置结构（auth.json：`{ provider: { type, apiKey } }`），与 opencode 1.18.25 兼容
- oh-my-opencode-slim.json 中预设的模型路由（orchestrator=deepseek 等）在打包时固定为模板，引导页只补 key

### 4.4 打包器（tools/build.ps1，开发者用）

```
build.ps1 读 components.json：
  components.json 声明每个组件的来源（本地路径/版本/目标目录）：
    - opencode: npm 离线包（npm pack opencode-ai 预下载到 tools/cache/）
    - OMOslim: E:\云文件\GitHub\oh-my-opencode-slim（取 dist/ + 定制 append）
    - superpowers: C:\Users\Winde\.config\opencode\node_modules\superpowers
    - skills: C:\Users\Winde\.config\opencode\skills（matt 10 个）
    - node: nodejs.org zip 下载（或 tools/cache/ 离线包）
    - 配置模板: templates/ 目录（opencode.json、oh-my-opencode-slim.json、启动.bat 等）
流程：
  1. 清理 build/ 组装目录
  2. 按 components.json 复制组件 → 校验（文件存在性/大小）
  3. 生成配置模板（含占位 provider、正确的相对路径引用）
  4. 生成 zip（build/qdip-generic-<version>.zip）
```

### 4.5 更新策略

- **主路径（v1）**：新版 zip 覆盖。架构保证 auth/ 与 config/local/ 独立，覆盖不丢配置。
- **辅路径**：更新组件.bat 半自动更新（内置 node 跑 npm 更新 opencode/superpowers；OMOslim/skills 提示手动替换或引导安装 git）。
- 打包器保证组件版本组合经测试后发布。

## 5. 关键实现约束

- opencode 配置的 provider/auth 格式以 1.18.25 实际行为为准（实施时用真实 auth.json 样例验证）
- 引导页端口冲突处理（随机端口 + 失败重试）
- 路径含空格/中文兼容（bat 内全部引号包裹；引导页写配置时用相对路径解析）
- zip 解压路径深度：避免超长路径（Windows MAX_PATH），组件目录层级控制
- 便携 Node 版本选择：24.x LTS zip 版（与本地 24.14.1 对齐）

## 6. 验证方案

1. 打包器 dry-run：components.json 全部来源可解析
2. 组装产物自检：build.ps1 输出校验清单（每个组件的文件数/大小/存在性）
3. 引导流程测试：全新目录模拟（清空 data/）→ 引导 → 配置写入验证
4. 启动测试：opencode 能读取整合包内配置并启动（插件加载无报错）
5. 真实发布前：在干净 Windows 虚拟机/另一台机器全流程走一遍
