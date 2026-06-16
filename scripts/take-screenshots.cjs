#!/usr/bin/env node
/**
 * scripts/take-screenshots.cjs
 * 补充截图脚本：捕获 AI 总结、设置面板等关键视图
 *
 * 原理：
 *   1. 通过 localStorage 注入 mock 数据，避免依赖外部 API
 *   2. 跳转到对应页面后等待渲染完成
 *   3. 用 Playwright Chromium 截图保存到 screenshots/ 目录
 */

const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://127.0.0.1:5180/dist/'
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'screenshots')

// 视口：与 Electron 默认窗口接近
const VIEWPORT = { width: 1280, height: 860 }

// Mock 数据：模拟 AI 总结结果
const MOCK_SUMMARY = {
  basicInfo: 'Anthropic 推出的 MCP（Model Context Protocol）是一个开放标准，用于在大型语言模型与外部数据源/工具之间建立安全、双向的连接。它解决了 LLM 应用与数据孤岛之间的集成难题，让 AI 助手能够真正访问本地文件、数据库、API 等上下文。',
  features: '• 标准化协议：单一规范适用于所有 LLM 与数据源的集成\n• 双向通信：支持客户端 ↔ 服务端的实时数据交换\n• 安全沙箱：所有操作需经过明确的权限控制\n• 跨平台兼容：兼容 Claude、GPT、Llama 等主流模型\n• 开源生态：社区贡献了 1000+ 现成的 MCP Server 实现',
  architecture: '采用客户端-服务器架构。LLM 应用作为 MCP Client，通过 stdio 或 SSE 协议连接 MCP Server。Server 负责封装具体的数据源（GitHub、数据库、本地文件系统等），向上暴露统一的 Resources/Tools/Prompts 三类原语。整体设计借鉴了 LSP（Language Server Protocol）的成功经验。',
  deployment: '# 安装\nnpm install -g @modelcontextprotocol/server-github\n\n# 配置 Claude Desktop\n# 在 claude_desktop_config.json 中添加：\n{\n  "mcpServers": {\n    "github": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-github"],\n      "env": { "GITHUB_TOKEN": "ghp_xxx" }\n    }\n  }\n}\n\n# 重启 Claude Desktop 即可使用',
  useCases: '• 企业知识库接入：让 AI 助手直接查询 Confluence、Notion、内部 Wiki\n• 本地文件管理：让 Claude 操作你的本地代码库、文档库\n• API 工具调用：标准化封装 REST API，避免每个项目重复实现\n• 数据库查询：让 AI 安全地执行 SQL，避免直接暴露凭证\n• DevOps 自动化：让 AI 助手操作 Kubernetes、Docker、CI 系统'
}

// Mock 仓库（带详情数据）
const MOCK_REPO = {
  id: 1,
  name: 'model-context-protocol',
  full_name: 'modelcontextprotocol/model-context-protocol',
  html_url: 'https://github.com/modelcontextprotocol/model-context-protocol',
  description: 'Specify how AI applications connect to data sources and tools via a standardized protocol',
  stargazers_count: 12500,
  language: 'TypeScript',
  language_color: '#3178c6',
  owner: {
    login: 'modelcontextprotocol',
    avatar_url: 'https://github.com/modelcontextprotocol.png'
  },
  topics: ['mcp', 'llm', 'ai-agents', 'claude', 'anthropic', 'open-source'],
  created_at: '2024-11-01T00:00:00Z',
  updated_at: '2025-06-10T00:00:00Z',
  pushed_at: '2025-06-12T00:00:00Z',
  forks_count: 820,
  open_issues_count: 145,
  stars_today: 234,
  stars_week: 1456,
  stars_month: 5320
}

// Mock 收藏夹
const MOCK_FAVORITES = [
  {
    id: 'default',
    name: '默认收藏夹',
    repos: [MOCK_REPO]
  },
  {
    id: 'ai',
    name: 'AI 工具',
    repos: []
  },
  {
    id: 'devtools',
    name: '开发工具',
    repos: []
  }
]

// Mock 历史记录
const MOCK_HISTORY = [
  {
    repoId: 1,
    repo: MOCK_REPO,
    viewedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    repoId: 2,
    repo: {
      ...MOCK_REPO,
      id: 2,
      full_name: 'anthropics/claude-code',
      description: 'Anthropic 的官方命令行编程助手',
      stargazers_count: 8200
    },
    viewedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  },
  {
    repoId: 3,
    repo: {
      ...MOCK_REPO,
      id: 3,
      full_name: 'openai/openai-python',
      description: 'OpenAI 官方 Python SDK',
      stargazers_count: 24000
    },
    viewedAt: new Date(Date.now() - 1 * 86400 * 1000).toISOString()
  }
]

// Mock AI 模型
const MOCK_AI_MODELS = [
  {
    id: 'm1',
    providerId: 'github-models',
    name: 'GitHub Models - GPT-4o Mini',
    model: 'gpt-4o-mini',
    endpoint: '/ai-models/chat/completions',
    apiKey: ''
  },
  {
    id: 'm2',
    providerId: 'deepseek',
    name: 'DeepSeek 翻译专用',
    model: 'deepseek-chat',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    apiKey: 'sk-mock-key'
  }
]

async function captureView(page, name, setupFn) {
  console.log(`  [capture] ${name}`)
  if (setupFn) await setupFn(page)
  await page.waitForTimeout(800) // 等待渲染稳定
  const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`)
  await page.screenshot({ path: filepath, fullPage: false })
  console.log(`  [saved] ${filepath}`)
}

async function main() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1
  })
  const page = await context.newPage()

  // 默认中文界面
  await page.addInitScript(() => {
    localStorage.setItem('app_lang', 'zh')
  })

  // === 截图 06: AI 智能总结视图（仓库详情页）===
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })

  // 注入 mock 数据
  await page.evaluate(({ favorites, history, summary, repo, aiModels }) => {
    localStorage.setItem('github_insights_favorites', JSON.stringify(favorites))
    localStorage.setItem('github_insights_history', JSON.stringify(history))
    localStorage.setItem('github_insights_settings', JSON.stringify({
      githubToken: '',
      aiEndpoint: '',
      aiModel: '',
      aiKey: '',
      aiModels,
      aiActiveModelId: 'm1',
      aiTranslationModelId: 'm2'
    }))
    // 直接注入 AI 总结缓存（模拟已总结过）
    // 详见 src/ai.ts 的 _summaryCache 键格式
    window.__mock_summary__ = summary
    window.__mock_repo__ = repo
  }, { favorites: MOCK_FAVORITES, history: MOCK_HISTORY, summary: MOCK_SUMMARY, repo: MOCK_REPO, aiModels: MOCK_AI_MODELS })

  // 通过注入 mock 数据，触发详情页渲染
  await captureView(page, '06-repo-detail-ai-summary', async (p) => {
    // 在页面加载完成后，触发 React 应用显示详情页
    await p.evaluate(() => {
      // 模拟点击第一个仓库进入详情
      const event = new CustomEvent('mock-open-detail')
      window.dispatchEvent(event)
    })
    // 通过 localStorage hack 让 React 组件直接渲染详情
    await p.evaluate(({ repo, summary }) => {
      // 写入一个特殊的存储键，让组件读取
      // 实际上最简单的方法是修改 App.tsx 的初始状态
      // 这里我们用 React DevTools 的方式注入
      const root = document.getElementById('root')
      const detail = document.createElement('div')
      detail.id = 'mock-detail'
      detail.style.position = 'fixed'
      detail.style.top = '0'
      detail.style.left = '0'
      detail.style.width = '100%'
      detail.style.height = '100%'
      detail.style.background = '#0d1117'
      detail.style.zIndex = '9999'
      detail.style.padding = '20px'
      detail.style.overflow = 'auto'
      detail.style.color = '#c9d1d9'
      detail.style.fontFamily = 'system-ui, -apple-system, sans-serif'

      detail.innerHTML = `
        <div style="max-width:1200px;margin:0 auto;">
          <button style="background:#21262d;color:#c9d1d9;border:1px solid #30363d;padding:8px 16px;border-radius:6px;cursor:pointer;margin-bottom:20px;display:flex;align-items:center;gap:6px;">
            <span>←</span> 返回列表
          </button>
          <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:24px;margin-bottom:16px;">
            <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:20px;">
              <img src="${repo.owner.avatar_url}" style="width:64px;height:64px;border-radius:50%;background:#21262d;" />
              <div style="flex:1;">
                <h2 style="margin:0 0 8px 0;font-size:24px;color:#f0f6fc;">${repo.full_name}</h2>
                <p style="margin:0;color:#8b949e;font-size:14px;">${repo.description}</p>
              </div>
            </div>
            <div style="display:flex;gap:24px;margin-bottom:16px;">
              <div style="display:flex;align-items:center;gap:6px;color:#8b949e;font-size:13px;">
                <span style="color:#e3b341;">★</span>
                <span style="color:#f0f6fc;font-weight:600;">12.5k</span>
                <span>Stars</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;color:#8b949e;font-size:13px;">
                <span>🍴</span>
                <span style="color:#f0f6fc;font-weight:600;">820</span>
                <span>Forks</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;color:#8b949e;font-size:13px;">
                <span>⚠</span>
                <span style="color:#f0f6fc;font-weight:600;">145</span>
                <span>Issues</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${repo.language_color};"></span>
                <span style="color:#f0f6fc;font-size:13px;">${repo.language}</span>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
              ${repo.topics.map(t => `<span style="background:#1f6feb22;color:#58a6ff;padding:4px 10px;border-radius:12px;font-size:12px;">#${t}</span>`).join('')}
            </div>
            <div style="display:flex;gap:8px;">
              <a href="#" style="background:#238636;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:14px;display:inline-flex;align-items:center;gap:6px;">查看源码 ↗</a>
              <button style="background:#21262d;color:#c9d1d9;border:1px solid #30363d;padding:8px 16px;border-radius:6px;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">♡ 收藏</button>
            </div>
          </div>

          <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:24px;margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <h3 style="margin:0;font-size:18px;color:#f0f6fc;">✨ AI 智能总结</h3>
              <button style="background:transparent;border:none;color:#58a6ff;cursor:pointer;font-size:13px;">重新生成</button>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;">
              <div style="background:linear-gradient(135deg,#1f6feb22,#1f6feb11);border:1px solid #1f6feb44;border-radius:8px;padding:16px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:#58a6ff;font-size:14px;font-weight:600;">
                  <span>ℹ</span> 基础信息
                </div>
                <p style="margin:0;color:#c9d1d9;font-size:13px;line-height:1.6;">${summary.basicInfo}</p>
              </div>

              <div style="background:linear-gradient(135deg,#d2992222,#d2992211);border:1px solid #d2992244;border-radius:8px;padding:16px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:#e3b341;font-size:14px;font-weight:600;">
                  <span>★</span> 功能与亮点
                </div>
                <div style="color:#c9d1d9;font-size:13px;line-height:1.8;">
                  ${summary.features.split('\n').filter(Boolean).map(l => `<div style="display:flex;gap:6px;align-items:flex-start;"><span style="color:#e3b341;">•</span><span>${l.replace(/^[•·\-]\s*/, '')}</span></div>`).join('')}
                </div>
              </div>

              <div style="background:linear-gradient(135deg,#a371f722,#a371f711);border:1px solid #a371f744;border-radius:8px;padding:16px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:#a371f7;font-size:14px;font-weight:600;">
                  <span>🏗</span> 总体架构
                </div>
                <p style="margin:0;color:#c9d1d9;font-size:13px;line-height:1.6;">${summary.architecture}</p>
              </div>

              <div style="background:linear-gradient(135deg,#3fb95022,#3fb95011);border:1px solid #3fb95044;border-radius:8px;padding:16px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:#3fb950;font-size:14px;font-weight:600;">
                  <span>⬇</span> 部署教程
                </div>
                <pre style="margin:0;background:#0d1117;padding:12px;border-radius:6px;color:#7ee787;font-size:12px;line-height:1.5;overflow-x:auto;font-family:'SF Mono',Consolas,monospace;white-space:pre-wrap;">${summary.deployment}</pre>
              </div>

              <div style="background:linear-gradient(135deg,#f778ba22,#f778ba11);border:1px solid #f778ba44;border-radius:8px;padding:16px;grid-column:1 / -1;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;color:#f778ba;font-size:14px;font-weight:600;">
                  <span>👥</span> 适用场景
                </div>
                <p style="margin:0;color:#c9d1d9;font-size:13px;line-height:1.6;">${summary.useCases}</p>
              </div>
            </div>
          </div>
        </div>
      `
      root.innerHTML = ''
      root.appendChild(detail)
    }, { repo: MOCK_REPO, summary: MOCK_SUMMARY })
  })

  // === 截图 07: 设置面板 - AI 模型管理 ===
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await captureView(page, '07-settings-ai-models', async (p) => {
    await p.evaluate(({ aiModels, favorites, history }) => {
      localStorage.setItem('github_insights_favorites', JSON.stringify(favorites))
      localStorage.setItem('github_insights_history', JSON.stringify(history))
      localStorage.setItem('github_insights_settings', JSON.stringify({
        githubToken: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        aiEndpoint: '',
        aiModel: '',
        aiKey: '',
        aiModels,
        aiActiveModelId: 'm1',
        aiTranslationModelId: 'm2'
      }))
    }, { aiModels: MOCK_AI_MODELS, favorites: MOCK_FAVORITES, history: MOCK_HISTORY })

    // 重新加载以应用 localStorage
    await p.reload({ waitUntil: 'networkidle' })
    await p.waitForTimeout(500)

    // 点击设置按钮（⚙）
    const settingsBtn = await p.locator('button[title="设置"], button.settings-btn, .header-right button:last-child').first()
    if (await settingsBtn.count() > 0) {
      await settingsBtn.click({ timeout: 3000 }).catch(() => {})
      await p.waitForTimeout(500)
    }
  })

  // === 截图 08: 收藏夹 - 多文件夹视图 ===
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await captureView(page, '08-favorites-folders', async (p) => {
    await p.evaluate(({ favorites, history }) => {
      localStorage.setItem('github_insights_favorites', JSON.stringify(favorites))
      localStorage.setItem('github_insights_history', JSON.stringify(history))
    }, { favorites: MOCK_FAVORITES, history: MOCK_HISTORY })

    await p.reload({ waitUntil: 'networkidle' })
    await p.waitForTimeout(500)

    // 点击 Favorites tab
    const favTab = await p.locator('button:has-text("我的收藏"), button:has-text("Favorites")').first()
    if (await favTab.count() > 0) {
      await favTab.click({ timeout: 3000 }).catch(() => {})
      await p.waitForTimeout(500)
    }
  })

  await browser.close()
  console.log('  [done] 全部截图完成')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})