# 你的工作流 vs Matt Pocock 最新思想：差异诊断与修订建议

> 本报告对比你当前的 opencode 工作流（`preferences.md` + 已装 skill 库 + `opencode.json`）与 Matt Pocock 截至 v1.2.3 的最新技能体系，给出"哪些要推翻、哪些要补、哪些保留"的具体建议。
>
> 依据：
> - 你的 `C:\Users\Winde\.config\opencode\preferences.md`（Overseer 偏好档案）
> - 你的 `C:\Users\Winde\.config\opencode\skills\`（24 个已装 skill）
> - 你的 `opencode.json`（禁用了 explore/general/build/plan 内置 agent，启用 superpowers 插件 + OMO）
> - 本仓库 `mattpocock/skills` 的 `CHANGELOG.md`（1.0.0 → 1.2.3 全部变更）+ 全量 `skills/**/SKILL.md`

---

## 0. 结论先行

你的工作流已经比绝大多数人超前——你早早就把 superpowers 和 matt pocock 两套体系做了杂交（"单流水线 + 模糊度升级闸门"）。但对照 Matt 最新思想，有**三个方向性问题**：

1. **默认路径选反了。** 你把 superpowers 的重型流水线（brainstorm → spec → plan → execute → review → finish）当默认，把 Matt 的 grilling 盘问当"升级闸门"。Matt 的最新思想恰恰相反：**盘问对齐 + 最小实现（implement 一行字）是默认，重型规划（wayfinder）才是升级**。
2. **缺了 Matt 最近两年真正的精华。** 你 24 个已装 skill 里，**缺了 `implement`、`to-spec`、`to-tickets`、`ask-matt`、`tdd`(Matt 版)、`diagnosing-bugs`、`improve-codebase-architecture`、`wait-what`、`teach`、`to-questionnaire`** —— 而 `implement → to-spec → to-tickets` 这条链正是 Matt "150K 聪明区 → issue tracker 拆分 → 多 agent 并行"的核心纪律，你完全没有。
3. **"共享语言"没被提到一等公民。** Matt 反复说 `domain-modeling`/`CONTEXT.md` 的"统一语言"是"整仓库最酷的一招"，你的 preferences 里有"文档驱动"但没把"共享词汇压缩 AI 思考"这条隐性主线显式化。

好消息是：你已有的 `grill-me`/`grill-with-docs`/`grilling`、`domain-modeling`、`wayfinder`、`handoff`、`research`、`prototype`、`wizard`、`codebase-design`、`code-review`、`resolving-merge-conflicts`、`triage` 方向全对，只是**编排结构需要重排，而不是推倒重来**。

---

## 1. 现状盘点：你现在的工作流长什么样

### 1.1 编排骨架（preferences.md 的"单流水线 + 模糊度升级闸门"）

```
默认路径(90%):  superpowers 标准流水线
   brainstorming → 写 spec → writing-plans → executing-plans(TDD+频繁提交) → 验证 → requesting-code-review → finishing-a-development-branch

升级路径(10%):  pocock 决策链 (轻度模糊: grill-me/grilling → domain-modeling → ADR → 回默认)
                                    (重度模糊: wayfinder → 决策票地图 → research/prototype/grilling 票 → ADR+handoff)

特殊路径:  systematic-debugging(修bug) / research(查资料) / customize-opencode(配置) / 单一小改动(直接编辑)
```

### 1.2 已装 skill 库（`~/.config/opencode/skills/`，24 个）

| 来源 | skill |
|------|-------|
| matt pocock（17 个） | grill-me, grill-with-docs, grilling, domain-modeling, codebase-design, code-review, wayfinder, handoff, research, prototype, wizard, triage, resolving-merge-conflicts, setup-matt-pocock-skills, writing-for-agents, worktrees, wait-what(见注) |
| superpowers / OMO（7 个） | background-orchestration, codemap, clonedeps, deepwork, simplify, reflect, verification-planning, oh-my-opencode-slim |

> 注：`wait-what` 未在 `~/.config/opencode/skills/` 目录中，但你系统里另有 superpowers 全套（`node_modules/superpowers`）作为默认流水线来源。

### 1.3 关键事实：你缺了 Matt 的哪些 skill

对照本仓库 `skills/**/SKILL.md` 全量清单，**你的库缺失以下 Matt 已发布（promoted）skill**：

| 缺失 skill | Matt 定位 | 为什么重要 |
|-----------|-----------|-----------|
| `implement` | 主流程核心，**极简到一句话**："实现 spec/ticket 描述的活儿"，内部驱动 tdd + 收尾调 code-review | 这是 Matt 整条"想法→交付"链的执行发动机，你缺了它，`grill-with-docs` 对齐完没有顺手的执行出口 |
| `to-spec` | 把对齐好的对话整理成**规格书**，落到 issue tracker | "聪明区 150K"纪律的第一步：大任务先沉淀成 spec |
| `to-tickets` | 把 spec 拆成**追踪子弹式工单**，每条声明阻塞边，可分给多个 agent 并行 | "聪明区"纪律的第二步：跨窗口拆分 |
| `ask-matt` | **路由器**：根据你当前处境路由到正确 skill/流程 | 你自己造了"模糊度闸门"，但缺 Matt 的 phase-boundaries 决策树 |
| `tdd` (Matt 版) | **reference-only** 的红-绿循环，seam 作 leading word，refactor 已移交给 code-review | 你用的是 superpowers 的重型 `test-driven-development`，Matt 最近刻意把它砍薄 |
| `diagnosing-bugs` | 疑难 bug 六阶段纪律（含**脱敏 redact**） | 你用的是 superpowers 的 `systematic-debugging`，两者重叠但 Matt 版更工程化、更贴合"反馈回路"哲学 |
| `improve-codebase-architecture` | 扫描代码库找"深化"机会，出可视化报告 | Matt"代码不便宜"论点的落地扫描器；你只有 `codebase-design`（词汇），没有"找深化机会"的执行器 |
| `teach` | 生成 HTML 课程教你任何东西，上手陌生代码库一绝 | 独立辅助，非核心但高频好用 |
| `to-questionnaire` | 把"你一个人答不了的决策"转成问卷，交给能答的人 | 把盘问"搬到线下" |

（另有 `misc/` 和 `in-progress/` 一批 beta：`setup-pre-commit`、`migrate-to-shoehorn`、`scaffold-exercises`、`git-guardrails-claude-code`、`retro`、`writing-shape`、`writing-beats`、`writing-fragments`、`loop-me`、`claude-handoff`、`setup-ts-deep-modules`、`implement-spec` —— 属可选 beta 频道。）

---

## 2. Matt 思想从"25 个 skill 视频"到 v1.2.3 的演化

你之前看的视频讲的是"25 个 skills"。这之后 Matt 又更新了几轮，方向值得注意：

| 演化方向 | 具体变更 |
|---------|---------|
| **减负** | 删了 6 个 skill（ubiquitous-language → domain-modeling，design-an-interface → codebase-design，qa → triage/to-tickets，request-refactor-plan → to-spec/improve-codebase-architecture，edit-article，obsidian-vault）；`tdd` 砍成 reference-only；`writing-great-skills` 改名并砍掉 GLOSSARY 独立文件 |
| **统一语言下沉** | `ubiquitous-language` 被 `domain-modeling` 吸收，明确"维护整个领域模型而非只倒一份术语表" |
| **issue-tracker 中心** | `to-prd`→`to-spec`、`to-plan`+`to-issues`→`to-tickets`，spec 和工单全部落到 issue tracker，用原生 blocking 边表达依赖 |
| **路由精化** | `ask-matt` 加了 **phase boundaries 决策树**（continue → clear → handoff → subagent → compact 五选项有序决策），明确 `/compact` 是默认而非 `/handoff`，`/handoff` 只用于"需要可移植性"的场合 |
| **grilling 提速** | 从"一次一问"改成**一轮问完整个 frontier**（13 个问题 3 轮问完），facts 派给后台 sub-agent 查、decisions 留给用户答 |
| **smart zone 修正** | 聪明区从 ~120K 上调到 ~150K token |
| **YAGNI 收窄** | `improve-codebase-architecture` 加 YAGNI 过滤——只扫"正在被改动的路径"（读最近 commit），不整理没人碰的死角 |
| **新技能** | `wait-what`（一行字的治啰嗦技能）、`wizard`（模型可调用的交互向导）、`to-questionnaire`（线下问卷） |
| **原型保存** | `prototype` 不再"用完即删"，而是存到 throwaway 分支 `prototype/<name>`，主分支只留已验证的决策 |

**一句话总结演化**：Matt 在持续做**减法 + 收窄 + 下沉**——把重复技能合并、把流程技能砍薄、把"词汇/接口/模块"这类共享原语下沉成被反复调用的 reference skill，同时把"拆分到 issue tracker + 多窗口"这条纪律越做越实。

---

## 3. 核心差异：逐条对比

### 差异 1（最根本）：默认路径的哲学相反

- **你**：默认走 superpowers 六阶段重型流水线（brainstorm → spec → plan → execute → review → finish），把盘问放"升级闸门"。
- **Matt**：默认是 `grill-with-docs`（盘问对齐，顺手建术语表 + ADR）→ `implement`（一行字）→（大任务才 `to-spec → to-tickets`）。**对齐是入口，不是升级**。
- **冲突点**：superpowers 的 `brainstorming` 是"协作式头脑风暴"，Matt 的 `grilling` 是"对抗式盘问 + 设计树 + frontier 轮次"。前者鼓励发散，后者逼你把"设计概念"这一不可言说的东西说清楚。Matt 明确说过：默认的 plan mode 太急于产出一份"资产"（计划文件），而先对齐设计概念更重要。

### 差异 2：缺"聪明区 → issue tracker 拆分"这条纪律

- **你**：有 `wayfinder`（超大规划）+ `handoff`（跨会话交接），但没有 `to-spec`/`to-tickets`。
- **Matt**：大任务的默认拆分是 **spec 落到 issue tracker → 拆成带阻塞边的工单 → 分给多个 agent 各自一个窗口**。wayfinder 只用于"连规划本身都装不进一个会话"的巨型工程。
- **后果**：你遇到"超过一个会话"的任务，会本能地走 `handoff`（压成文档交给下一个 agent）或 `wayfinder`（重），而 Matt 会先走 `to-spec → to-tickets` 这条更轻的中间档。

### 差异 3：共享语言（统一语言）没被显式抬到一等公民

- **你**：preferences 里有"文档驱动开发（Readme/Changelog/Docs\）"，也装了 `domain-modeling`，但没把"共享词汇"这条**隐性主线**写进编排。
- **Matt**：`grill-with-docs` 建术语表 → `domain-modeling` 维护 `CONTEXT.md` → `wait-what` 用这套词汇重讲 → 规划/PRD 里点名改哪些模块。词汇对齐后，AI 思考更简洁、命名更一致、实现更贴合规划。他称之为"整仓库最酷的一招"。
- **差距**：你的"文档驱动"是**产出文档**（给人和 AI 看的资产），Matt 的"统一语言"是**压缩通信带宽**（让 AI 少用 token、少啰嗦）。两者目的不同，你缺的是后者这一层。

### 差异 4：TDD 的版本与定位

- **你**：用 superpowers 的 `test-driven-development`（重型的红-绿-重构 + 大量步骤）。
- **Matt**：`tdd` 最近被砍成 **reference-only**——红→绿（重构交给 code-review），seam 作 leading word（只在预先商定的接缝处测试）。理由：红绿循环是模型已有的前置知识，重述是浪费；真正难的是"测试该写在哪"。
- **差距**：Matt 的 TDD 是"反馈速度=限速、逼模型小步走"这个原则的**最小载体**，你的版本是完整方法论。不是错，但偏重、且和 Matt 的"深模块 + 接缝"设计语言脱节。

### 差异 5：router 是 homebrew 的，缺 phase-boundaries 决策树

- **你**：自己造了"模糊度闸门"（5 个升级信号）。
- **Matt**：`ask-matt` 是正式 router，且带 **phase boundaries 决策树**——会话边界处按顺序问 continue / clear / handoff / subagent / compact，其中 `/compact` 是默认（而非 `/handoff`，后者只用于"要搬家到新 harness/目录/同事"的场合）。
- **差距**：你的闸门解决"任务入口去哪"，但没解决"会话到边界了怎么办"这个更日常的问题。

### 差异 6：invocation 哲学（上下文负载）

- **你**：superpowers 一堆技能是**自动触发**（如 brainstorming 说 "MUST use before any creative work"）。
- **Matt**：绝大多数技能 **user-invoked**（模型平时不知道它们存在），因此"上下文负载极低"；只有 `grilling`/`domain-modeling`/`codebase-design`/`tdd`/`research`/`prototype`/`wizard`/`writing-for-agents` 等少数是 model-invoked。
- **差距**：你同时挂着 superpowers（自动触发为主）+ matt pocock（手动触发为主）两套，上下文里塞满了自动触发的指令，这正是 Matt 说的"和装一堆自动触发技能的路子反着来"要避免的。

---

## 4. 修订建议（分级，按优先级）

### A. 立即补装（缺的核心技能，补上才有 Matt 的主流程）

| 补装 | 理由 |
|------|------|
| `implement` | 执行发动机，一行字。你的 `grill-with-docs` 对齐完，缺这个"最小实现"出口 |
| `to-spec` + `to-tickets` | "聪明区拆分"纪律，大任务默认走这条而非 `handoff` |
| `ask-matt` | 用 Matt 的 phase-boundaries 决策树补全你的"模糊度闸门" |
| `tdd`（Matt 版） | 替换/简化 superpowers 的重型 TDD |
| `improve-codebase-architecture` | "代码不便宜"的落地扫描器，配合你已有的 `codebase-design` |
| `wait-what` | 治啰嗦，一行字，复用 `CONTEXT.md` 词汇 |
| `teach`、`to-questionnaire`、`diagnosing-bugs` | 高频好用的独立辅助（`diagnosing-bugs` 可替代 `systematic-debugging`） |

> 安装路径：你在用 OMO + superpowers 插件。Matt 的技能建议通过 `npx skills@latest add mattpocock/skills` 挑装到你的 `~/.config/opencode/skills/`，**务必勾上 `setup-matt-pocock-skills`**（它负责把 issue tracker、triage 标签、领域文档布局写进 repo 配置）。

### B. 重排默认路径（推翻 superpowers 默认，换成 Matt 主流程）

建议把 preferences.md 的编排从：

```
默认: superpowers 六阶段流水线
升级: pocock 决策链
```

改成：

```
默认(小任务/单窗口):  grill-with-docs(盘问对齐+术语表+ADR) → implement(→tdd→code-review)
默认(大任务/跨窗口):  grill-with-docs → to-spec → to-tickets → (每张工单) implement → tdd → code-review
升级(超大/找路):       wayfinder → (prototype/research/grilling 决策票) → 闭环 → to-spec → ...
特殊:  systematic-debugging / diagnosing-bugs(修bug) / research(查资料) / customize-opencode(配置) / 单一小改动(直接编辑)
```

关键变化：**`brainstorming` 从"默认前置"降为"纯创意探索时可选"；`grill-with-docs` 从"升级"提为"默认对齐"**。你的"先厘清后落笔"精神不变，只是把厘清的工具从 brainstorming 换成 grilling。

### C. 把"共享语言"显式化（抬到一等公民）

在 preferences.md 里补一条明确纪律：

- 每个项目开工前，用 `grill-with-docs`（或 `domain-modeling`）建立/维护 `CONTEXT.md` 术语表 + ADR。
- 规划、评审、写 spec 时，**必须使用 `CONTEXT.md` 里的词汇**，禁止同义反复。
- 把"文档驱动"重新定义为"**共享词汇驱动**"：文档的价值首先是压缩 AI 的通信带宽，其次才是留档。

### D. 收敛上下文负载（invocation 审计）

- 审计你挂载的 superpowers 技能，把"MUST 自动触发"改成"按需调用"，与 Matt 的"低上下文负载"对齐。
- 明确区分 user-invoked（编排，只有你打字才触发）vs model-invoked（可复用的纪律，任务匹配时才触发）。
- `brainstorming`、`writing-plans`、`executing-plans`、`finishing-a-development-branch`、`requesting-code-review`、`receiving-code-review`、`subagent-driven-development`、`dispatching-parallel-agents` 这些 superpowers 流程技能，与 Matt 的 `implement`/`to-spec`/`to-tickets`/`code-review` **高度重叠**，建议二选一（详见 E）。

### E. 明确"推翻 vs 保留"清单

| 你的现状 | 判断 | 建议 |
|---------|------|------|
| superpowers `brainstorming` 默认 | **推翻（降级）** | 改为纯创意探索时可选；默认对齐用 grilling |
| superpowers `writing-plans`/`executing-plans`/`finishing-a-development-branch` | **推翻（替换）** | 用 `to-spec`/`to-tickets`/`implement` 替代 |
| superpowers `test-driven-development` | **推翻（替换）** | 用 Matt `tdd`（reference-only）替代 |
| superpowers `systematic-debugging` | **可替换** | 用 `diagnosing-bugs` 替代（含脱敏、更贴反馈回路哲学） |
| superpowers `requesting-code-review`/`receiving-code-review` | **推翻（替换）** | 用 Matt `code-review`（双轴：规范轴+spec 轴）替代 |
| `grill-me`/`grill-with-docs`/`grilling`/`domain-modeling`/`wayfinder`/`handoff`/`research`/`prototype`/`wizard`/`triage`/`codebase-design`/`code-review`/`resolving-merge-conflicts` | **保留** | 方向全对 |
| Vault-Tec 人格 / S.P.E.C.I.A.L. 评级 | **保留** | 无碍工程，且你已约束"不因人格损害准确性" |
| 子代理委派（@fixer/@explorer/@designer/@oracle/@librarian/@observer） | **保留** | 与 Matt 的 subagent 思想一致（facts 派后台、decisions 留用户） |
| 文档驱动（Docs\ / Readme / Changelog） | **保留但重定义** | 见 C，升级为"共享词汇驱动" |
| `simplify`/`reflect`/`verification-planning`/`verification-before-completion`/`deepwork`/`background-orchestration`/`worktrees` | **保留** | 与 Matt 互补，不冲突 |

### F. 一条可直接抄进 preferences.md 的"新闸门"

```
任务入口:
  - 一句话说得清、单窗口能装下 → grill-with-docs → implement（默认）
  - 超过一个窗口 / 预计 >150K token → grill-with-docs → to-spec → to-tickets → 多 agent 并行 implement
  - 连"要造什么/规划本身"都装不下 → wayfinder → 决策票 → to-spec
  - 修 bug → diagnosing-bugs
  - 查资料 → research
  - 改 opencode 自身配置 → customize-opencode
  - 单一小改动 → 直接编辑 + 验证

会话边界(phase boundary), 按序问:
  1. continue? (会话仍是第一手来源, 不压缩)
  2. clear? (干净重启)
  3. handoff? (要搬家到新 harness/目录/同事时才用)
  4. subagent? (范围紧到能 AFK 跑)
  5. compact? (最后手段, 默认)
```

---

## 5. 一句话总结

你的工作流**架构意识是对的**（早就懂了"流程闸门 + 子代理 + 文档先行"），但**默认路径选反了、核心技能缺了、共享语言没显式化**。修订不是推倒重来，而是三件事：**把 grilling 对齐提为默认、把 `implement → to-spec → to-tickets` 这条链补上、把"统一语言/CONTEXT.md"抬成日常纪律**。做到这三点，你的工作流就会从"superpowers 与 matt 的拼贴"变成"以 Matt 思想为骨架、以你的偏好为血肉"的连贯体系。

---

## 附：依据文件清单

- `C:\Users\Winde\.config\opencode\preferences.md`（编排骨架）
- `C:\Users\Winde\.config\opencode\opencode.json`（插件/agent/MCP 配置）
- `C:\Users\Winde\.config\opencode\skills\`（24 个已装 skill）
- 本仓库 `CHANGELOG.md`（1.0.0 → 1.2.3）、`README.md`（Why These Skills Exist）、`CONTEXT.md`（领域术语）
- 本仓库 `skills/**/SKILL.md`（全量技能，含 misc/ 与 in-progress/）
- 蒸馏报告 `docs/matt-pocock-workflow-report.md` + 逐字稿 `docs/transcripts/`
