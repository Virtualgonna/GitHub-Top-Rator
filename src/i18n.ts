// ─── 国际化 (i18n) ───────────────────────────────────────────────────────
import { createContext, useContext, useState, useCallback } from 'react'

export type Lang = 'zh' | 'en'

const zh: Record<string, string> = {
  // ── App 导航 ──
  'nav.favorites': '我的收藏',
  'nav.history': '浏览足迹',
  'nav.settings': '设置',

  // ── 通用 ──
  'common.today': '今日',
  'common.week': '本周',
  'common.month': '本月',
  'common.retry': '重试',
  'common.save': '保存',
  'common.cancel': '取消',
  'common.done': '完成',
  'common.edit': '编辑',
  'common.delete': '删除',
  'common.loading': '加载中...',
  'common.error': '错误',

  // ── TrendingList ──
  'trending.allLangs': '所有语言',
  'trending.allCategories': '所有分类',
  'trending.refreshing': '刷新中...',
  'trending.refresh': '刷新数据',
  'trending.reposCount': '{n} 个项目',
  'trending.fetching': '正在获取 Trending 数据...',
  'trending.translating': '正在翻译描述...',
  'trending.loadFailed': '加载失败',
  'trending.clickRefresh': '点击「刷新数据」开始加载 Trending 榜单',
  'trending.rankedBy': '排名按 {period} Star 增长数量排序',
  'trending.noMatch': '暂无符合条件的数据',
  'trending.created': '创建于',
  'trending.active': '活跃于',
  'trending.createdTime': '创建时间',
  'trending.lastActive': '最后活跃',
  'trending.favorite': '收藏',
  'trending.unfavorite': '取消收藏',
  'trending.chooseFolder': '选择收藏夹',
  'trending.newFolder': '新建收藏夹...',

  // ── TrendingDevelopers ──
  'dev.fetching': '正在获取 Trending Developers...',
  'dev.clickRefresh': '点击「刷新数据」开始加载 Trending Developers',
  'dev.noData': '暂无数据',
  'dev.count': '{n} 位开发者',
  'dev.popularRepo': '热门仓库',

  // ── RepoDetail ──
  'detail.backToList': '返回列表',
  'detail.viewSource': '查看源码',
  'detail.favorited': '已收藏',
  'detail.favorite': '收藏',
  'detail.unfavorite': '取消收藏',
  'detail.chooseFolder': '选择收藏夹',
  'detail.newFolder': '新建收藏夹...',
  'detail.createdTime': '创建时间',
  'detail.lastActive': '最后活跃',
  'detail.aiSummary': 'AI 智能总结',
  'detail.regenerate': '重新生成',
  'detail.summaryFailed': '总结失败',
  'detail.loadingReadme': '正在加载 README...',
  'detail.readmeError': '无法加载 README',
  'detail.noReadme': '暂无 README 内容',
  'detail.noReadmeFile': '该项目没有 README 文件',
  'detail.readmeLoaded': 'README 已加载',
  'detail.generateSummary': '生成 AI 总结',
  'detail.analyzing': 'AI 正在深度分析项目文档...',
  'detail.basicInfo': '基础信息',
  'detail.features': '功能与亮点',
  'detail.architecture': '总体架构',
  'detail.deployment': '部署教程',
  'detail.useCases': '适用场景',
  'detail.checkAIConfig': '请检查 AI 模型配置（设置 → AI 模型 → 添加并激活模型）',
  'detail.collapseReadme': '收起原始 README',
  'detail.expandReadme': '展开原始 README',
  'detail.configureAI': '请在设置中配置 AI 模型以启用智能总结',
  'detail.summarizing': 'AI 正在分析...',

  // ── Favorites ──
  'fav.title': '收藏夹',
  'fav.rename': '重命名',
  'fav.delete': '删除',
  'fav.newFolder': '新建收藏夹...',
  'fav.noRepos': '暂无收藏项目',
  'fav.noReposHint': '在 Trending 列表中点击心形图标即可收藏',
  'fav.confirmDelete': '确定要删除该收藏夹吗？',
  'fav.moveTo': '移动到...',
  'fav.moveTitle': '移动到',
  'fav.unfavorite': '取消收藏',

  // ── History ──
  'hist.title': '浏览足迹',
  'hist.clearAll': '清空记录',
  'hist.confirmClear': '确定要清空所有浏览记录吗？',
  'hist.noHistory': '暂无浏览记录',
  'hist.noHistoryHint': '浏览 Trending 列表中的项目后，会自动记录在这里',
  'hist.viewed': '浏览于',
  'hist.favorited': '已收藏',
  'hist.addToFav': '加入收藏',
  'hist.removeEntry': '移除记录',

  // ── Settings ──
  'settings.title': '设置',
  'settings.githubConfig': 'GitHub 配置',
  'settings.getToken': '获取 Token',
  'settings.rateLimit': '匿名：10次/分钟 · 认证：30次/分钟，GraphQL 5000次/小时',
  'settings.aiModels': 'AI 模型',
  'settings.addModel': '添加模型',
  'settings.noModels': '尚未添加任何 AI 模型',
  'settings.noModelsHint': '添加模型后可使用 AI 智能总结功能。推荐使用 GitHub Models（免费）。',
  'settings.active': '激活',
  'settings.translation': '翻译',
  'settings.activate': '激活（用于 AI 智能总结）',
  'settings.setTranslation': '设为翻译模型',
  'settings.unsetTranslation': '取消翻译模型（使用免费 MyMemory API）',
  'settings.editModel': '编辑模型',
  'settings.editModelTitle': '编辑模型',
  'settings.addModelTitle': '添加模型',
  'settings.provider': '提供商',
  'settings.modelAlias': '模型别名',
  'settings.model': '模型',
  'settings.custom': '自定义',
  'settings.selectPreset': '选择预设',
  'settings.modelPlaceholder': '输入模型 ID，如 gpt-4o-mini',
  'settings.aliasPlaceholder': '{provider} - 我的配置',
  'settings.useGitHubToken': '该提供商使用 GitHub Token 进行认证，无需单独配置 API Key。',
  'settings.testing': '测试中...',
  'settings.testConnection': '测试连接',
  'settings.saved': '已保存',
  'settings.descTranslation': '描述翻译：',
  'settings.useAI': '使用 AI 模型（{name}）',
  'settings.useMyMemory': '使用免费 MyMemory API（无需配置，自动可用）',
  'settings.unknown': '未知',

  // ── AI 错误信息 ──
  'ai.errNoApiKey': '未配置 AI API Key',
  'ai.errNoEndpoint': '未配置 AI API Endpoint',
  'ai.errApiFailed': 'AI API 错误 ({status}): {detail}',
  'ai.errEmptyResponse': 'AI 返回内容为空',
  'ai.errParseFailed': 'AI 返回结果解析失败',
  'ai.errTimeout': 'AI API 请求超时（30秒）',
  'ai.testOk': '连接成功！API 配置正确。',
  'ai.testInvalidKey': 'API Key 无效，请检查配置。',
  'ai.testNotFound': 'Endpoint 或 Model 不存在，请检查配置。',
  'ai.testApiError': 'API 错误 ({status}): {detail}',
  'ai.testNetworkError': '网络错误: {msg}',
}

const en: Record<string, string> = {
  'nav.favorites': 'Favorites',
  'nav.history': 'History',
  'nav.settings': 'Settings',

  'common.today': 'Today',
  'common.week': 'This Week',
  'common.month': 'This Month',
  'common.retry': 'Retry',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.done': 'Done',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.loading': 'Loading...',
  'common.error': 'Error',

  'trending.allLangs': 'All Languages',
  'trending.allCategories': 'All Categories',
  'trending.refreshing': 'Refreshing...',
  'trending.refresh': 'Refresh',
  'trending.reposCount': '{n} repos',
  'trending.fetching': 'Fetching Trending data...',
  'trending.translating': 'Translating descriptions...',
  'trending.loadFailed': 'Load failed',
  'trending.clickRefresh': 'Click "Refresh" to load Trending list',
  'trending.rankedBy': 'Ranked by {period} Star growth',
  'trending.noMatch': 'No matching data',
  'trending.created': 'Created',
  'trending.active': 'Active',
  'trending.createdTime': 'Created',
  'trending.lastActive': 'Last active',
  'trending.favorite': 'Favorite',
  'trending.unfavorite': 'Unfavorite',
  'trending.chooseFolder': 'Choose folder',
  'trending.newFolder': 'New folder...',

  'dev.fetching': 'Fetching Trending Developers...',
  'dev.clickRefresh': 'Click "Refresh" to load Trending Developers',
  'dev.noData': 'No data',
  'dev.count': '{n} developers',
  'dev.popularRepo': 'Popular Repo',

  'detail.backToList': 'Back',
  'detail.viewSource': 'View Source',
  'detail.favorited': 'Favorited',
  'detail.favorite': 'Favorite',
  'detail.unfavorite': 'Unfavorite',
  'detail.chooseFolder': 'Choose folder',
  'detail.newFolder': 'New folder...',
  'detail.createdTime': 'Created',
  'detail.lastActive': 'Last active',
  'detail.aiSummary': 'AI Summary',
  'detail.regenerate': 'Regenerate',
  'detail.summaryFailed': 'Summary failed',
  'detail.loadingReadme': 'Loading README...',
  'detail.readmeError': 'Cannot load README',
  'detail.noReadme': 'No README content',
  'detail.noReadmeFile': 'No README file',
  'detail.readmeLoaded': 'README loaded',
  'detail.generateSummary': 'Generate AI Summary',
  'detail.analyzing': 'AI analyzing project docs...',
  'detail.basicInfo': 'Basic Info',
  'detail.features': 'Features',
  'detail.architecture': 'Architecture',
  'detail.deployment': 'Deployment',
  'detail.useCases': 'Use Cases',
  'detail.checkAIConfig': 'Check AI model config (Settings → AI Models → Add & Activate)',
  'detail.collapseReadme': 'Collapse README',
  'detail.expandReadme': 'Expand README',
  'detail.configureAI': 'Configure AI model in Settings to enable summary',
  'detail.summarizing': 'AI analyzing...',

  'fav.title': 'Favorites',
  'fav.rename': 'Rename',
  'fav.delete': 'Delete',
  'fav.newFolder': 'New folder...',
  'fav.noRepos': 'No favorites yet',
  'fav.noReposHint': 'Click the heart icon in Trending list to add favorites',
  'fav.confirmDelete': 'Are you sure to delete this folder?',
  'fav.moveTo': 'Move to...',
  'fav.moveTitle': 'Move to',
  'fav.unfavorite': 'Unfavorite',

  'hist.title': 'History',
  'hist.clearAll': 'Clear All',
  'hist.confirmClear': 'Are you sure to clear all history?',
  'hist.noHistory': 'No browsing history',
  'hist.noHistoryHint': 'Browse items in Trending list to build history',
  'hist.viewed': 'Viewed',
  'hist.favorited': 'Favorited',
  'hist.addToFav': 'Add to favorites',
  'hist.removeEntry': 'Remove',

  'settings.title': 'Settings',
  'settings.githubConfig': 'GitHub Config',
  'settings.getToken': 'Get Token',
  'settings.rateLimit': 'Anonymous: 10/min · Auth: 30/min, GraphQL 5000/hr',
  'settings.aiModels': 'AI Models',
  'settings.addModel': 'Add Model',
  'settings.noModels': 'No AI models added yet',
  'settings.noModelsHint': 'Add a model to use AI summary. GitHub Models (free) recommended.',
  'settings.active': 'Active',
  'settings.translation': 'Translate',
  'settings.activate': 'Activate (for AI summary)',
  'settings.setTranslation': 'Set as translation model',
  'settings.unsetTranslation': 'Unset (use free MyMemory API)',
  'settings.editModel': 'Edit',
  'settings.editModelTitle': 'Edit Model',
  'settings.addModelTitle': 'Add Model',
  'settings.provider': 'Provider',
  'settings.modelAlias': 'Alias',
  'settings.model': 'Model',
  'settings.custom': 'Custom',
  'settings.selectPreset': 'Preset',
  'settings.modelPlaceholder': 'Enter model ID, e.g. gpt-4o-mini',
  'settings.aliasPlaceholder': '{provider} - My Config',
  'settings.useGitHubToken': 'This provider uses GitHub Token. No separate API Key needed.',
  'settings.testing': 'Testing...',
  'settings.testConnection': 'Test',
  'settings.saved': 'Saved',
  'settings.descTranslation': 'Translation:',
  'settings.useAI': 'Using AI model ({name})',
  'settings.useMyMemory': 'Using free MyMemory API (no config needed)',
  'settings.unknown': 'Unknown',

  // ── AI Error Messages ──
  'ai.errNoApiKey': 'AI API Key is not configured',
  'ai.errNoEndpoint': 'AI API Endpoint is not configured',
  'ai.errApiFailed': 'AI API Error ({status}): {detail}',
  'ai.errEmptyResponse': 'AI returned empty content',
  'ai.errParseFailed': 'AI returned unparseable result',
  'ai.errTimeout': 'AI API request timed out (30s)',
  'ai.testOk': 'Connection successful! API configured correctly.',
  'ai.testInvalidKey': 'Invalid API Key, please check config.',
  'ai.testNotFound': 'Endpoint or Model not found, please check config.',
  'ai.testApiError': 'API Error ({status}): {detail}',
  'ai.testNetworkError': 'Network Error: {msg}',
}

const dict: Record<Lang, Record<string, string>> = { zh, en }

function t(key: string, lang: Lang, params?: Record<string, string | number>): string {
  let text = dict[lang]?.[key] ?? dict.zh[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v))
    }
  }
  return text
}

// ★ 暴露纯函数供非 React 模块（如 ai.ts）使用
export { t }

// ── React Context ──

type I18nCtx = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

export const I18nContext = createContext<I18nCtx>({
  lang: 'zh',
  setLang: () => {},
  t: (key: string) => key,
})

export function useI18nProvider() {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('app_lang') as Lang) || 'zh'
  })

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('app_lang', l)
  }, [])

  const tFn = useCallback((key: string, params?: Record<string, string | number>) => {
    return t(key, lang, params)
  }, [lang])

  return { lang, setLang, t: tFn }
}

export function useI18n() {
  return useContext(I18nContext)
}
