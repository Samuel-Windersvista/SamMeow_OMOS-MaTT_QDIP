# Task 6 Brief: 打包器 build.ps1 + 离线组件缓存

> 来源：docs/02-通用版-实施计划.md Task 6（你的需求，含前序任务 carry 提示）

## Files:
- Create: `tools/build.ps1`
- Create: `.gitattributes`
- Modify: 无（components.json 已由 Task 1 创建，勿改）

## 前序任务 carry（必须体现）

1. **CRLF 保证**：启动.bat（Task 3 产物）在分发时必须保持 CRLF 行尾。创建 `.gitattributes`：
   ```
   *.bat text eol=crlf
   *.ps1 text eol=crlf
   ```
   并验证 `templates/启动.bat` 仓库内为 CRLF（若 git 检出已变 LF，重新从实际文件恢复 CRLF 后提交 .gitattributes）。
2. **check-sources 从仓库根调用**：build.ps1 调用 check-sources.ps1 时必须先 `Set-Location` 到项目根（或传绝对路径的 ComponentsFile 后由 check-sources 内部锚定——不改 check-sources，只在 build.ps1 里保证 CWD 正确）。
3. **打包后人工验证引导页**：组装完成后起 guide-server 打开页面做一次截图/描述级人工确认（禁止浏览器自动化工具，可以用描述性检查代替：页面 HTML 完整、静态资源可访问）。

## Step 1: 编写 tools/build.ps1

骨架代码在计划文档 `docs/02-通用版-实施计划.md` Task 6 Step 1（5 步流程：清理 → 复制组件 → 部署模板 → 校验 → zip）。按骨架实现，注意：
- `$root = Split-Path $PSScriptRoot -Parent` 计算项目根
- 部署模板时含 `启动.bat`、`更新组件.bat`（Task 7 产物，若尚未创建则跳过该行并报告——实际以当前仓库状态为准）、setup/ 全部、opencode.json、oh-my-opencode-slim.json
- 校验段：node.exe 与 opencode 可执行文件的存在性检测保留双形态（.exe 或 .cmd）
- zip 输出 `build/qdip-generic-<version>.zip`（version 来自 components.json 的 version 字段）

## Step 2: 准备离线组件缓存（tools/cache/，git 忽略目录）

```powershell
# 便携 Node 24.14.1 官方 zip
Invoke-WebRequest "https://nodejs.org/dist/v24.14.1/node-v24.14.1-win-x64.zip" -OutFile "tools\cache\node-v24.14.1-win-x64.zip"
Expand-Archive "tools\cache\node-v24.14.1-win-x64.zip" -DestinationPath "tools\cache" -Force
# 解压后应得到 tools\cache\node-v24.14.1-win-x64\node.exe（与 components.json 的 source 路径一致）

# opencode CLI 离线包
Set-Location "tools\cache"
npm pack opencode-ai@1.18.25
# 解包验证结构：opencode-ai-1.18.25.tgz 内 package/ 目录的 bin 布局
```

**关键验证点**（计划标注"以实际为准"的环境适配点）：npm 包的 bin 形态决定 `opencode/bin` 怎么组装。按优先级尝试：
- 方案 A：tgz 解包后若 `package/bin/opencode` 或类似可直接执行形态存在，将其部署为 `opencode/bin/opencode.cmd`（Windows shim 用 npm 生成：`npm install -g opencode-ai@1.18.25 --prefix <temp>` 后在 `<temp>/` 里找 opencode.cmd，复制到 cache）
- 方案 B：用 `npm install --prefix tools/cache/opencode-1.18.25 opencode-ai@1.18.25` 完整安装，把 `tools/cache/opencode-1.18.25/node_modules/.bin/opencode*` 与其依赖目录部署
以实际可执行为准（`<组装目录>\opencode\bin` 下能直接跑 `opencode --version`），选定方案后把布局写入报告。

## Step 3: 运行打包器

Run: `powershell -ExecutionPolicy Bypass -File tools\build.ps1`（从项目根）
Expected: 5 步输出 + `[DONE] 组装完成` + zip 生成。若 check-sources 报缺，先按 Step 2 补缓存再跑。

## Step 4: 组装产物冒烟

Run: `build\qdip-generic-<version>\启动.bat --check`
Expected: node 版本输出，无 [FAIL]。

再验证：组装目录里 启动.bat 为 CRLF；guide-server 可起（node setup/guide-server.js <组装目录> → .guide-url 生成）。

## Step 5: 提交

```bash
git add tools/build.ps1 .gitattributes
git commit -m "feat(qdip): packaging script with component assembly"
```

注意：tools/cache/ 与 build/ 在 .gitignore 里，不提交。

## 全局约束
- 网络下载用 Invoke-WebRequest 或 npm（两者可达，勿走 GitHub 源）
- 组装产物与缓存不进 git
- 只本地 commit，不 push
