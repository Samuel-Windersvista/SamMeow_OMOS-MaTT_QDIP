# v0.2.1 报告：模型分配区域"跟随默认"依赖提示

> 执行人：designer | 日期：2026-09-01 | commit：7b74973 | 基线：6557b68

## 修改内容（11 行新增，零逻辑改动）

- CSS：新增 `.dep-notice` 警示块样式（复用 `--warn` 警示色描边 + `[!!]` 加粗前缀，与现有 `.notice` / `.msg.err` 同一视觉语言，无新字体/CDN）
- HTML：Section C 内、说明文与快捷按钮行之间插入提示块：

  > [!!] 选择"跟随默认"会使用预设模型组合（DeepSeek v4 与 Kimi K3 等），需要对应的 API 才能生效。如果你只配置了一个服务商，请使用下面的"全部用 X"快捷按钮，避免部分角色无法工作。

- 位置决策：放在快捷按钮正上方——玩家读到"请使用下面的按钮"时，按钮恰好在视线下一步落点；且紧贴"跟随默认"选项所在的下拉区域上方，语义邻近。

## 无头验证输出（node 静态检查，未起服务，未用浏览器）

```
PASS  BOM-free
PASS  HTML structure complete
PASS  no external URL
PASS  dep-notice CSS defined
PASS  [!!] prefix style present
PASS  warn color reused
PASS  notice inside Section C
PASS  notice between sub and quick-row
PASS  copy mentions preset models
PASS  copy mentions quick button
PASS  copy mentions API dependency
PASS  logic intact: agentModels
PASS  logic intact: persona gate
PASS  logic intact: single POST call-site
---
ALL-CLEAR: 14/14 checks passed (exit=0)
```

验证脚本断言修正记录：首轮 "single POST" 断言阈值写错（>=2），页面实际为单个 /api/configure 调用点（正确语义），修正为 ===1 后全过。

## 提交

- commit：`7b74973` — `fix(qdip): model assignment default dependency notice`（1 file changed, 11 insertions）
- 仅本地提交，未 push；工作树干净
