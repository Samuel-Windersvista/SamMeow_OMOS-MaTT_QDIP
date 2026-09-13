# Task 5 报告：引导页 first-run.html 验收与收尾（Task 5B）

> 执行人：designer（Task 5B 继任） | 日期：2026-08-31 | commit：f4207fe

## 1. 验收清单（对照 task-5b-brief.md 原需求逐项）

| # | 检查项 | 结果 | 证据 |
|---|--------|------|------|
| 1.1 | init() 拉 /api/status 渲染服务商卡片（deepseek/kimi/openai） | 通过 | first-run.html L411-431；验证 A1/A2 |
| 1.2 | 勾选启用/禁用 key 输入与测试按钮 | 通过 | L346-360（checkbox change 联动 disabled + 卡片 enabled 态） |
| 1.3 | 测试按钮 POST /api/test，中文错误（401=key 不对、网络错误） | 通过 | L372-406 + friendlyError L283-290；验证 A4/A5 实测返回"API key 无效（401）"并命中翻译正则 |
| 1.4 | 保存按钮一次性 POST /api/configure（单次提交所有 provider） | 通过 | L433-467，state 收集全部测试通过的 key，单次 POST；验证 B5 双 provider 一次提交成功 |
| 1.5 | 成功提示"关闭本页重新双击启动器" | 通过 | L256-259 done-panel；验证 B2 关键词命中 |
| 2.1 | 端点路径精确（/api/status、/api/test、/api/configure） | 通过 | 与 guide-server.js L16/21/30 逐字一致 |
| 2.2 | 请求体 {provider, apiKey} / {providers:{...}} 与服务端一致 | 通过 | 页面 L387/L449 vs guide-server.js L24/L33；configure 下游 auth.json 格式验证 B6 |
| 3 | 离线：无任何外部 URL（CDN/字体/图片） | 通过 | 验证 B3 全文无 https?://；字体用 Consolas 系统字体栈 |
| 4 | 视觉：暗色终端风格成立 | 通过 | 终端窗口头 + 磷光绿配色；焦点态（:focus/:focus-visible 光晕）、禁用态（opacity 0.35 + not-allowed）、560px 窄屏媒体查询（纵向堆叠 + 全宽保存键）、错误/成功/busy 三态消息分级配色（[!!]/[OK]/[..] 前缀） |
| 5 | 编码：UTF-8 无 BOM；HTML 结构完整 | 通过 | 验证 C1（首三字节非 EF BB BF）、C2（doctype/head/body/html 闭合）、B4（charset 声明） |
| 附加 | 页面 JS 无引用错误（变量、函数、DOM id） | 通过 | 通读 script 段：cards/submit/result/notice/done 五个 id 均存在；api/friendlyError/refreshSubmit/buildCard/init 均先定义后使用 |

## 2. 修正内容

**无。** 页面与 Task 4 已审查服务端精确一致，未做任何修改即通过全部验收项。

## 3. 静态验证输出（node fetch 无头，未使用浏览器自动化）

验证方法偏差说明：brief 要求"用项目根做验证"，但项目根无 `setup/` 目录（guide-server 从 `<root>/setup/` 提供静态文件，部署后才有该结构）。故分两段：
- Phase A（项目根）：/api/status + /api/test 假 key——按 brief 执行，验证后已删除 data/.guide-url 等残留（git status 确认干净）
- Phase B（部署镜像临时根 D:\Temp\opencode\qdip5b-*）：页面 fetch + /api/configure 成功路径，验证后临时根整体删除

```
   [i] /api/test 实际错误文案: API key 无效（401）
PASS  A1 GET /api/status -> 200
PASS  A2 providers 含 deepseek/kimi/openai
PASS  A3 configured === false（项目根无残留标记）
PASS  A4 POST /api/test 假key -> ok:false
PASS  A5 错误为字符串且命中页面中文翻译正则(401|402|网络错误)
PASS  B1 页面 URL -> 200
PASS  B2 页面包含关键词 "QDIP 首次配置" "/api/status" "/api/test" "/api/configure" "保存配置" "测试连接" "关闭本页面，重新双击启动器"（7/7）
PASS  B3 页面无外部 URL（离线）
PASS  B4 charset=utf-8 声明
PASS  B5 POST /api/configure 单次多provider -> ok:true
PASS  B6 auth.json 格式 {type:"api",key} 且两provider齐全
PASS  B7 非内置 kimi 已注册 / 内置 deepseek 不注册
PASS  B8 data/.configured 已生成
PASS  C1 UTF-8 无 BOM
PASS  C2 HTML 结构完整（doctype/html/head/body 闭合）
---
ALL-CLEAR: 21/21 checks passed
```

## 4. 提交

- commit：`f4207fe` — `feat(qdip): first-run guide page`（1 file changed, 472 insertions）
- 仅本地提交，未 push；工作区干净（git status 无残留）

## 5. 备注

- 页面额外实现了骨架之外的防呆：key 改动后作废已通过的测试结果（L363-370），避免保存未验证的 key——符合"保存的 key 必须测试通过"的契约精神。
- 未改动 guide-server.js / config-writer.js（Task 4 已审查产物）。
