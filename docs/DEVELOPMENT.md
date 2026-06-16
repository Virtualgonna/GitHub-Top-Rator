# 开发指南 · GitHub Top Radar

本指南面向**二次开发者和贡献者**，介绍如何搭建开发环境、运行测试与打包发布。

## 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [开发模式](#开发模式)
- [代码规范](#代码规范)
- [构建与发布](#构建与发布)
- [提交流程](#提交流程)
- [调试技巧](#调试技巧)

---

## 环境要求

| 工具 | 最低版本 | 推荐版本 |
|---|---|---|
| Node.js | 18.x | 20.x LTS |
| npm | 9.x | 10.x |
| Git | 2.30+ | 最新 |
| OS | Windows 10 / macOS 12 / Ubuntu 22.04 | — |

> Electron 42 需要 Node 18+，建议使用 Node 20 LTS 以获得最佳兼容性。

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/<your-org>/GitHub-Top-Radar.git
cd GitHub-Top-Radar

# 2. 安装依赖
npm install

# 3. 启动 Web 版开发服务器（默认 http://localhost:5173）
npm run dev

# 4.（可选）启动本地启动器（http://127.0.0.1:5180/）
npm run launcher

# 5.（可选）启动 Electron 开发模式
npm run electron:dev
```

---

## 项目结构

```
GitHub-Top-Radar/
├── .github/                  # GitHub 社区配置
│   ├── ISSUE_TEMPLATE/       # Issue 模板（bug/feature/question）
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/ci.yml      # 持续集成
├── build/                    # electron-builder 资源（icon.ico 等）
├── dist/                     # Vite 构建产物（git ignore）
├── docs/                     # 项目文档
│   ├── PRODUCT.md
│   ├── USER_GUIDE.md
│   ├── DEVELOPMENT.md        # 本文件
│   └── ARCHITECTURE.md
├── electron/                 # Electron 主进程
│   ├── main.js               # 主进程入口
│   └── preload.cjs           # 预加载脚本
├── public/                   # 静态资源（构建时拷贝）
│   ├── favicon.svg
│   ├── icons.svg
│   └── logo.png
├── release/                  # electron-builder 输出（git ignore）
├── screenshots/              # README / docs 截图
├── scripts/
│   └── launcher-server.cjs   # 零依赖本地启动器
├── src/
│   ├── assets/               # 内联资源（构建时打包）
│   ├── components/           # React 组件
│   │   ├── TrendingList.tsx
│   │   ├── TrendingDevelopers.tsx
│   │   ├── RepoDetail.tsx
│   │   ├── Favorites.tsx
│   │   ├── History.tsx
│   │   └── Settings.tsx
│   ├── ai.ts                 # AI 总结 + 连接测试
│   ├── github.ts             # Trending HTML 解析 + 翻译
│   ├── i18n.ts               # 中英双语字典
│   ├── store.ts              # localStorage 封装
│   ├── utils.ts              # 通用工具（URL 解析、语言颜色、时间格式）
│   ├── App.tsx               # 应用根组件
│   ├── main.tsx              # ReactDOM 入口
│   └── style.css             # 全局样式
├── .gitignore
├── electron-builder.cjs      # Electron 打包配置
├── icon.png                  # 应用图标
├── index.html                # Vite HTML 入口
├── launcher.html             # 启动器首页
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 开发模式

### npm scripts 总览

| 命令 | 作用 |
|---|---|
| `npm run dev` | 启动 Vite dev server，HMR 热更新 |
| `npm run build` | TypeScript 类型检查 + Vite 生产构建到 `dist/` |
| `npm run preview` | 本地预览 `dist/` 构建产物（端口 4173） |
| `npm run launcher` | 启动零依赖本地启动器（端口 5180） |
| `npm run electron:dev` | 同时启动 Vite + Electron 窗口（开发模式） |
| `npm run electron:build` | 构建 Web 产物 + 打包 Electron 安装包 |

### Vite 开发服务器

```bash
npm run dev
```

Vite 在 `vite.config.ts` 中配置了 4 个 CORS 代理：

| 代理路径 | 上游目标 | 用途 |
|---|---|---|
| `/github-trending` | `https://github.com` | 抓取 Trending HTML |
| `/github-api` | `https://api.github.com` | Search API / README |
| `/ai-models` | `https://models.inference.ai.azure.com` | GitHub Models |
| `/mymemory-api` | `https://api.mymemory.translated.net` | 翻译 fallback |

### Electron 开发模式

```bash
npm run electron:dev
```

执行步骤：
1. 并行启动 `vite` 与 `wait-on http://localhost:5173`。
2. Vite 就绪后启动 `electron . --dev`。
3. Electron 加载 `http://localhost:5173`，开启 DevTools。

修改源码后 Vite HMR 自动热更新，Electron 窗口实时刷新。

### 本地启动器

```bash
npm run launcher
```

`scripts/launcher-server.cjs` 是一个**零依赖**的 Node HTTP server：

- 端口：`5180`（避开 Vite 的 5173/4173）。
- 根目录：仓库根。
- 代理：与 Vite 保持一致的 4 条路由。
- SPA fallback：`/dist/*` 找不到时返回 `dist/index.html`。
- 路径穿越防护：禁止 `../etc/passwd` 这类请求。

启动后自动打开默认浏览器到 <http://127.0.0.1:5180/>。

---

## 代码规范

### TypeScript

- 严格模式（`tsconfig.json` 已开启 `strict: true`）。
- 函数/组件参数尽量标注类型，避免 `any`。
- 导出接口（`interface`）优先于类型别名（`type`）用于对象结构。

### React

- 函数组件 + Hooks，无 class 组件。
- 复杂状态用 `useState`，副作用用 `useEffect`。
- 性能敏感场景使用 `useCallback` / `useMemo`。
- 文件命名：组件使用 PascalCase（`TrendingList.tsx`），工具模块使用 camelCase（`utils.ts`）。

### 样式

- 全局样式集中在 `src/style.css`，无 CSS-in-JS。
- 采用 CSS 变量定义主题色（`--accent`、`--bg-primary` 等）。
- BEM 风格类名（`.detail-card`、`model-card-active`）。

### 文件注释

- 模块顶部用「// ─── 标题 ───」分隔不同区块。
- 函数 JSDoc 注释重点说明**意图**和**约束**，而非逐字翻译。

### 提交规范

采用 Conventional Commits（推荐）：

```
feat: 新增收藏夹拖拽排序
fix: 修复 Electron 在 macOS 下窗口空白
docs: 更新 USER_GUIDE.md 的常见问题
refactor: 重构 ai.ts 缓存键生成逻辑
```

---

## 构建与发布

### 仅构建 Web 版

```bash
npm run build
# 产物：dist/
```

产物结构：

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── logo.png
```

可直接部署到 GitHub Pages / Vercel / Netlify / Nginx 等任何静态托管服务。

### 构建 Electron 桌面安装包

```bash
npm run electron:build
# Windows：release/GitHub-Top-Radar-Setup-1.0.0.exe
```

执行步骤：
1. `tsc --noEmit` 类型检查。
2. `vite build` 构建 Web 产物到 `dist/`。
3. `electron-builder` 将 `dist/` + `electron/` + `icon.png` 打包为 NSIS 安装包。

配置见 `electron-builder.cjs`：
- `appId`: `com.github-top-radar.app`
- `productName`: `GitHub Top Radar`
- `target`: `nsis` / `x64`
- 跳过 `npmRebuild`（无 native 依赖，避免 Windows EPERM）。

### 自定义图标

替换以下文件之一即可：

- `icon.png`：应用图标源文件（任意尺寸 PNG）。
- `build/icon.ico`：electron-builder 专用 ICO（含 7 种尺寸，最大 256×256）。

---

## 提交流程

1. **Fork** 本仓库到你的账号。
2. 创建特性分支：
   ```bash
   git checkout -b feat/my-awesome-feature
   ```
3. 提交代码：
   ```bash
   git add .
   git commit -m "feat: add my awesome feature"
   ```
4. 推送到你的 Fork：
   ```bash
   git push origin feat/my-awesome-feature
   ```
5. 在 GitHub 上发起 **Pull Request**，填写 `.github/PULL_REQUEST_TEMPLATE.md`。
6. 等待 CI（`.github/workflows/ci.yml`）通过：
   - `npm ci` 安装依赖。
   - `tsc --noEmit` 类型检查。
   - `npm run build` 生产构建。
   - 上传 `dist/` 产物作为构建产物。
7. 维护者 Review 通过后合入。

---

## 调试技巧

### 浏览器 DevTools

Web 版直接按 `F12` 打开 DevTools。

关键面板：

- **Network**：观察 `/github-trending/*`、`/github-api/*`、`/ai-models/*` 的请求状态。
- **Application → Local Storage**：检查 `github_insights_favorites / _history / _settings`。
- **Console**：捕获 fetch 抛错、JSON 解析失败等。

### Electron DevTools

`npm run electron:dev` 时自动开启 DevTools。
或在 `electron/main.js` 的 `webPreferences` 中临时设置 `devTools: true`。

### 网络代理调试

如果遇到 CORS / 代理问题，按以下顺序排查：

1. **Vite proxy**：`vite.config.ts` 中 `server.proxy` 字段。
2. **Electron**：URL 自动走真实 API，详见 `src/utils.ts` 的 `resolveUrl()`。
3. **本地启动器**：`scripts/launcher-server.cjs` 的 `PROXY_ROUTES` 常量。

三者必须保持一致。新增 API 时需要同时更新这三处。

### AI 调用排错

在 `src/ai.ts` 的 `summarizeReadmeStructured` 中：

- 默认超时 30 秒（`AbortController`）。
- 错误信息会以 i18n key 形式抛出，UI 层负责翻译。

测试连接时可临时打开 `Settings → 添加模型 → 测试连接`，会显示真实错误码。

---

## 常用扩展点

| 想做什么 | 改哪里 |
|---|---|
| 增/改翻译语言 | `src/i18n.ts` |
| 调整 Trending 排序逻辑 | `src/github.ts` 的 `fetchTrending` |
| 增/改 AI 提供商 | `src/store.ts` 的 `AI_PROVIDERS` |
| 改造主题色 | `src/style.css` 的 CSS 变量 |
| 增加新视图页 | `src/App.tsx` 的 `view` state + `src/components/` |

---

## 许可证

本项目基于 [MIT](../LICENSE) 开源，欢迎 PR 与 Issue。