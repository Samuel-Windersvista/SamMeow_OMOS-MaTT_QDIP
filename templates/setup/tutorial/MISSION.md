# Mission: 独立驾驭我的 OpenCode 体系

适用版本：QDIP 0.6.0（环境快照 2026-09-30）

## Why
我是内容创作者（SamMeow / Samuel是不是好奇猫），非程序员出身，靠一套自组装的 OpenCode 体系（opencode + OMOslim + Matt 工程 skills + MCP）做 SPT mod、视频材料和各类小工具。2026-09-11 体系重构为 matt-bridge 预设后，我要从"AI 帮我做"升级为"我知道每一步在干什么、能独立指挥整条流水线"——让这套体系成为我自主操控的生产工具，而不是一个我不了解内部的黑盒。

## Success looks like
- 任何任务到手，能立刻判定入口（单窗口 / 多窗口 / 超大规划 / 修 bug / 查资料 / 配置 / 小改动），并预判接下来的流程和自己的职责
- 能主动管理上下文：知道何时 continue / clear / handoff / subagent / compact，不再一条会话跑到黑
- 能看懂并主动指挥委派：清楚 @explorer / @librarian / @oracle / @fixer / @designer / @observer 的分工，会发起和回收后台任务
- 能独立跑完一轮完整主流程：grill → spec → tickets → implement → code-review，且知道每个阶段产出什么
- 体系出问题时能自己定位：知道配置在哪、日志在哪、常见坑是什么

## Constraints
- 非程序员；术语必须翻译成日常语言，先建立直觉再补细节
- 碎片化学习时间；每课要短、要能立刻用上
- 简体中文教学；无 emoji
- 当前水平：流程在用但认知零散（自述）；已点名盲区：任务入口判定、上下文管理、委派策略
- 教学档案位置：`我的OCvibecoding环境视频/教学/`（本目录即工作区根）

## Out of scope
- 编程语言本身的教学（C#、TypeScript 语法等）
- opencode / 插件 / OMOslim 的源码级开发
- SPT mod 领域知识（由 SamMeow-modding-superpowers 知识库承载）
- 从零部署环境（已有 QDIP 一键包，属另一主题）
