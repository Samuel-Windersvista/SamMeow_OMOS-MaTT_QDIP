# Task 4 Brief: 引导服务 guide-server.js + 配置写入 config-writer.js

> 来源：docs/02-通用版-实施计划.md Task 4（你的需求，含控制器补充契约）

## Files:
- Create: `templates/setup/config-writer.js`
- Create: `templates/setup/config-writer.test.js`
- Create: `templates/setup/guide-server.js`
- Create: `templates/setup/guide-server.test.js`

## 控制器补充契约（优先于计划原文）

1. **根路径无尾反斜杠**：启动.bat（Task 3 产物，已合入）传给 guide-server.js 的根路径是去尾反斜杠形态（如 `E:\...\QDIP`）。所有路径拼接**必须用 `path.join`**（`path.join(root, 'data')`），禁止手工字符串拼接 `root + '\data'`。
2. **auth.json 格式实测优先**：开发机有真实样例 `C:\Users\Winde\.local\share\opencode\auth.json`（只读参考格式，**不要把任何真实 key 写进你的报告或代码**）。计划代码中 `{ provider: { type: 'api', apiKey } }` 是骨架，若实测格式不同，以实测为准并在报告中声明。
3. **providers 段写入需先验证**：先确认 opencode 1.18.25 的内置 provider 列表（开发机已装 opencode 1.18.25，可运行 `opencode` 命令或查其 SDK/文档；deepseek 与 kimi/moonshot 是否内置）。规则：
   - 内置的 provider：opencode.json 的 providers 段**不需要写**，auth.json 即可生效
   - 非内置的：用 openai-compatible 方式注册（`{ npm: "@ai-sdk/openai-compatible", options: { baseURL } }` 或 opencode 1.18.25 实际支持的方式，以实测为准）
   - config-writer 的实现要基于这个验证结果，不要照抄计划里的 `npm: '@ai-sdk/' + name`（该写法可疑，需实证）

## Step 1: 写 config-writer 的失败测试

`templates/setup/config-writer.test.js`（node:test 零依赖）。测试三条行为：
1. `configure({ root, providers: { deepseek: { apiKey: 'sk-test-123' } } })` 后，`<root>/opencode/auth/auth.json` 存在且 `auth.deepseek.apiKey === 'sk-test-123'`（type 字段断言以实测格式为准）
2. `<root>/opencode/config/opencode.json` 的 providers 段符合第 3 条验证结果（内置则断言"未新增未知结构"或断言 providers 仍为空对象——以验证结论为准）
3. `<root>/data/.configured` 标记文件存在

测试的 makeRoot 需要复制 `templates/opencode.json` 与 `templates/oh-my-opencode-slim.json`（Task 2 产物）到 mock 根，用相对路径 `path.join(__dirname, '..', 'opencode.json')`。

## Step 2: 跑测试确认失败

Run: `node --test templates/setup/config-writer.test.js`
Expected: FAIL（模块不存在）

## Step 3: 实现 config-writer.js

计划骨架（`docs/02-通用版-实施计划.md` Task 4 Step 3 的代码），但按上述补充契约 2/3 修正 auth.json 与 providers 写法。保留 PROVIDERS 元数据表（deepseek/kimi/openai 三个服务商，testModel 与 baseUrl 用实测可用的值；kimi 的 baseUrl `https://api.moonshot.cn/v1` 若服务商改名请以实际情况为准）。导出 `configure`、`testConnection`、`PROVIDERS`。

testConnection 逻辑：调用 `<baseUrl>/models`（GET，Authorization: Bearer）——若实测该端点不可用，改用最小 completion 请求（如 `/chat/completions` 带 max_tokens=1），以实测为准并在报告说明。

## Step 4: 跑测试确认通过

Run: `node --test templates/setup/config-writer.test.js`
Expected: PASS（3 tests）

## Step 5: 写 guide-server 的失败测试

`templates/setup/guide-server.test.js`：spawn 子进程 `node guide-server.js <root>`，轮询等待 `<root>/data/.guide-url` 出现（8 秒超时），然后：
1. GET `/api/status` → 200，body.ok === true，body.providers 含 deepseek
2. POST `/api/test`（假 key）→ 200，返回 `{ ok: false, error: ... }`（网络错误或 401，取决于网络——断言结构而非具体错误码）
3. 静态路径穿越防御：GET `/setup/../data/.configured` 之类不应泄露文件（断言 404 或非 200）

## Step 6: 实现 guide-server.js

计划骨架（Task 4 Step 6 的代码），注意：
- 根路径来自 `process.argv[2]`（无尾反斜杠），`path.resolve` 后保持；`path.join(root, 'data')` 拼接
- 静态文件服务仅允许 setup 目录内文件（`path.basename` 防御保留）
- `.guide-url` 内容格式：`http://127.0.0.1:<port>/setup/first-run.html`
- 端口 0 自动分配，服务启动后写 `.guide-url`（Task 3 的 bat 靠这个文件出现来判断服务就绪）

## Step 7: 跑测试确认通过

Run: `node --test templates/setup/guide-server.test.js`
Expected: PASS

## Step 8: 提交

```bash
git add templates/setup/config-writer.js templates/setup/config-writer.test.js templates/setup/guide-server.js templates/setup/guide-server.test.js
git commit -m "feat(qdip): first-run guide server + config writer"
```

## 全局约束
- JS 文件 UTF-8 无 BOM；node:test 零依赖（不引入 npm 包）
- 测试不得访问外网（testConnection 的网络调用只做结构断言，或 mock）
- 报告里不得包含任何真实 API key
- 只本地 commit，不 push
