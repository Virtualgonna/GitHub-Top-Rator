# 架构设计 · GitHub Top Radar

> 本文档面向**架构师与高级贡献者**，描述系统分层、数据流、模块依赖与设计权衡。

## 目录

- [顶层架构](#顶层架构)
- [运行形态对比](#运行形态对比)
- [数据流](#数据流)
- [模块依赖图](#模块依赖图)
- [核心模块详解](#核心模块详解)
- [状态管理](#状态管理)
- [国际化机制](#国际化机制)
- [AI 集成策略](#ai-集成策略)
- [缓存策略](#缓存策略)
- [关键设计决策](#关键设计决策)
- [安全考虑](#安全考虑)
- [未来演进方向](#未来演进方向)

---

## 顶层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户界面层 (UI Layer)                      │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │ TrendingList │TrendingDevelopers│ RepoDetail│ Favorites   │  │
│  │   History    │   Settings   │   App.tsx   │  main.tsx   │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
│                            ▲                                    │
│                            │ hooks / callbacks                  │
│  ┌─────────────────────────┴────────────────────────────────┐  │
│  │                  业务服务层 (Service)                     │  │
│  │  ┌────────────────┐  ┌────────────┐  ┌────────────────┐ │  │
│  │  │ github.ts      │  │  ai.ts     │  │  store.ts      │ │  │
│  │  │ (Trending 抓取 │  │ (AI 总结) │  │ (本地持久化)  │ │  │
│  │  │  + 翻译)       │  │           │  │               │ │  │
│  │  └────────────────┘  └────────────┘  └────────────────┘ │  │
│  │  ┌────────────────┐  ┌────────────┐                     │  │
│  │  │ utils.ts       │  │ i18n.ts    │                     │  │
│  │  │ (URL 解析、    │  │ (国际化)  │                     │  │
│  │  │  语言颜色)     │  │           │                     │  │
│  │  └────────────────┘  └────────────┘                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ▲                                    │
│                            │ HTTP / fetch                       │
│  ┌─────────────────────────┴────────────────────────────────┐  │
│  │                数据源 & 运行时 (Data Sources)              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │GitHub    │  │GitHub    │  │AI 提供商│  │MyMemory  │ │  │
│  │  │Trending  │  │Search API│  │(7 家)   │  │翻译 API  │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │  │
│  │  ┌──────────┐  ┌──────────┐                            │  │
│  │  │localStorage│ │Vite 代理 │  ← 开发期 CORS 桥接        │  │
│  │  └──────────┘  └──────────┘                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

应用采用经典的**三层架构**：
- **UI 层**：纯展示型 React 组件，通过 props / hooks 接收数据与回调。
- **业务服务层**：纯函数 + 状态管理，处理所有副作用（fetch、localStorage）。
- **数据源 & 运行时**：外部 API + 浏览器/Node 能力。

---

## 运行形态对比

应用支持 3 种运行环境，CORS 处理策略各异：

| 形态 | 启动命令 | 加载入口 | CORS 处理 | 直连 API |
|---|---|---|---|---|
| **Web 开发** | `npm run dev` | `http://localhost:5173` | Vite proxy | ❌ |
| **Web 生产** | `npm run preview` | `http://localhost:4173` | 需用户自备代理或浏览器扩展 | ❌（部分） |
| **本地启动器** | `npm run launcher` | `http://127.0.0.1:5180` | 自建 Node 代理（`scripts/launcher-server.cjs`） | ❌ |
| **Electron 开发** | `npm run electron:dev` | `http://localhost:5173` | Vite proxy | ❌ |
| **Electron 生产** | `npm run electron:build` | `app://desktop/index.html` | 自定义 `app://` 协议 + 直连 | ✅ |

URL 解析的统一入口在 [src/utils.ts](../src/utils.ts) 的 `resolveUrl()`：

```typescript
export function resolveUrl(url: string): string {
  if (!isElectron) return url          // Web 模式保持相对路径，走代理
  if (url.startsWith('http')) return url
  for (const [prefix, target] of Object.entries(PROXY_TARGETS)) {
    if (url.startsWith(prefix)) {
      return target + url.slice(prefix.length)   // Electron 直连
    }
  }
  return url
}
```

`isElectron` 通过 `window.electronAPI?.isElectron` 检测，由 `electron/preload.cjs` 注入。

---

## 数据流

### 加载 Trending 列表的完整流程

```
用户点击「刷新」
     │
     ▼
TrendingList.loadData()
     │
     ├──> github.fetchTrending(period, lang)
     │         │
     │         ├──> 内存缓存命中? ─── 是 ──> 直接返回
     │         │                    │
     │         │                    否
     │         │                    ▼
     │         ├──> resolveUrl(/github-trending/...html)
     │         │         │
     │         │         ├── Web: 保持 /github-trending/...
     │         │         └── Electron: 改为 https://github.com/...
     │         │
     │         ├──> fetch HTML
     │         ├──> parseTrendingRepos() 正则解析
     │         ├──> enrichRepos() 批量调用 Search API 补全 topics
     │         ├──> 按 Star 增长数排序
     │         └──> 写入内存缓存（10 分钟）
     │
     ├──> translateRepos() 批量翻译 description
     │         │
     │         ├──> 含中文字符? ── 是 ──> 跳过
     │         ├──> 已配置 AI 翻译模型? ── 是 ──> 调用 AI 翻译
     │         └──> 兜底 MyMemory API 翻译
     │
     ▼
setState(repos)  ──> 列表重渲染
```

### AI 总结的完整流程

```
用户点击项目进入详情
     │
     ▼
RepoDetail 挂载
     │
     ├──> useEffect: fetchReadme()
     │         │
     │         ├──> 尝试配置的 GitHub Token
     │         ├──> 尝试旧版 github_token localStorage 键
     │         └──> 匿名尝试（公开仓库）
     │
     ▼
readme 就绪
     │
     ├──> useEffect: 自动触发 handleSummarize()
     │         │
     │         ├──> getAIConfig() 三级 fallback
     │         │         │
     │         │         ├── 1. 激活的 AI 模型
     │         │         ├── 2. 旧版 aiEndpoint + aiKey
     │         │         └── 3. GitHub Models + githubToken
     │         │
     │         ├──> summarizeReadmeStructured(readme, ...)
     │         │         │
     │         │         ├── 查 _summaryCache
     │         │         ├── 构造 zh/en prompt
     │         │         ├── fetch(config.endpoint)
     │         │         │     AbortController 30s 超时
     │         │         ├── 解析 JSON
     │         │         └── 写入 _summaryCache
     │         │
     │         └──> setSummary(structured)
     │
     ▼
5 张 AI 卡片渲染完成
```

---

## 模块依赖图

```
main.tsx
   │
   └──> App.tsx
            │
            ├──> components/TrendingList.tsx
            ├──> components/TrendingDevelopers.tsx
            ├──> components/RepoDetail.tsx
            ├──> components/Favorites.tsx
            ├──> components/History.tsx
            └──> components/Settings.tsx
                     │
                     ├──> github.ts
                     │      │
                     │      ├──> utils.ts  (resolveUrl)
                     │      ├──> store.ts  (getTranslationConfig)
                     │      └──> i18n.ts   (TOPIC_ZH 字典)
                     │
                     ├──> ai.ts
                     │      │
                     │      ├──> utils.ts  (resolveUrl)
                     │      └──> i18n.ts   (错误信息翻译)
                     │
                     ├──> store.ts
                     │      │
                     │      └──> github.ts (Repo 类型)
                     │
                     ├──> i18n.ts
                     │
                     └──> utils.ts
```

**关键依赖关系：**
- `store.ts` 只依赖 `github.ts` 的 `Repo` 类型，无运行时循环依赖。
- `i18n.ts` 是纯数据 + Context Provider，无业务依赖。
- `utils.ts` 是叶子模块，只依赖浏览器 API。
- `github.ts` 与 `ai.ts` 互不依赖（避免循环），都依赖 `utils.ts` + `store.ts`。

---

## 核心模块详解

### 1. `src/github.ts` — Trending 数据源

**职责**：
- 从 GitHub Trending HTML 解析仓库信息（正则匹配）。
- 通过 Search API 补全 `topics / created_at / open_issues_count`。
- 提供中英文翻译能力。

**关键设计**：

```typescript
// 10 分钟内存缓存
const cache = new Map<string, { data: Repo[]; ts: number }>()
const CACHE_TTL = 10 * 60 * 1000

// HTML 解析失败时回退到 Search API
if (repos.length === 0) {
  return searchRepos(query, 20)  // ← 兜底
}

// 批量补全，每批 5 个，避免触发速率限制
for (let i = 0; i < names.length; i += batchSize) {
  const batch = names.slice(i, i + batchSize)
  ...
}
```

**为什么不用 GitHub REST API？**

GitHub Trending 页面没有官方 API。如果通过 Search API 模拟（如 `pushed:>2024-01-01 stars:>10`），结果质量差且响应慢。直接解析 HTML 是当前最可靠的方式。

**Topic 中文化字典** (`TOPIC_ZH`)：

内置 150+ 条 `topic → 中文` 映射，避免每次翻译都走网络。
未匹配的 topic 保持原文（如 `awesome-stuff` → `awesome-stuff`）。

### 2. `src/ai.ts` — AI 集成层

**职责**：
- 构造针对 README 的结构化 prompt。
- 调用任意 OpenAI 兼容 API。
- 解析并校验返回的 JSON。

**5 段输出结构** (`StructuredSummary`)：

```typescript
type StructuredSummary = {
  basicInfo: string     // 基础信息
  features: string      // 功能与亮点（每行一项）
  architecture: string  // 总体架构
  deployment: string    // 部署教程
  useCases: string      // 适用场景
}
```

**缓存键**：`${repoName}:${lang}`，按语言区分，重复访问秒开。

**超时控制**：

```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 30000)
const res = await fetch(url, { signal: controller.signal })
clearTimeout(timeoutId)
```

**Prompt 工程要点**：

- 强制 JSON 输出：`请严格输出 JSON，不要使用 Markdown 代码块`。
- README 截断到 4000 字符，避免超出上下文窗口。
- 提示语随界面语言切换（zh/en prompt 模板分离）。

### 3. `src/store.ts` — 本地持久化

**职责**：封装 `localStorage`，提供类型安全的 CRUD。

**3 个存储键**：

| 键 | 数据 | 默认值 |
|---|---|---|
| `github_insights_favorites` | `FavoriteFolder[]` | `[{ id: 'default', name: '默认收藏夹', repos: [] }]` |
| `github_insights_history` | `HistoryEntry[]` | `[]`（最多 200 条） |
| `github_insights_settings` | `AppSettings` | 全空 |

**AI 模型系统设计**：

```typescript
AppSettings = {
  aiModels: AIModelEntry[],           // 多模型并存
  aiActiveModelId: string | null,     // 当前激活（用于总结）
  aiTranslationModelId: string | null, // 当前翻译模型
  // ...兼容旧字段
}
```

**AI 配置三级 fallback** (`getAIConfig()`)：

```
1. 激活模型 + 独立 API Key
2. 激活模型 + GitHub Token（useGitHubToken 提供商）
3. 旧版 aiEndpoint + aiKey 字段
4. GitHub Models + githubToken（兜底）
5. 全空 → UI 提示用户配置
```

这种 fallback 链让旧版本数据无缝迁移。

### 4. `src/utils.ts` — 跨环境 URL 解析

**核心函数 `resolveUrl()`**：

```typescript
export function resolveUrl(url: string): string {
  if (!isElectron) return url
  ...
}
```

**为什么需要它？**

Vite 代理只在 dev server 中生效。生产 Web 版直接走 `https://github.com/...` 会被浏览器 CORS 拒绝。Electron 没有 CORS 限制，可以直连真实 URL。

此函数作为**抽象层**，让业务代码（`github.ts` / `ai.ts`）始终使用相对路径，由运行环境决定如何解析。

### 5. `src/i18n.ts` — 国际化

**设计**：扁平 key 命名空间 + Context Provider。

```typescript
'trending.allLangs': '所有语言',
'detail.aiSummary': 'AI 智能总结',
'fav.noReposHint': '在 Trending 列表中点击心形图标即可收藏',
```

**双语对齐原则**：
- `zh` 字典为基线，`en` 字典为对照。
- 缺失翻译时 fallback 到 `zh[key]`，再缺失则返回 key 本身。
- 支持参数占位符：`'trending.reposCount': '{n} 个项目'` → `t('trending.reposCount', { n: 20 })`。

**Context + Hook 模式**：

```typescript
export const I18nContext = createContext<I18nCtx>({...})

export function useI18nProvider() {
  const [lang, setLang] = useState<Lang>(...)
  return { lang, setLang, t: useCallback(...) }
}
```

非 React 模块（如 `ai.ts`）通过 `import { t } from './i18n'` 调用纯函数版本。

### 6. `electron/main.js` — Electron 主进程

**特权协议声明**：

```javascript
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true,
  },
}])
```

**为什么必须用 `app://` 协议？**

直接 `loadFile('dist/index.html')` 会因 `file://` 协议 + ES Modules CORS 策略白屏。
自定义 `app://` 协议拥有 standard / secure / corsEnabled 权限，与 `http://` 等价。

**协议注册时机**：

- `protocol.registerSchemesAsPrivileged()` 必须在 `app.whenReady()` **之前**调用。
- `protocol.handle('app', ...)` 必须在 `app.whenReady()` **之后**调用（需要 `defaultSession`）。

---

## 状态管理

应用无 Redux / Zustand 等状态库，**纯 React + 模块单例**：

| 数据 | 存储位置 | 跨组件同步 |
|---|---|---|
| UI 状态（视图、筛选） | `App.tsx` 的 `useState` | 通过 props / callbacks |
| 收藏夹 / 足迹 / 设置 | `localStorage` + `store.ts` | `window.dispatchEvent('favorites-changed')` |
| AI 总结缓存 | `ai.ts` 的 `_summaryCache` Map | 模块级单例（页面生命周期内） |
| Trending 缓存 | `github.ts` 的 `cache` Map | 模块级单例（页面生命周期内） |

**跨组件刷新**：

```typescript
// store.ts
export function saveFavoriteFolders(folders) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(folders))
  window.dispatchEvent(new Event('favorites-changed'))
}

// Favorites.tsx
useEffect(() => {
  const handler = () => refreshFolders()
  window.addEventListener('favorites-changed', handler)
  return () => window.removeEventListener('favorites-changed', handler)
}, [])
```

---

## 国际化机制

### 切换语言

```typescript
const { lang, setLang } = useI18nProvider()
setLang('en')  // 写入 localStorage.app_lang
```

`lang` 状态变化时，所有 `useI18n()` 订阅的组件自动重渲染。

### AI prompt 双语化

`src/ai.ts` 内部根据传入的 `lang` 参数选择 prompt 模板：

```typescript
const promptZh = `你是一个资深开源项目分析师，请阅读以下 README...`
const promptEn = `You are a senior open-source analyst. Please read...`
```

---

## AI 集成策略

### Provider 配置矩阵

| Provider | Endpoint | 鉴权方式 | 推荐模型 |
|---|---|---|---|
| GitHub Models | `/ai-models/...` | GitHub Token | gpt-4o-mini（**免费**） |
| OpenAI | `api.openai.com/v1/chat/completions` | API Key | gpt-4o-mini |
| DeepSeek | `api.deepseek.com/v1/chat/completions` | API Key | deepseek-chat |
| Anthropic | `api.anthropic.com/v1/messages` | API Key | claude-haiku-4 |
| 通义千问 | `dashscope.aliyuncs.com/...` | API Key | qwen-turbo |
| 豆包 | `ark.cn-beijing.volces.com/...` | API Key | doubao-lite-32k |
| 自定义 | 用户填写 | 用户填写 | 用户填写 |

### 描述翻译 vs AI 总结

两种用途可使用不同模型：

- **AI 总结**：在 `Settings` 中激活 ✓ 的模型。默认 `gpt-4o-mini`（性价比高）。
- **描述翻译**：在 `Settings` 中点击 🅰 图标的模型。若未指定，使用免费 MyMemory API。

### 错误处理

| 错误码 | 用户提示 |
|---|---|
| 401 / 403 | API Key 无效，请检查配置 |
| 404 | Endpoint 或 Model 不存在 |
| 429 | 触发速率限制，请稍后重试 |
| 30s 超时 | AI API 请求超时 |
| 网络错误 | 网络错误: <详情> |

所有错误文案均双语对齐。

---

## 缓存策略

| 缓存对象 | 存储位置 | TTL | 清理策略 |
|---|---|---|---|
| Trending 仓库 | `github.ts::cache` Map | 10 分钟 | 过期自动删除 |
| Trending 开发者 | `github.ts::devCache` Map | 10 分钟 | 过期自动删除 |
| AI 总结 | `ai.ts::_summaryCache` Map | 页面生命周期 | 刷新页面清空 |
| 收藏夹 / 足迹 / 设置 | `localStorage` | 永久 | 用户手动清除 |
| 翻译 | `translateTopic` 字典 | 永久 | 代码更新时同步 |

**为什么 Trending 缓存 10 分钟？**

GitHub Trending 页面本身更新频率为小时级，10 分钟内重复请求既无意义又浪费网络。
过短的 TTL 不能有效减少请求，过长的 TTL 又会导致榜单「陈旧感」。

---

## 关键设计决策

### 1. 为什么不用 GitHub REST API 抓 Trending？

| 方案 | 优点 | 缺点 |
|---|---|---|
| GitHub Trending HTML 解析 | 数据准确、秒级响应 | 依赖页面 DOM 结构 |
| GitHub Search API 模拟 | 稳定 | 需构造 `pushed:>X stars:>Y` 查询，结果偏离 Trending 排序 |

**当前方案**：HTML 解析为主，Search API 兜底。

### 2. 为什么是 localStorage 而非 IndexedDB？

| 维度 | localStorage | IndexedDB |
|---|---|---|
| 容量 | ~5MB | ~数百 MB |
| API 复杂度 | 简单 | 异步、繁琐 |
| 同步访问 | ✅ | ❌ |

本应用存储数据量极小（200 条足迹 + 几十条收藏），localStorage 完全够用，且 API 极简。

### 3. 为什么不用状态管理库（Redux/Zustand）？

- 状态规模小：仅 4 个视图 + 3 个 localStorage 键。
- 状态结构简单：UI 状态就地管理，持久化状态走 store。
- 引入库会增加打包体积和心智负担。

### 4. 为什么 Electron 而不是 Tauri？

- **Tauri 优势**：包体积小、Rust 后端、性能高。
- **Electron 优势**：生态成熟、配置简单、跨端一致性。
- **本项目选择 Electron**：开发速度快、避免 Rust 编译链、NSIS 安装体验完善。

### 5. 为什么 prompt 强制 JSON 输出？

LLM 默认输出 Markdown + 自由文本，难以程序化解析。强制 JSON 让前端可以直接 `JSON.parse()`。
实践中：

```
请严格输出以下 JSON 格式（不要使用 Markdown 代码块）：
{
  "basicInfo": "...",
  "features": "...",
  ...
}
```

---

## 安全考虑

### 已实施的安全措施

1. **零硬编码 Token**：项目不内置任何 GitHub Token / API Key。
2. **localStorage 隔离**：数据仅存当前域名（同源策略保护）。
3. **Fine-grained Token 推荐**：文档建议用户只勾选 `public_repo` 权限。
4. **Electron 安全配置**：
   - `contextIsolation: true` 渲染进程与 Node 隔离。
   - `nodeIntegration: false` 渲染进程不直接访问 Node API。
   - 所有 Node 能力通过 preload.cjs 暴露的白名单 API 提供。
5. **路径穿越防护**：`launcher-server.cjs` 的 `safeJoin()` 拒绝 `../` 访问父目录。
6. **HTML 解析容错**：所有正则匹配都做空值校验，避免注入。

### 待加强（未来工作）

- CSP (Content Security Policy) 配置。
- npm audit 自动化。
- 提交前 secret 扫描（gitleaks）。

---

## 未来演进方向

### 短期（1-2 月）

- [ ] **收藏夹导入/导出**：JSON 格式，方便跨设备迁移。
- [ ] **搜索功能**：在已加载的列表中按关键词过滤。
- [ ] **快捷键支持**：`j/k` 上下导航，`f` 收藏，`Esc` 返回。
- [ ] **暗色主题**：跟随系统或手动切换。

### 中期（3-6 月）

- [ ] **桌面通知**：当关注的仓库 Star 暴涨时通知用户。
- [ ] **RSS / Atom 订阅**：为每个收藏夹生成 feed。
- [ ] **Tauri 版本**：面向 Linux / macOS 用户，包体积更小。
- [ ] **多语言支持**：除中英外增加日语 / 韩语。

### 长期（6 月+）

- [ ] **Chrome 扩展版**：将 Trending 嵌入 GitHub.com 页面。
- [ ] **后端代理（可选）**：自托管版可绕过 CORS 限制。
- [ ] **GitHub OAuth 登录**：替换手工 Token，体验更丝滑。

---

## 附录：API Endpoint 全表

| 用途 | 路径（业务代码） | 实际目标 |
|---|---|---|
| Trending HTML | `/github-trending/trending/...` | `https://github.com/trending/...` |
| Search API | `/github-api/search/repositories` | `https://api.github.com/search/repositories` |
| Repo Metadata | `/github-api/repos/{full_name}` | `https://api.github.com/repos/{full_name}` |
| README | `/github-api/repos/{full_name}/readme` | `https://api.github.com/repos/{full_name}/readme` |
| GitHub Models | `/ai-models/chat/completions` | `https://models.inference.ai.azure.com/chat/completions` |
| MyMemory 翻译 | `/mymemory-api/get` | `https://api.mymemory.translated.net/get` |

如需新增 API，**必须同时更新**：

1. `vite.config.ts` 的 `server.proxy`。
2. `scripts/launcher-server.cjs` 的 `PROXY_ROUTES`。
3. `src/utils.ts` 的 `PROXY_TARGETS`。

---

如对架构有疑问或建议，欢迎 [提交 Issue](https://github.com/<your-org>/GitHub-Top-Radar/issues) 或 PR。