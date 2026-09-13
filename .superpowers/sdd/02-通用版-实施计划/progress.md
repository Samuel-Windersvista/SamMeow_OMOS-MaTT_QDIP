# SDD ledger — plan: docs/02-通用版-实施计划.md

## Pre-flight scan (2026-08-31)
| Task pair | Interface | Finding |
|---|---|---|
| T1 components.json -> T6 build.ps1 | components[] 结构 | 一致（name/source/type/target/version/required 六字段两端对齐） |
| T2 templates -> T3 启动.bat | 配置模板路径 | 启动器只引用 runtime/opencode/bin 与 data/，不直接依赖 T2 文件——无冲突 |
| T2 templates -> T4 config-writer.test.js | 测试复制 ..\opencode.json | __dirname=templates/setup -> templates/opencode.json，T2 产物，顺序正确 |
| T3 启动.bat <-> T4 guide-server | data/.guide-url, data/.configured | 两端约定一致（T3 等待轮询 .guide-url，T4 启动时写入） |
| T4 config-writer <-> T5 first-run.html | configure/testConnection 签名 | 端点路径与请求体字段一致（providers/apiKey） |
| T6 build.ps1 <-> T9 玩家指南 | 模板部署段追加复制 | T9 修改 T6 产物——顺序依赖已保证（T9 在后） |
| T4 guide-server <-> T5 静态路径 | setup/ 目录服务 | 页面仅引 basename 文件，防路径穿越已处理 |
| T1 check-sources.ps1 <-> T6 build.ps1 |  参数 | 两端参数名一致 |

| Task | Self-consistency | Finding |
|---|---|---|
| T3 | bat 检测 node/opencode 的路径与 T6 组装路径 | 一致（runtime\node\node.exe、opencode\bin） |
| T6 | Step 2 opencode 离线包布局标注"以实际为准" | 环境适配点，打包器双形态检测兜底——非缺陷 |
| T4 | node:test 零依赖 vs 全局约束 | 一致（内置 node 24 支持 node:test + fetch） |
| T5 | 页面 fetch 端点与 T4 路由 | 一致 |

扫描结论：无计划级冲突，可开始执行。

Task 1: complete (commits 6bf7dac..1143dc6, review clean)
Task 1: minor (deferred): check-sources.ps1 相对路径源依赖调用者 CWD（brief 原文照抄）——Task 6 build.ps1 必须从仓库根调用该脚本，派发时携带此提示
Pre-Task-2 Ruling: 通用版 opencode.json 不含 instructions 引用——preferences.md（Vault-Tec 人格/个人项目路径）是个人偏好档案，不带入玩家版；append 工作流契约（superpowers-bridge）保留。代价若错：玩家环境少一层人格定制，不影响功能。
Pre-Task-3 Ruling: 启动.bat 增加 set "XDG_CONFIG_HOME=%ROOT%opencode\config"——绿色版必须隔离玩家系统配置目录，否则整合包内 opencode.json 不被读取。代价若错：opencode 在 Windows 若忽略该变量则配置不生效，Task 6/8 冒烟测试会发现并回修。
Task 2: complete (commits 1143dc6..c054ecf, review clean)
Task 2: minor (deferred): disabled_agents 剔除——若未来源配置启用需手工同步模板（维护性备注）
Task 3: complete (commits c054ecf..1dd66ab, review clean)
Task 3: minor (deferred): ROOTS 在盘符根目录退化——Task 6/8 文档注明"勿解压至盘符根目录"
Task 3: minor (deferred): review diff 生成编码伪影——后续 review package 改用 cmd /c 重定向生成
Task 4 contract: guide-server.js 收到去尾反斜杠根路径；拼接必须用 path.join（计划代码已天然满足）；auth.json 格式以开发机真实样例实测为准；providers 段写入需先验证 opencode 1.18.25 内置 provider 列表
Task 4: complete (commits 1dd66ab..7be79bf, review clean)
Task 4: minor (deferred): basename 分支未被测试直接触发（URL 归一化先拦截）——安全但测试覆盖不精确
Task 4: minor (deferred): configure() 全量重建 auth.json——Task 5 必须单次提交所有 provider（契约）
Task 4: minor (deferred): 请求体无大小上限——本地向导可忽略
Task 4 findings (contracts for later tasks): auth.json 凭证字段为 key；deepseek/openai 内置、moonshot 需 openai-compatible 注册；kimi-for-coding（api.kimi.com）是独立产品勿混用
Task 5: complete (commits 7be79bf..f4207fe, review clean; 前任 des-1 卡死取消，des-2 验收收尾零修正)
Task 5: minor (deferred): api() 不检查 res.ok（服务端 catch-all 恒返回 JSON，无实际风险）
Task 5: minor (deferred): 保存成功后卡片未冻结交互（可选打磨）
Task 5: minor (deferred): state 防呆超出骨架但方向正确（已声明）
Task 6 carry: 打包后人工开一次引导页确认渲染（截图级验证）；启动.bat 分发必须 CRLF（建议 .gitattributes 声明 eol=crlf）
Task 6: complete (commits f4207fe..da2ec23, review clean; zip 95.7MiB 生成)
Task 6: minor (deferred): check-sources 退出码检查位于复制之后，guard 对缺组件场景近乎不可达（Copy-Item Stop 先抛）
Task 6: minor (deferred): 报告 12900 系字符数非字节数（口径问题）
Task 6: minor (deferred): build.ps1 未消费 required 字段
Task 6 finding: opencode 真实二进制 179MB 在平台包，tgz bin 为 479B stub（postinstall 拉取）
Task 7 carry: 创建 更新组件.bat 后重跑 build.ps1 使组件进包（Task 6 已条件化预留）
Task 7: complete (commits da2ec23..8bc1e6b, controller-adjudicated — 审查 ora-1 卡死 38 分钟被取消；依据实现者实证报告采纳)
Ruling: Task 7 审查改由 controller 裁决 — 用户要求提速，审查价值低于等待成本 — 代价若错：编码偏离未被第三方复核（实现者已有 3 次复现实证，风险低）
Ruling: 启动.bat 编码风险真实需修复 — Task 7 实证（3 次复现 UTF-8+chcp 解析错位）+ Task 3 审查未触达中文 echo 路径 — 修复：转 GBK/ANSI 去 chcp — 代价若错：GBK 与 git text 属性交互需验证（已列入修复任务）
Ruling: 剩余工作合并 — 启动.bat 修复 + Task 8 + Task 9 一次派发，终审一次覆盖 — 代价若错：跨任务问题发现更晚，但均为文档/小修复，回滚成本低
Task 8-10: complete (commits 8bc1e6b..8bebf9e, 三子任务 A/B/C; controller 合并派发，E2E 假 key 全链路)
Final review (ora-2): 需修复 — C1 auth.json 路径差一层 opencode 段（XDG_DATA_HOME 下 opencode 追加 opencode\auth.json）；C2 opencode.json 部署位置差一层（XDG_CONFIG_HOME 下追加 opencode\）；I1 更新组件.bat npm --prefix 落地错误 + superpowers 更新 no-op；I2 build.ps1 未生成 config/local 占位；Minor superpowers .github 夹带
Ruling: 终审验证方法（auth list + loading path 日志 + sentinel）作为修复回归测试 — 全部非交互
Fix wave: complete (commits 8bebf9e..6fca72f, F1 auth 层级 / F2 配置层级+plugin 基准 / F3 更新落地 / F4 local 占位 / F5 github 夹带)
Re-review (ora-2): 可发布 — C1/C2/I1/I2/Minor 全部 ADDRESSED 独立复验；无新 Critical/Important
Re-review minors (residual, surface to owner): 玩家指南/验证清单 FAQ 路径差一层（opencode/config → opencode/config/opencode）；玩家指南引用不存在的 安装到系统.bat
⚠️ 发布前 checklist 第一行: 干净 Windows 虚拟机全流程（spec 验证方案 5）——两轮 Critical 均因缺席而生
