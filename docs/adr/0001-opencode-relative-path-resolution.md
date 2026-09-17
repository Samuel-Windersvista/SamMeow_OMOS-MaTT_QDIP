# opencode 相对路径的两套解析基准

`opencode.json` 里两个字段的相对路径按**不同基准**解析，这个差异不在任何文档里，且其中一条会静默失效。核查 `anomalyco/opencode` tag `v1.18.30` 源码得到确认：

- **`plugin` 段** → 按**声明该路径的 JSON 文件所在目录**解析。见 `src/config/plugin.ts` → `resolvePluginSpec`：`const base = path.dirname(configFilepath)`。所以产物里 `opencode/config/opencode/opencode.json` 的 `../../../plugins/…` 正确落在包根。
- **`instructions` 段** → 按 **`process.cwd()`** 解析并向上 `globUp` 到 worktree 根。见 `src/session/instruction.ts` → `systemPaths`：非绝对路径走 `relative()` 分支。**绝对路径与 `~/` 前缀**走 `path.isAbsolute` 分支，绕过 `globUp`。

决定：**`instructions` 的条目一律不使用裸相对路径**。整合包用启动器注入的环境变量表达它——`{env:QDIP_PERSONA}`，由 `{env:X}` 替换机制在配置加载时（`src/config/variable.ts` → `substitute`，早于 JSON 解析）展开为绝对路径。这样既脱离 CWD，又因为每次启动由 `%~dp0` 重新推导而**耐搬运**（整合包被移动到别的路径后仍然有效）。

被否决的替代方案：**`{file:...}`**。它的确会作用于 `instructions` 条目，但 `substitute()` 里 `out += JSON.stringify(fileContent).slice(1, -1)` 说明它替换进去的是**文件内容**而非路径——展开后的正文会被 `systemPaths()` 当成路径去 globUp，必然落空。`{file:...}` 的用途是把文件内容嵌进配置值（如 API key）。**不要用它来给 `instructions` 提供路径。**

背景：启动器在设置工作目录后会把 CWD 切到玩家项目目录（`启动.bat` 的 `cd /d "%WSDIR%"` 与 `start "" "%WTEXE%" -w new -d "%WSDIR%"`）。在此之前，`config-writer.js` 写入的是裸相对路径，于是玩家一旦选过工作目录，人格文件就不再加载——不报错、不提示。
