# Task 4 实施报告：引导服务 guide-server.js + 配置写入 config-writer.js

- 状态：DONE（TDD：RED→GREEN 全流程）
- 执行时间：2026-08-31
- Commit：`7be79bf4d02344f08a687b04c86e44576f1bf196`（short `7be79bf`，feat(qdip): first-run guide server + config writer）
- 产物：
  - `templates/setup/config-writer.js`
  - `templates/setup/config-writer.test.js`
  - `templates/setup/guide-server.js`
  - `templates/setup/guide-server.test.js`
- 全部 JS 文件 UTF-8 无 BOM（字节级验证通过）；node:test 零依赖；仅本地 commit 未 push

## 1. 控制器补充契约验证结论与证据

### 契约 1：根路径无尾反斜杠 + path.join

- 已满足：guide-server.js `const root = path.resolve(process.argv[2] || '.')`，data/setup 目录一律 `path.join(root, ...)` 拼接，无任何手工字符串拼接。
- 与 Task 3 契约衔接：启动.bat 传 `"%ROOTS%"`（去尾反斜杠），guide-server 收到后 `path.resolve` 保持。

### 契约 2：auth.json 实测格式（以实测为准，计划骨架有误）

- 实测对象：`C:\Users\Winde\.local\share\opencode\auth.json`（只读参考，未导出任何 key 值）。
- 实测结构（仅字段名与类型）：

```
top-level providers: github-copilot, zhipuai-coding-plan, kimi-for-coding, deepseek
  github-copilot:    { type: 'oauth', access: ..., refresh: ..., expires: ... }
  zhipuai-coding-plan: { type: 'api', key: ... }      ← 字段名是 key
  kimi-for-coding:   { type: 'api', key: ... }        ← 字段名是 key
  deepseek:          { type: 'api', key: ... }        ← 字段名是 key
```

- **结论**：opencode 1.18.25 的 API 凭证格式是 `{ provider: { type: 'api', key: '<key>' } }`，字段名是 **`key`**，不是计划骨架里的 `apiKey`。实现与测试均按实测格式（`auth.deepseek.key === 'sk-test-123'`）。

### 契约 3：opencode 1.18.25 内置 provider 验证（providers 段写入规则）

- 证据来源：开发机 opencode 1.18.25（`opencode --version` 实测），内置注册表缓存 `C:\Users\Winde\.cache\opencode\models.json`（212 个 provider），结构：`{ id, name, api(baseURL), npm(SDK), env, models{} }`。
- 验证结果：

| provider | 内置? | 证据（注册表条目） | providers 段处理 |
|----------|-------|--------------------|------------------|
| `deepseek` | **是** | id=deepseek，name=DeepSeek，api=https://api.deepseek.com，models 含 deepseek-v4-flash / deepseek-v4-pro | **不写**，auth.json 即生效 |
| `openai` | **是** | id=openai，name=OpenAI，npm=@ai-sdk/openai，models 47 个（gpt-4o 等） | **不写** |
| `kimi` / `moonshot` | **否** | 注册表中 `moonshot`、`kimi` 均 NOT FOUND | **需注册**：`{ npm: '@ai-sdk/openai-compatible', options: { baseURL: 'https://api.moonshot.cn/v1' } }` |
| （参考）`kimi-for-coding` | 是 | 独立产品：api=https://api.kimi.com/coding/v1，npm=@ai-sdk/anthropic——与 Moonshot 开放平台（api.moonshot.cn）不同，二者不可混用 | — |

- **结论**：`config-writer.js` 的 PROVIDERS 表含 `builtin` 标记；`configure()` 只把非内置 provider（kimi）写入 opencode.json providers 段，内置（deepseek/openai）不写。计划里的 `npm: '@ai-sdk/' + name` 写法未采用（该包名方案与实测注册表不符，deepseek 内部实际用 @ai-sdk/openai-compatible 且根本无需注册）。

### 补充验证：testConnection 端点

- 计划用 `GET <baseUrl>/models`。用假 key 实测三个端点可达性：

```
https://api.deepseek.com/models      -> 401 (reachable, auth rejected)
https://api.moonshot.cn/v1/models    -> 401 (reachable, auth rejected)
https://api.openai.com/v1/models     -> 401 (reachable, auth rejected)
```

- **结论**：`/models` 端点对三家均可用，`testConnection` 保持 `GET /models` + Bearer，401/402/其他 HTTP/网络错误映射中文提示；fetch 加 `AbortSignal.timeout(10000)` 防挂起。

## 2. TDD 过程（RED → GREEN）

### config-writer

- RED：`node --test templates/setup/config-writer.test.js` → `Error: Cannot find module './config-writer'`（失败原因符合预期：模块不存在）。
- GREEN：实现后 4/4 通过：
  - auth.json 实测格式（type + key）
  - 内置 provider（deepseek）不注入 providers 段（保持空对象）
  - 非内置 provider（kimi）按 openai-compatible 注册
  - `.configured` 标记写入

### guide-server

- RED：`node --test templates/setup/guide-server.test.js` → 3/3 失败（`guide-url not written in time`，模块缺失子进程立即退出）。
- GREEN：实现后 3/3 通过：
  - `.guide-url` 写入 + GET /api/status 200（ok:true，providers 含 deepseek）
  - POST /api/test 假 key → 200 + `{ ok:false, error:'...' }`（结构断言；实测机器有网，401 快速返回）
  - 路径穿越防御：GET `/setup/../data/.configured` → 非 200（404）

### 最终全量

```
node --test templates/setup/config-writer.test.js templates/setup/guide-server.test.js
tests 7 | pass 7 | fail 0 | duration 758ms
```

## 3. 偏离说明（相对计划原文）

| # | 计划原文 | 实际 | 原因 |
|---|---------|------|------|
| 1 | auth.json 写 `{ type: 'api', apiKey }` | 写 `{ type: 'api', key }` | 实测 opencode 1.18.25 凭证格式字段名为 `key`（契约 2） |
| 2 | providers 段写 `{ npm: '@ai-sdk/' + name, options: { baseURL } }` | 仅非内置 provider 写 `{ npm: '@ai-sdk/openai-compatible', options: { baseURL } }`；内置不写 | 实测 deepseek/openai 内置、moonshot(kimi) 非内置（契约 3） |
| 3 | config-writer 测试断言 `auth.deepseek.apiKey` | 断言 `auth.deepseek.key` | 随偏离 1 |
| 4 | config-writer 测试断言 `cfg.providers.deepseek` 存在 | 断言内置 provider 后 providers 仍为空对象 + 新增 kimi 注册断言 | 随偏离 2（brief 明确"内置则断言 providers 仍为空对象——以验证结论为准"） |
| 5 | guide-server 测试仅测 /api/status | 按 brief Step 5 增测 /api/test 结构断言与路径穿越防御 | brief 要求三条行为 |
| 6 | — | testConnection 增加 10s 超时 | 防网络挂起导致测试/服务卡死 |
| 7 | PROVIDERS.kimi.testModel `moonshot-v1-8k`、baseUrl `https://api.moonshot.cn/v1` | 保持（实测端点可达） | 契约 3 结论下 kimi 需注册，baseUrl 不变 |

- 报告与代码中不含任何真实 API key（仅 `sk-test-123` / `sk-invalid-dummy-key-123` 假值）。
- 测试不依赖外网可用性：/api/test 断言 `{ ok:false, error: string }` 结构，网络错误与 401 均通过（结构断言而非具体错误码）。
