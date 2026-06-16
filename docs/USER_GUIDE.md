# 用户指南 · GitHub Top Radar

本指南面向**最终用户**，介绍如何在三种部署形态下使用 GitHub Top Radar。

## 目录

- [快速开始](#快速开始)
- [界面导览](#界面导览)
- [功能详解](#功能详解)
- [常见问题 FAQ](#常见问题-faq)

---

## 快速开始

### 方式一：Web 版（推荐新手）

```bash
npm install
npm run dev
```

浏览器自动打开 <http://localhost:5173>，所有功能开箱即用，**无需任何 Token**。

> 注意：Web 版的 CORS 代理由 Vite 提供，必须通过 `npm run dev` 启动的服务器访问；
> 直接双击 `index.html` 会因浏览器 CORS 策略白屏。

### 方式二：本地启动器（最省心）

```bash
npm run launcher
```

启动器自动打开 <http://127.0.0.1:5180/>，并提供三个入口：

| 入口 | URL | 用途 |
|---|---|---|
| 启动器首页 | `/` | 美观的索引页（查看使用说明、截图） |
| Web 版 | `/dist/` | 已构建的静态站点，离线可用 |
| 桌面安装包 | `/release/` | 下载 Windows NSIS 安装包 |

### 方式三：Electron 桌面版

开发模式：

```bash
npm run electron:dev
```

打包 Windows 安装包：

```bash
npm run electron:build
# 产物：release/GitHub-Top-Radar-Setup-1.0.0.exe
```

桌面版启动后会自动隐藏所有 CORS 代理配置，**直接走真实 API**。

---

## 界面导览

应用主界面由顶部导航栏 + 内容区组成。

```
┌──────────────────────────────────────────────────────────────┐
│ [LOGO]  Repos | Developers | Favorites | History   [EN/中] [⚙] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   [Period: Today/Week/Month]  [Lang: All ▾]  [Topic ▾] [🔄]  │
│                                                              │
│   #1  🔥  repo/name                                          │
│        项目描述（自动翻译为中文）                              │
│        ★ 12.3k   🍴 800   TypeScript   ...                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 顶部导航

| 按钮 | 功能 |
|---|---|
| **Repos** | 仓库 Trending 列表（默认页） |
| **Developers** | 开发者 Trending 榜单 |
| **Favorites** | 我的收藏夹 |
| **History** | 浏览足迹 |
| **EN / 中** | 切换界面语言 |
| **⚙** | 打开设置面板 |

---

## 功能详解

### 1. 浏览 Trending 仓库

进入 **Repos** 页后，点击右上角 **「🔄 刷新数据」** 按钮开始加载。

#### 筛选条件

- **Period（周期）**：Today / This Week / This Month
- **Language**：支持 30+ 种语言（TypeScript、Python、Rust、Go、Zig …）
- **Topic**：根据 trending 类目过滤（动态加载）

#### 列表字段

| 字段 | 说明 |
|---|---|
| 排名 | 当周期内 Star 增长数降序 |
| 头像 + 仓库名 | 跳转 GitHub 仓库页 |
| 描述 | 已自动翻译为中文 |
| ★ | 总 Star 数 |
| 🍴 | Fork 数 |
| 语言 | 带颜色小圆点 |
| Topics | 已本地化为中文 |
| 创建 / 活跃时间 | YYYY-MM-DD |

#### 收藏一个项目

点击列表中任意项目右上角的 **♡ 收藏按钮**，会弹出文件夹选择器：

- 选择已有文件夹 → 加入该文件夹。
- 输入新名称 → 一键创建并加入。

### 2. 查看 AI 智能总结

点击任意仓库进入详情页。详情页包含三块内容：

#### a) 项目信息头部

- 头像 + 全名 + 描述
- Stars / Forks / Issues / Language 卡片
- 主题标签
- 「查看源码」按钮 → 跳转 GitHub
- 「♡ 收藏」按钮（已收藏可直接取消）
- 创建时间 / 最后活跃时间

#### b) AI 智能总结

README 一旦加载完成，AI 会**自动**生成 5 张卡片：

1. **基础信息** — 项目是什么、解决什么问题
2. **功能与亮点** — 核心能力清单
3. **总体架构** — 技术栈与模块划分
4. **部署教程** — 安装/启动步骤
5. **适用场景** — 谁应该使用、典型用例

如果 AI 还未配置，详情页会提示「请在设置中配置 AI 模型」。

> 总结结果会按 `仓库 + 语言` 缓存，重复访问秒开。

#### c) 原始 README

点击「展开原始 README」可查看完整 Markdown 源码，便于二次校对。

### 3. 浏览 Trending 开发者

进入 **Developers** 页，点击 **「🔄 刷新数据」** 加载当周期的热门开发者。

每张卡片显示：

- 排名 + 头像
- 显示名 + @用户名
- 热门仓库（带链接与描述）

点击用户名跳转 GitHub Profile，点击热门仓库跳转仓库页。

### 4. 管理收藏夹

进入 **Favorites** 页，左侧是文件夹列表，右侧是当前文件夹内的项目。

| 操作 | 步骤 |
|---|---|
| 新建文件夹 | 点击左下「+ 新建收藏夹」 |
| 重命名文件夹 | 在文件夹名称上双击 |
| 删除文件夹 | 右键 → 删除（至少保留 1 个） |
| 移动项目 | 项目卡片「移动到...」按钮 |
| 取消收藏 | 项目卡片「取消收藏」按钮 |

### 5. 浏览足迹

进入 **History** 页，按时间倒序显示最近打开的 200 个项目。

- **一键收藏**：将项目加入默认收藏夹。
- **移除记录**：单条删除。
- **清空全部**：右上角按钮（需二次确认）。

时间显示为相对时间：「刚刚 / 5 分钟前 / 2 天前 / 3 个月前 / 1 年前」。

### 6. 配置 AI 模型（设置面板）

点击右上角 **⚙** 进入设置面板。

#### 6.1 GitHub Personal Access Token

- 用途：提高 GitHub API 速率限制（匿名 10次/分钟 → 认证 30次/分钟）。
- 推荐：勾选 `public_repo` 的 Fine-grained token。
- 点击 **「获取 Token」** 链接直达 GitHub Token 创建页。
- 填好后点击 **「保存」**。

#### 6.2 AI 模型管理

**添加模型** → 弹出表单：

1. 选择提供商（GitHub Models / OpenAI / DeepSeek / Anthropic / 通义千问 / 火山引擎豆包 / 自定义）。
2. 选择模型（预设列表或自定义输入）。
3. 填入 API Key（GitHub Models 复用 GitHub Token）。
4. 点击 **「测试连接」** 验证配置。
5. 点击 **「保存」** 添加到列表。

**激活模型** → 在模型卡片上点击 ✓ 图标，将其设为 AI 智能总结所用的模型。

**设为翻译模型** → 点击 🅰 图标，让描述翻译走 AI（而非免费 MyMemory API）。

**支持 7 家提供商：**

| 提供商 | 推荐模型 | 备注 |
|---|---|---|
| GitHub Models | gpt-4o-mini / DeepSeek-R1 | **免费**，复用 GitHub Token |
| OpenAI | gpt-4o-mini | 需要 API Key |
| DeepSeek | deepseek-chat | 中文友好、价格低 |
| Anthropic | claude-haiku-4 | 长上下文 |
| 通义千问 | qwen-turbo | 国内访问稳定 |
| 火山引擎豆包 | doubao-lite-32k | 国内访问稳定 |
| 自定义 | 任意 | 填入 OpenAI 兼容 endpoint |

---

## 常见问题 FAQ

### Q1: 加载 Trending 列表很慢 / 失败？

A: HTML 解析受 GitHub 页面结构影响。如遇失败：
- 检查网络是否能访问 `github.com`。
- 点击「刷新数据」重试。
- 解析失败时应用会自动回退到 GitHub Search API，可能仍能加载。

### Q2: AI 总结一直显示「加载中」？

A: 可能原因：
- 未配置 AI 模型 → 打开设置面板，添加并激活一个模型。
- API Key 错误 → 重新填入并「测试连接」。
- 超时（30s）→ 检查网络，重试或换更快的模型。

### Q3: MyMemory 翻译不准确怎么办？

A: 在设置面板的 AI 模型中：
1. 添加一个 OpenAI / DeepSeek / Qwen 等模型。
2. 点击 🅰 图标将其**设为翻译模型**。
3. 刷新 Trending 列表即可使用更准确的 AI 翻译。

### Q4: 收藏的数据存在哪里？换电脑会丢吗？

A: 收藏、足迹、设置均存储在浏览器的 `localStorage` 中，**仅本机保留**。
换电脑需要重新收藏。可考虑：
- 浏览器自带的同步功能（Chrome / Edge 同步）。
- 自行导出/导入（未来版本计划）。

### Q5: Electron 桌面版如何连接 GitHub / AI？

A: 桌面版通过自定义 `app://` 协议加载本地文件，**直接走真实 API**（不走 Vite 代理）。
- GitHub API 直连 `api.github.com`。
- AI API 直连各厂商 endpoint。
- 只需在设置中填入正确的 Token / API Key 即可。

### Q6: 怎样完全离线使用？

A: Web 版和桌面版均依赖外部 API（GitHub / AI / MyMemory），无法完全离线。
但**已收藏的项目**和**已生成的 AI 总结**在本地可离线浏览。

### Q7: 怎样修改界面字体 / 主题色？

A: 当前版本未提供主题切换，所有样式集中在 `src/style.css`，
可自由修改主色 `--accent`、`--bg-primary` 等 CSS 变量。

---

更多问题请 [提交 Issue](https://github.com/<your-org>/GitHub-Top-Radar/issues)，
或参考 [DEVELOPMENT.md](./DEVELOPMENT.md) 自行扩展功能。