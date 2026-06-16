# 产品介绍 · GitHub Top Radar

> GitHub 趋势一站式洞察工具 —— 仓库、开发者、AI 总结，全中文友好。

## 项目愿景

GitHub Top Radar 致力于让中文开发者**零障碍消费 GitHub Trending**：
不再被英文描述劝退，不再逐个翻 README，不再在多个浏览器标签页之间手动整理收藏。

一切以「卡片」为单位，每张卡片都附带**中文描述 + AI 结构化总结**，
帮助你在 30 秒内决定是否深挖一个开源项目。

## 核心特性

### 🚀 1. 极速 Trending 抓取（HTML 解析）
- 直接抓取 `github.com/trending` 渲染后的 HTML，**秒级响应**，跳过 GitHub REST API 的速率限制。
- 内置 10 分钟内存缓存，避免重复请求。
- 解析失败时自动回退到 GitHub Search API，确保数据可用性。

### 🌍 2. 智能中文化
- **描述翻译**：英文项目描述自动翻译为中文。
  - 优先使用你配置的 AI 模型（OpenAI / DeepSeek / Qwen / Claude 等）。
  - 未配置时，自动回退到免费的 [MyMemory](https://mymemory.translated.net/) API。
- **Topic 中文化**：内置 150+ 常见技术关键词映射表（machine-learning → 机器学习、RAG → RAG 检索增强 …），无需网络请求。

### 🤖 3. AI 结构化总结
打开任意项目，AI 会自动读取其 README，并产出 **5 个分类卡片**：

| 卡片 | 内容 |
|---|---|
| 基础信息 | 项目定位、目标用户、核心价值 |
| 功能与亮点 | 关键能力清单（自动项目符号化） |
| 总体架构 | 技术栈、模块划分、设计哲学 |
| 部署教程 | 安装/启动/打包步骤 |
| 适用场景 | 谁应该用、典型用例 |

- 默认 **30 秒超时**，避免网络异常长时间转圈。
- **按仓库 + 语言缓存**，重复访问秒开。
- 跟随界面语言自动切换 prompt（中文界面 → 中文总结，英文界面 → 英文总结）。

### ❤️ 4. 收藏夹 & 文件夹管理
- **多文件夹**：默认收藏夹 + 任意自定义文件夹，按主题/技术栈/优先级分组。
- **跨文件夹移动**：右键即可在文件夹之间迁移项目。
- **拖拽友好的列表视图**：键盘、鼠标皆可操作。

### 👣 5. 浏览足迹
- 自动记录你打开过的项目（最多 200 条），按时间倒序展示。
- 一键加入收藏、移除记录、清空全部。
- 相对时间显示：刚刚 / N 分钟前 / N 天前 / N 个月前。

### 🎛️ 6. 多维筛选
- **周期**：今日 / 本周 / 本月 Star 增长。
- **语言**：30+ 种主流编程语言（含 TypeScript、Rust、Zig、Scala …）。
- **分类**：按 trending 类目过滤。

### 🌐 7. 双语界面
- 中文（默认）/ English 一键切换。
- 所有 UI 文案、错误提示、AI prompt 均双语对齐。

### 💻 8. 跨端形态
- **Web 版**：任意现代浏览器打开 `index.html` 即可使用。
- **Electron 桌面版**：原生窗口、离线图标、系统快捷方式。
- **本地启动器**：零依赖 `launcher-server.cjs`，一行命令同时提供 Web 版入口 + 安装包下载页。

## 适用人群

| 角色 | 典型用法 |
|---|---|
| 🔍 **行业研究员** | 每日扫描 Trending，发现新兴 AI、DevOps、Web 框架趋势 |
| 🛠️ **独立开发者** | 找灵感、对比同类工具、收藏值得二次开发的项目 |
| 🏢 **技术选型负责人** | 用 AI 总结快速形成初印象，深入评估候选方案 |
| 📚 **学习者** | 跟踪热门教学仓库，构建系统化的学习路径 |
| 🤖 **AI 从业者** | 第一时间发现 LangChain、LlamaIndex 等生态的新工具 |

## 与其他工具的差异

| 维度 | GitHub Trending 原页 | 第三方 Trending 站 | **GitHub Top Radar** |
|---|---|---|---|
| 描述翻译 | ❌ | 部分 | ✅ 中英双语 |
| AI 总结 | ❌ | ❌ | ✅ 5 段结构化 |
| 离线收藏 | ❌ | 需登录 | ✅ localStorage |
| AI 提供商选择 | — | — | ✅ 7 家 |
| 桌面客户端 | ❌ | ❌ | ✅ Electron |
| 双语 UI | 仅英文 | 取决于站点 | ✅ 中/英 |
| 足迹回溯 | ❌ | ❌ | ✅ 200 条 |

## 技术亮点

- **CORS 零烦恼**：开发期 Vite 代理、生产期 Electron 自定义 `app://` 协议、本地启动器自建代理，三种环境无缝切换。
- **数据补全**：HTML 解析拿到基础数据后，自动调用 Search API 补充 `topics / created_at / pushed_at`。
- **失败容忍**：网络抖动时优先展示已有缓存，AI 失败时降级为本地 topic 翻译。
- **零追踪零后端**：所有数据存放在你浏览器的 `localStorage`，无任何服务端、无任何埋点。

## 截图一览

> 截图位于 [`screenshots/`](../screenshots) 目录，README 中亦有引用。

| 视图 | 文件 |
|---|---|
| 仓库 Trending | [01-trending-repos.png](../screenshots/01-trending-repos.png) |
| 开发者榜单 | [02-developers-rank.png](../screenshots/02-developers-rank.png) |
| 收藏夹 | [03-favorites.png](../screenshots/03-favorites.png) |
| 浏览足迹 | [04-history.png](../screenshots/04-history.png) |
| 设置面板 | [05-settings-token.png](../screenshots/05-settings-token.png) |

## 立即体验

```bash
git clone https://github.com/<your-org>/GitHub-Top-Radar.git
cd GitHub-Top-Radar
npm install
npm run launcher          # 一键启动本地启动器
# 或
npm run dev               # 直接进入开发模式
```

详细使用说明请参考 [USER_GUIDE.md](./USER_GUIDE.md)，
开发指南请参考 [DEVELOPMENT.md](./DEVELOPMENT.md)，
架构说明请参考 [ARCHITECTURE.md](./ARCHITECTURE.md)。