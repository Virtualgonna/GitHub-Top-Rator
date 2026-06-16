// ─── 共享工具：语言颜色映射 & 时间格式化 & URL解析 ────────────────────────

/** 是否为 Electron 桌面环境 */
export const isElectron = !!(window as any).electronAPI?.isElectron

/** 代理路径 → 真实URL映射 */
const PROXY_TARGETS: Record<string, string> = {
  '/github-trending': 'https://github.com',
  '/github-api': 'https://api.github.com',
  '/ai-models': 'https://models.inference.ai.azure.com',
  '/mymemory-api': 'https://api.mymemory.translated.net',
}

/**
 * URL 解析：开发环境走 Vite proxy，Electron 走真实 URL
 */
export function resolveUrl(url: string): string {
  if (!isElectron) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  for (const [prefix, target] of Object.entries(PROXY_TARGETS)) {
    if (url.startsWith(prefix)) {
      return target + url.slice(prefix.length)
    }
  }
  return url
}

/** 编程语言颜色映射 */
export const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
  Rust: '#dea584', Go: '#00ADD8', 'C++': '#f34b7d', C: '#555555',
  Java: '#b07219', 'C#': '#178600', Swift: '#F05138', Kotlin: '#A97BFF',
  Ruby: '#701516', PHP: '#4F5D95', Dart: '#00B4AB', Shell: '#89e051',
  Vue: '#41b883', HTML: '#e34c26', CSS: '#563d7c', Zig: '#ec915c',
}

/** 获取语言颜色，未知语言返回默认灰色 */
export function langColor(lang: string | null | undefined): string {
  return lang ? (LANG_COLORS[lang] || '#999') : '#999'
}

/** 相对时间格式化 */
export function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  if (diffHour < 24) return `${diffHour} 小时前`
  if (diffDay < 30) return `${diffDay} 天前`
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} 个月前`
  return `${Math.floor(diffDay / 365)} 年前`
}
