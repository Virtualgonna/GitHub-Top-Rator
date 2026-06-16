import { getTranslationConfig } from './store'
import type { AIConfig } from './store'
import { resolveUrl } from './utils'

export interface Repo {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  stargazers_count: number
  language: string | null
  language_color?: string | null
  owner: {
    login: string
    avatar_url: string
  }
  topics?: string[]
  created_at: string
  updated_at: string
  pushed_at: string
  forks_count: number
  open_issues_count: number
  /** 不同周期的Star增长数 */
  stars_today?: number
  stars_week?: number
  stars_month?: number
}

export interface Developer {
  rank: number
  username: string
  display_name: string
  avatar_url: string
  profile_url: string
  popular_repo: {
    name: string
    full_name: string
    url: string
    description: string
  }
}

const GITHUB_API = '/github-api/search/repositories'

/**
 * GitHub Token 获取策略：
 * 1. 优先使用用户在设置中保存的 Token（localStorage `github_insights_settings.githubToken`）
 * 2. 兜底使用 localStorage 旧版键 `github_token`（兼容历史数据）
 * 3. 未配置时返回空串，由调用方决定如何处理（公开仓库仍可访问，但有严格速率限制）
 *
 * 注意：出于安全考虑，本项目不内置任何 Token。请在「设置 → Personal Access Token」
 * 中填入你自己的 Token（建议使用 Fine-grained token，仅勾选 public_repo）。
 * 获取地址：https://github.com/settings/tokens/new?scopes=public_repo
 */
export function getGitHubToken(): string {
  try {
    const settingsRaw = localStorage.getItem('github_insights_settings')
    if (settingsRaw) {
      const parsed = JSON.parse(settingsRaw)
      if (parsed && typeof parsed.githubToken === 'string' && parsed.githubToken.trim()) {
        return parsed.githubToken.trim()
      }
    }
  } catch { /* ignore */ }
  const legacy = localStorage.getItem('github_token')
  return (legacy || '').trim()
}

async function searchRepos(query: string, perPage = 10): Promise<Repo[]> {
  const url = `${GITHUB_API}?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`
  const token = getGitHubToken()
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(resolveUrl(url), { headers })
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error('GitHub API 速率限制：请配置 GitHub Personal Access Token 以提高限额（设置 → Token）')
    }
    const errText = await res.text()
    throw new Error(`GitHub API 错误 (${res.status}): ${errText}`)
  }
  const data = await res.json()
  return data.items as Repo[]
}

/* ─── 常用编程语言列表 ───────────────────────────────────────────────── */

export const LANGUAGES = [
  '', 'TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Java',
  'C++', 'C', 'C#', 'Swift', 'Kotlin', 'Ruby', 'PHP', 'Dart',
  'Shell', 'Vue', 'HTML', 'CSS', 'Zig', 'Scala', 'Elixir',
  'Haskell', 'Lua', 'R', 'Perl', 'Objective-C', 'Assembly',
]

/* ─── 内存缓存 ──────────────────────────────────────────────────────── */

const cache = new Map<string, { data: Repo[]; ts: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 分钟

function getCached(key: string): Repo[] | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data
  cache.delete(key)
  return null
}

function setCache(key: string, data: Repo[]) {
  cache.set(key, { data, ts: Date.now() })
}

/* ─── GitHub Trending HTML Scraping ───────────────────────────────────── */

function parseNumber(str: string): number {
  return parseInt(str.replace(/,/g, ''), 10) || 0
}

/**
 * 通过 Vite proxy 抓取 GitHub Trending HTML
 */
async function fetchTrendingHtml(
  page: 'repos' | 'developers',
  period: 'today' | 'week' | 'month',
  language?: string
): Promise<string> {
  const sinceMap = { today: 'daily', week: 'weekly', month: 'monthly' }
  const since = sinceMap[period]
  const lang = language ? encodeURIComponent(language.toLowerCase()) : ''
  const basePath = page === 'developers' ? '/github-trending/trending/developers' : `/github-trending/trending${lang ? `/${lang}` : ''}`
  const url = `${basePath}?since=${since}`

  const res = await fetch(resolveUrl(url), { headers: { 'Accept': 'text/html' } })
  if (!res.ok) {
    throw new Error(`GitHub Trending 页面访问失败 (${res.status})`)
  }
  return res.text()
}

/**
 * 解析 GitHub Trending Repos HTML
 */
function parseTrendingRepos(html: string, period: 'today' | 'week' | 'month'): Repo[] {
  const repos: Repo[] = []
  const rowRegex = /<article class="Box-row">([\s\S]*?)<\/article>/g
  let match
  let rank = 0

  while ((match = rowRegex.exec(html)) !== null) {
    rank++
    const row = match[1]

    // 项目名
    const nameMatch = row.match(/<h2[^>]*>[\s\S]*?href="\/([^"]+)"/)
    if (!nameMatch) continue
    const fullName = nameMatch[1].trim().replace(/\s+/g, '')
    const [owner, name] = fullName.split('/')
    if (!owner || !name) continue

    // 描述
    const descMatch = row.match(/<p class="col-9[^"]*">\s*([\s\S]*?)\s*<\/p>/)
    const description = descMatch ? descMatch[1].trim().replace(/<[^>]*>/g, '') : ''

    // 语言
    const langMatch = row.match(/itemprop="programmingLanguage">(.*?)</)
    const language = langMatch ? langMatch[1].trim() : null

    // 语言颜色
    const colorMatch = row.match(/repo-language-color"[^>]*style="background-color:\s*([^"]+)"/)
    const language_color = colorMatch ? colorMatch[1] : null

    // 总 Star
    const starsMatch = row.match(/href="\/[^"]+\/stargazers"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/)
    const stars = starsMatch ? parseNumber(starsMatch[1]) : 0

    // Fork
    const forksMatch = row.match(/href="\/[^"]+\/forks"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/)
    const forks = forksMatch ? parseNumber(forksMatch[1]) : 0

    // 增长数
    const growthMatch = row.match(/([\d,]+)\s*stars?\s*(today|this week|this month)/i)
    const growth = growthMatch ? parseNumber(growthMatch[1]) : 0

    repos.push({
      id: rank,
      name,
      full_name: fullName,
      html_url: `https://github.com/${fullName}`,
      description,
      stargazers_count: stars,
      language,
      language_color,
      owner: {
        login: owner,
        avatar_url: `https://github.com/${owner}.png`,
      },
      topics: [],
      created_at: '',
      updated_at: '',
      pushed_at: '',
      forks_count: forks,
      open_issues_count: 0,
      stars_today: period === 'today' ? growth : 0,
      stars_week: period === 'week' ? growth : 0,
      stars_month: period === 'month' ? growth : 0,
    })
  }

  return repos
}

/**
 * 解析 GitHub Trending Developers HTML
 */
function parseTrendingDevelopers(html: string): Developer[] {
  const developers: Developer[] = []
  const rowRegex = /<article class="Box-row d-flex"[\s\S]*?(?:id="pa-([^"]+)")?[^>]*>([\s\S]*?)<\/article>/g
  let match
  let rank = 0

  while ((match = rowRegex.exec(html)) !== null) {
    rank++
    const row = match[2]

    // 跳过嵌套的 article（popular repo）
    if (row.match(/POPULAR REPO/i) && !row.match(/<h1 class="h3/i)) continue

    // 头像
    const avatarMatch = row.match(/<img[^>]*class="[^"]*avatar[^"]*"[^>]*src="([^"]+)"/)
    const avatar_url = avatarMatch ? avatarMatch[1].replace(/&amp;/g, '&').split('?')[0] : ''

    // 显示名
    const nameMatch = row.match(/<h1[^>]*class="[^"]*h3[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)
    const display_name = nameMatch ? nameMatch[1].trim().replace(/<[^>]*>/g, '').trim() : ''

    // 用户名
    const usernameMatch = row.match(/<p[^>]*class="[^"]*f4[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)
    const username = usernameMatch ? usernameMatch[1].trim().replace(/<[^>]*>/g, '').trim() : ''
    if (!username && !display_name) continue

    // 热门仓库
    const popRepoMatch = row.match(/<article[\s\S]*?<h1[^>]*class="[^"]*h4[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div[^>]*class="[^"]*f6[^"]*"[^>]*>([\s\S]*?)<\/div>/)
    let popular_repo: Developer['popular_repo'] = {
      name: '', full_name: '', url: '', description: ''
    }
    if (popRepoMatch) {
      const repoUrl = popRepoMatch[1].trim()
      const repoFullName = popRepoMatch[2].trim().replace(/<[^>]*>/g, '').trim()
      const repoDesc = popRepoMatch[3].trim().replace(/<[^>]*>/g, '').trim()
      const parts = repoFullName.split('/')
      popular_repo = {
        name: parts.length > 1 ? parts[parts.length - 1].trim() : repoFullName,
        full_name: repoFullName,
        url: `https://github.com${repoUrl}`,
        description: repoDesc,
      }
    }

    developers.push({
      rank,
      username: username || display_name.toLowerCase().replace(/\s+/g, '-'),
      display_name: display_name || username,
      avatar_url: avatar_url || `https://github.com/${username}.png`,
      profile_url: `https://github.com/${username}`,
      popular_repo,
    })
  }

  return developers
}

/* ─── 全站 / 2026 新建项目排行（GitHub Search API） ─────────────────────── */

/**
 * 2026 年以来新建项目，Star 总数 TOP 20
 * 使用 Search API 查询：created:>=2026-01-01 stars:>10
 */
export async function fetchNewRepos2026(): Promise<Repo[]> {
  const cacheKey = 'top-repos:new2026'
  const cached = getCached(cacheKey)
  if (cached) return cached

  const result = await searchRepos('created:>=2026-01-01 stars:>10', 20)
  setCache(cacheKey, result)
  return result
}

/**
 * GitHub 全站 Star 总数 TOP 20（不限制创建时间）
 * 使用 Search API 查询：stars:>1000（阈值过滤低 Star 噪音仓库）
 */
export async function fetchTopStarRepos(): Promise<Repo[]> {
  const cacheKey = 'top-repos:alltime'
  const cached = getCached(cacheKey)
  if (cached) return cached

  const result = await searchRepos('stars:>1000', 20)
  setCache(cacheKey, result)
  return result
}

/* ─── Trending 数据获取（主入口） ─────────────────────────────────── */

/**
 * 通过 Search API 补充 Trending 项目的详细信息（topics, created_at 等）
 */
async function enrichRepos(repos: Repo[]): Promise<Repo[]> {
  if (repos.length === 0) return repos
  const token = getGitHubToken()
  const names = repos.map(r => r.full_name)
  const batchSize = 5
  const enriched = new Map<string, Repo>()

  for (let i = 0; i < names.length; i += batchSize) {
    const batch = names.slice(i, i + batchSize)
    const query = batch.map(n => `repo:${n}`).join(' ')
    try {
      const url = `${GITHUB_API}?q=${encodeURIComponent(query)}&per_page=${batchSize}`
      const headers: Record<string, string> = { 'Accept': 'application/vnd.github+json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(resolveUrl(url), { headers })
      if (res.ok) {
        const data = await res.json()
        for (const item of data.items || []) {
          enriched.set(item.full_name, item)
        }
      }
    } catch { /* ignore */ }
  }

  return repos.map(repo => {
    const apiData = enriched.get(repo.full_name)
    if (apiData) {
      return {
        ...repo,
        topics: apiData.topics || [],
        created_at: apiData.created_at || repo.created_at,
        updated_at: apiData.updated_at || repo.updated_at,
        pushed_at: apiData.pushed_at || repo.pushed_at,
        open_issues_count: apiData.open_issues_count || 0,
        stargazers_count: apiData.stargazers_count || repo.stargazers_count,
        forks_count: apiData.forks_count || repo.forks_count,
        description: repo.description || apiData.description || null,
      }
    }
    return repo
  })
}

/**
 * 获取 Trending Repos（通过 HTML Scraping，秒级响应）
 */
export async function fetchTrending(
  period: 'today' | 'week' | 'month',
  language?: string,
  _limit = 20
): Promise<Repo[]> {
  const cacheKey = `trending-repos:${period}:${language || ''}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const html = await fetchTrendingHtml('repos', period, language)
  const repos = parseTrendingRepos(html, period)

  if (repos.length === 0) {
    // HTML 解析失败，回退到 Search API
    const now = new Date()
    const daysBack = period === 'today' ? 1 : period === 'week' ? 7 : 30
    const dateOffset = new Date(now.getTime() - daysBack * 86400000)
    const dateStr = dateOffset.toISOString().split('T')[0]
    let query = `pushed:>${dateStr} stars:>10`
    if (language) query += ` language:${language}`
    return searchRepos(query, 20)
  }

  // 补充详细信息（topics, created_at）
  const enriched = await enrichRepos(repos.slice(0, 30))

  // 按 Star 增长数降序排序（GitHub Trending 页面原始排序不准确）
  const growthKey = period === 'today' ? 'stars_today' : period === 'week' ? 'stars_week' : 'stars_month'
  enriched.sort((a, b) => (b[growthKey] ?? 0) - (a[growthKey] ?? 0))

  const result = enriched.slice(0, 20)
  setCache(cacheKey, result)
  return result
}

/* ─── Developers 数据缓存 ──────────────────────────────────────────── */

const devCache = new Map<string, { data: Developer[]; ts: number }>()

function getDevCached(key: string): Developer[] | null {
  const entry = devCache.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data
  devCache.delete(key)
  return null
}

/**
 * 获取 Trending Developers（通过 HTML Scraping，秒级响应）
 */
export async function fetchTrendingDevelopers(
  period: 'today' | 'week' | 'month'
): Promise<Developer[]> {
  const cacheKey = `trending-devs:${period}`
  const cached = getDevCached(cacheKey)
  if (cached) return cached

  const html = await fetchTrendingHtml('developers', period)
  const developers = parseTrendingDevelopers(html)

  if (developers.length > 0) {
    devCache.set(cacheKey, { data: developers, ts: Date.now() })
  }
  return developers
}

/* ─── README 获取 ────────────────────────────────────────────────────── */

/**
 * 获取项目的 README 内容（纯文本）
 * 依次尝试：用户配置 Token → 旧版 localStorage 键 → 无 Token（公开仓库公开接口）
 */
export async function fetchReadme(fullName: string): Promise<string> {
  const tokens: string[] = []
  const configured = getGitHubToken()
  if (configured) tokens.push(configured)
  const legacy = localStorage.getItem('github_token')
  if (legacy && !tokens.includes(legacy)) tokens.push(legacy)
  // 公开仓库的 README 本身不需要 Token，最后再尝试一次匿名请求
  tokens.push('')

  for (const token of tokens) {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.raw+json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    try {
      const res = await fetch(
        resolveUrl(`/github-api/repos/${fullName}/readme`),
        { headers }
      )
      if (res.ok) {
        return await res.text()
      }
      if (res.status === 401 || res.status === 403) {
        // Token 无效或过期，尝试下一个
        continue
      }
      // 其他错误（404 等）直接抛出
      throw new Error(`无法获取 README (${res.status})`)
    } catch (err) {
      // 网络错误，尝试下一个
      if (token === tokens[tokens.length - 1]) {
        throw err
      }
    }
  }
  throw new Error('无法获取 README：所有 Token 均无效')
}

/* ─── 格式化 ─────────────────────────────────────────────────────────── */

export function formatNumber(n: number): string {
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  }
  return String(n)
}

/* ─── 翻译 ───────────────────────────────────────────────────────────── */

/** 常见技术关键词中英映射 */
const TOPIC_ZH: Record<string, string> = {
  'machine-learning': '机器学习', 'deep-learning': '深度学习', 'artificial-intelligence': '人工智能',
  'ai': '人工智能', 'llm': '大语言模型', 'gpt': 'GPT', 'chatgpt': 'ChatGPT',
  'python': 'Python', 'javascript': 'JavaScript', 'typescript': 'TypeScript',
  'react': 'React', 'vue': 'Vue', 'nextjs': 'Next.js', 'nodejs': 'Node.js',
  'rust': 'Rust', 'golang': 'Go', 'docker': 'Docker', 'kubernetes': 'Kubernetes',
  'api': 'API', 'rest-api': 'REST API', 'graphql': 'GraphQL',
  'database': '数据库', 'redis': 'Redis', 'mongodb': 'MongoDB', 'postgresql': 'PostgreSQL',
  'cli': '命令行工具', 'terminal': '终端', 'devops': 'DevOps', 'ci-cd': 'CI/CD',
  'web': 'Web开发', 'frontend': '前端', 'backend': '后端', 'fullstack': '全栈',
  'mobile': '移动端', 'android': 'Android', 'ios': 'iOS', 'flutter': 'Flutter',
  'game': '游戏', 'blockchain': '区块链', 'crypto': '加密货币',
  'security': '安全', 'authentication': '身份验证', 'oauth': 'OAuth',
  'testing': '测试', 'automation': '自动化', 'scraper': '爬虫',
  'data-science': '数据科学', 'data-analysis': '数据分析', 'visualization': '可视化',
  'nlp': '自然语言处理', 'computer-vision': '计算机视觉', 'transformer': 'Transformer',
  'agent': '智能体', 'ai-agent': 'AI智能体', 'ai-agents': 'AI智能体',
  'rag': 'RAG检索增强', 'fine-tuning': '微调', 'reinforcement-learning': '强化学习',
  'compiler': '编译器', 'interpreter': '解释器', 'language': '编程语言',
  'framework': '框架', 'library': '库', 'tool': '工具', 'sdk': 'SDK',
  'tutorial': '教程', 'awesome': '精选列表', 'list': '列表', 'resources': '资源',
  'open-source': '开源', 'self-hosted': '自托管', 'privacy': '隐私',
  'monitoring': '监控', 'logging': '日志', 'observability': '可观测性',
  'microservices': '微服务', 'serverless': '无服务器', 'cloud': '云计算',
  'linux': 'Linux', 'windows': 'Windows', 'macos': 'macOS',
  'chrome-extension': '浏览器扩展', 'vscode': 'VS Code插件',
  'image': '图像处理', 'video': '视频处理', 'audio': '音频处理',
  'chat': '聊天', 'messaging': '消息', 'social': '社交',
  'design': '设计', 'ui': 'UI组件', 'components': '组件库',
  'documentation': '文档', 'markdown': 'Markdown', 'wiki': '知识库',
  'robotics': '机器人', 'iot': '物联网', 'embedded': '嵌入式',
  'quantum': '量子计算', 'science': '科学计算',
  'productivity': '效率工具', 'notes': '笔记', 'task-management': '任务管理',
  'editor': '编辑器', 'ide': 'IDE', 'code-editor': '代码编辑器',
  'browser': '浏览器', 'search': '搜索引擎', 'crawler': '爬虫',
  'neural-network': '神经网络', 'diffusion': '扩散模型', 'generative-ai': '生成式AI',
  'stable-diffusion': 'Stable Diffusion', 'text-to-image': '文生图',
  'speech-to-text': '语音识别', 'text-to-speech': '语音合成',
  'coding-assistant': '编程助手', 'copilot': '代码副驾驶',
  'dataset': '数据集', 'benchmark': '基准测试', 'evaluation': '评估',
  'model': '模型', 'pretrained': '预训练', 'inference': '推理',
  'deployment': '部署', 'hosting': '托管', 'saas': 'SaaS',
  'analytics': '分析', 'dashboard': '仪表盘', 'charts': '图表',
  'animation': '动画', '3d': '3D', 'webgl': 'WebGL', 'three-js': 'Three.js',
  'css': 'CSS', 'tailwind': 'Tailwind', 'sass': 'Sass',
  'electron': 'Electron', 'tauri': 'Tauri', 'desktop': '桌面应用',
  'apple-intelligence': 'Apple智能', 'anthropic': 'Anthropic', 'claude': 'Claude',
  'openai': 'OpenAI', 'gemini': 'Gemini', 'llama': 'LLaMA',
  'mcp': '模型上下文协议', 'function-calling': '函数调用',
  'embedding': '嵌入向量', 'vector-database': '向量数据库',
  'prompt-engineering': '提示工程', 'chain-of-thought': '思维链',
  'multi-agent': '多智能体', 'autonomous': '自主智能体',
}

/** 翻译单个 topic 关键词 */
export function translateTopic(topic: string): string {
  const lower = topic.toLowerCase()
  return TOPIC_ZH[lower] || topic
}

/** 使用 AI API 翻译（如果已配置） */
async function translateWithAI(text: string, config: AIConfig): Promise<string | null> {
  try {
    const res = await fetch(resolveUrl(config.endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '你是专业翻译，请将以下英文翻译为流畅的中文。只输出翻译结果，不要添加任何解释。' },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.choices?.[0]?.message?.content || null
  } catch {
    return null
  }
}

/** 使用 MyMemory 免费API翻译英文描述为中文 */
async function translateWithMyMemory(text: string): Promise<string> {
  try {
    const url = resolveUrl(`/mymemory-api/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=en|zh-CN`)
    const res = await fetch(url)
    if (!res.ok) return text
    const data = await res.json()
    const translated = data?.responseData?.translatedText
    if (translated && translated !== text && translated.length > 0) {
      return translated
    }
    return text
  } catch {
    return text
  }
}

/**
 * 翻译英文描述为中文
 * 优先使用已配置的 AI 模型，如果未配置或失败则使用免费 MyMemory API
 */
export async function translateToChinese(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text
  if (/[\u4e00-\u9fff]/.test(text)) return text

  // 1. 尝试使用 AI 翻译（如果已配置）
  const aiConfig = getTranslationConfig()
  if (aiConfig && aiConfig.apiKey && aiConfig.endpoint) {
    const aiResult = await translateWithAI(text, aiConfig)
    if (aiResult) return aiResult
  }

  // 2. 回退到 MyMemory 免费 API
  return translateWithMyMemory(text)
}

/** 批量翻译 repos 的描述 */
export async function translateRepos(repos: Repo[]): Promise<Repo[]> {
  const translated = await Promise.all(
    repos.map(async (repo) => ({
      ...repo,
      description: repo.description ? await translateToChinese(repo.description) : null,
    }))
  )
  return translated
}


