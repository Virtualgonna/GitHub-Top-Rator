// ─── localStorage 封装：收藏夹、足迹、配置 ─────────────────────────────

import type { Repo } from './github'

/* ─── 类型定义 ─────────────────────────────────────────────────────────── */

export type FavoriteFolder = {
  id: string
  name: string
  repos: Repo[]
}

export type HistoryEntry = {
  repoId: number
  repo: Repo
  viewedAt: string
}

export type AIConfig = {
  endpoint: string
  apiKey: string
  model: string
}

/** AI 提供商预设 */
export type AIProviderPreset = {
  id: string
  name: string
  endpoint: string
  models: string[]
  /** 是否使用 GitHub Token 而非独立 API Key */
  useGitHubToken?: boolean
}

/** 用户保存的模型配置 */
export type AIModelEntry = {
  id: string
  providerId: string      // 对应 provider 的 id
  name: string             // 用户给模型取的别名
  model: string            // 实际模型 ID
  endpoint: string         // API endpoint
  apiKey: string           // API Key
}

export type AppSettings = {
  githubToken: string
  /** 旧字段保留兼容 */
  aiEndpoint: string
  aiModel: string
  aiKey: string
  /** 新增：模型列表 */
  aiModels: AIModelEntry[]
  /** 新增：当前激活的模型 ID（用于 AI 智能总结） */
  aiActiveModelId: string | null
  /** 翻译模型 ID（用于描述翻译，null 表示使用免费 MyMemory API） */
  aiTranslationModelId: string | null
}

/* ─── 收藏夹 ───────────────────────────────────────────────────────────── */

const FAVORITES_KEY = 'github_insights_favorites'

export function getFavoriteFolders(): FavoriteFolder[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return raw ? JSON.parse(raw) : [{ id: 'default', name: '默认收藏夹', repos: [] }]
  } catch {
    return [{ id: 'default', name: '默认收藏夹', repos: [] }]
  }
}

export function saveFavoriteFolders(folders: FavoriteFolder[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(folders))
  window.dispatchEvent(new Event('favorites-changed'))
}

export function addRepoToFolder(folderId: string, repo: Repo) {
  const folders = getFavoriteFolders()
  const folder = folders.find(f => f.id === folderId)
  if (folder && !folder.repos.some(r => r.id === repo.id)) {
    folder.repos.push(repo)
    saveFavoriteFolders(folders)
  }
}

export function removeRepoFromFolder(folderId: string, repoId: number) {
  const folders = getFavoriteFolders()
  const folder = folders.find(f => f.id === folderId)
  if (folder) {
    folder.repos = folder.repos.filter(r => r.id !== repoId)
    saveFavoriteFolders(folders)
  }
}

export function createFolder(name: string): FavoriteFolder {
  const folders = getFavoriteFolders()
  const newFolder: FavoriteFolder = { id: Date.now().toString(36), name, repos: [] }
  folders.push(newFolder)
  saveFavoriteFolders(folders)
  return newFolder
}

export function deleteFolder(folderId: string) {
  const folders = getFavoriteFolders().filter(f => f.id !== folderId)
  saveFavoriteFolders(folders)
}

export function renameFolder(folderId: string, newName: string) {
  const folders = getFavoriteFolders()
  const folder = folders.find(f => f.id === folderId)
  if (folder) {
    folder.name = newName
    saveFavoriteFolders(folders)
  }
}

export function isRepoFavorited(repoId: number): boolean {
  const folders = getFavoriteFolders()
  return folders.some(f => f.repos.some(r => r.id === repoId))
}

/* ─── 足迹 ─────────────────────────────────────────────────────────────── */

const HISTORY_KEY = 'github_insights_history'
const MAX_HISTORY = 200

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addHistoryEntry(repo: Repo) {
  let history = getHistory()
  // 移除重复
  history = history.filter(h => h.repoId !== repo.id)
  // 添加到顶部
  history.unshift({ repoId: repo.id, repo, viewedAt: new Date().toISOString() })
  // 截断
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

export function removeHistoryEntry(repoId: number) {
  const history = getHistory().filter(h => h.repoId !== repoId)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

/* ─── 配置 ─────────────────────────────────────────────────────────────── */

const SETTINGS_KEY = 'github_insights_settings'

const DEFAULT_SETTINGS: AppSettings = {
  githubToken: '',
  aiEndpoint: '',
  aiModel: '',
  aiKey: '',
  aiModels: [],
  aiActiveModelId: null,
  aiTranslationModelId: null,
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

/** 预设提供商列表 */
export const AI_PROVIDERS: AIProviderPreset[] = [
  {
    id: 'github-models',
    name: 'GitHub Models',
    endpoint: '/ai-models/chat/completions',
    models: ['gpt-4o-mini', 'gpt-4o', 'phi-4', 'Llama-3.3-70B-Instruct', 'DeepSeek-R1'],
    useGitHubToken: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o3-mini'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    models: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414', 'claude-3-5-sonnet-20241022'],
  },
  {
    id: 'qwen',
    name: '通义千问',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
  },
  {
    id: 'doubao',
    name: '火山引擎豆包',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    models: ['doubao-pro-32k', 'doubao-lite-32k'],
  },
  {
    id: 'custom',
    name: '自定义',
    endpoint: '',
    models: [],
  },
]

/** 获取提供商预设 */
export function getProvider(id: string): AIProviderPreset | undefined {
  return AI_PROVIDERS.find(p => p.id === id)
}

/** 生成模型 ID */
function genModelId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/** 获取所有已保存模型 */
export function getAIModels(): AIModelEntry[] {
  return getSettings().aiModels || []
}

/** 添加模型 */
export function addAIModel(entry: Omit<AIModelEntry, 'id'>): AIModelEntry {
  const s = getSettings()
  const models = s.aiModels || []
  const newEntry: AIModelEntry = { ...entry, id: genModelId() }
  models.push(newEntry)
  s.aiModels = models
  // 如果是第一个模型，自动设为激活
  if (models.length === 1) s.aiActiveModelId = newEntry.id
  saveSettings(s)
  return newEntry
}

/** 更新模型 */
export function updateAIModel(id: string, patch: Partial<AIModelEntry>) {
  const s = getSettings()
  const models = s.aiModels || []
  const idx = models.findIndex(m => m.id === id)
  if (idx >= 0) {
    models[idx] = { ...models[idx], ...patch }
    s.aiModels = models
    saveSettings(s)
  }
}

/** 删除模型 */
export function deleteAIModel(id: string) {
  const s = getSettings()
  s.aiModels = (s.aiModels || []).filter(m => m.id !== id)
  if (s.aiActiveModelId === id) {
    s.aiActiveModelId = s.aiModels.length > 0 ? s.aiModels[0].id : null
  }
  saveSettings(s)
}

/** 设置激活模型 */
export function setActiveAIModel(id: string | null) {
  const s = getSettings()
  s.aiActiveModelId = id
  saveSettings(s)
}

export function getAIConfig(): AIConfig {
  const s = getSettings()

  // 1. 优先使用新模型系统
  const models = s.aiModels || []
  const activeId = s.aiActiveModelId
  const activeModel = activeId ? models.find(m => m.id === activeId) : models[0]

  if (activeModel) {
    // 如果提供商使用 GitHub Token
    const provider = getProvider(activeModel.providerId)
    if (provider?.useGitHubToken) {
      const ghToken = s.githubToken || localStorage.getItem('github_token') || ''
      if (ghToken) {
        return { endpoint: activeModel.endpoint, apiKey: ghToken, model: activeModel.model }
      }
    }
    if (activeModel.apiKey) {
      return { endpoint: activeModel.endpoint, apiKey: activeModel.apiKey, model: activeModel.model }
    }
  }

  // 2. 兜底：旧配置
  if (s.aiKey && s.aiEndpoint) {
    return { endpoint: s.aiEndpoint, apiKey: s.aiKey, model: s.aiModel }
  }

  // 3. 兜底：GitHub Models（复用 GitHub Token）
  const githubToken = s.githubToken || localStorage.getItem('github_token') || ''
  if (githubToken) {
    return {
      endpoint: '/ai-models/chat/completions',
      apiKey: githubToken,
      model: 'gpt-4o-mini',
    }
  }

  return { endpoint: '', apiKey: '', model: '' }
}

/** 设置翻译模型（null 表示使用免费 MyMemory API） */
export function setTranslationModel(id: string | null) {
  const s = getSettings()
  s.aiTranslationModelId = id
  saveSettings(s)
}

/**
 * 获取翻译用的 AI 配置
 * 返回 null 表示应使用免费 MyMemory API
 */
export function getTranslationConfig(): AIConfig | null {
  const s = getSettings()
  const translationId = s.aiTranslationModelId
  if (!translationId) return null

  const models = s.aiModels || []
  const model = models.find(m => m.id === translationId)
  if (!model) return null

  // 如果提供商使用 GitHub Token
  const provider = getProvider(model.providerId)
  if (provider?.useGitHubToken) {
    const ghToken = s.githubToken || localStorage.getItem('github_token') || ''
    if (ghToken) {
      return { endpoint: model.endpoint, apiKey: ghToken, model: model.model }
    }
  }

  if (model.apiKey) {
    return { endpoint: model.endpoint, apiKey: model.apiKey, model: model.model }
  }

  return null
}
