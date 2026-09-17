# 包布局声明不进分发产物

`tools/layout.json` 是本仓库对「包布局」的单一声明，但它**只存在于构建仓库，不部署进产物**。

因此 `templates/setup/config-writer.js` 里的 `rootOf()` 保留为一份**手写的布局副本**——它在玩家机器上运行，读不到 `layout.json`。这份副本不是要消灭的漏水，而是**被校验的副本**：构建仓库的测试会调 `configure({ root: <临时目录> })`，断言文件恰好落在 `layout.json` 声明的位置。一旦两边漂移，测试失败。

被否决的替代方案：把 `layout.json` 也复制进产物（例如 `<包根>/layout.json`），让 `rootOf()` 退化为它的薄投影。否决理由——为一个 8 行的纯函数引入运行时依赖，代价是产物里多一个无人阅读的文件，以及 `config-writer.js` 要新增「文件缺失 / 损坏 / 被玩家改动」三条失败路径。

推论：`layout.json` 的消费者全部在构建仓库内（`tools/build.ps1` 的部署遍历、`tools/verify-package.js`、构建仓库的测试）。任何**在玩家机器上运行**的代码都不应该试图读它。
