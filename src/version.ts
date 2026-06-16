// ─── 版本检查（GitHub Releases API） ───────────────────────────────────────
// 用于桌面版「设置 → 版本更新」功能：
// 1) 检查 GitHub Releases 是否有新版本
// 2) 对比 tag_name 与本地版本
// 3) 提供 .exe 下载地址（NSIS 安装包默认覆盖旧版本）

export const CURRENT_VERSION = '1.1.0'
export const GITHUB_OWNER = 'Virtualgonna'
export const GITHUB_REPO = 'GitHub-Top-Rator'
export const RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
export const RELEASES_PAGE = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`

export type ReleaseInfo = {
  tagName: string       // 原始 tag，如 "v1.1.0"
  version: string       // 去掉 v 前缀的纯版本号，如 "1.1.0"
  name: string          // release 名称
  body: string          // release notes（Markdown）
  htmlUrl: string       // release 页面
  publishedAt: string   // ISO 时间
  exeUrl: string | null // .exe 下载地址（NSIS 安装包）
  assetSize: number     // 字节
}

export type UpdateCheckResult =
  | { kind: 'up-to-date'; current: string; latest: ReleaseInfo | null }
  | { kind: 'update-available'; current: string; latest: ReleaseInfo }
  | { kind: 'error'; message: string }

// ── 去掉 tag 前的 v/V 前缀 ────────────────────────────────────────────────
function stripTagPrefix(tag: string): string {
  return tag.replace(/^[vV]/, '').trim()
}

// ── 语义化版本对比（a > b 返回 1，a < b 返回 -1，相等返回 0） ─────────────
function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map(s => parseInt(s, 10) || 0)
  const pb = b.split('.').map(s => parseInt(s, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

// ── 查找 .exe 资源（NSIS 安装包） ─────────────────────────────────────────
function findExeAsset(assets: Array<{ name: string; browser_download_url: string; size: number }>): {
  url: string | null
  size: number
} {
  // 优先匹配 Setup / Installer 命名的 .exe
  const candidates = assets.filter(a => a.name.toLowerCase().endsWith('.exe'))
  if (candidates.length === 0) return { url: null, size: 0 }
  // 偏好：包含 Setup / Installer
  const preferred = candidates.find(a => /setup|installer|install/i.test(a.name))
  const picked = preferred || candidates[0]
  return { url: picked.browser_download_url, size: picked.size }
}

// ── 调用 GitHub Releases API ─────────────────────────────────────────────
export async function fetchLatestRelease(): Promise<UpdateCheckResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15s 超时
    const resp = await fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    // 404 说明仓库还没有任何 release
    if (resp.status === 404) {
      return { kind: 'up-to-date', current: CURRENT_VERSION, latest: null }
    }
    if (!resp.ok) {
      return { kind: 'error', message: `GitHub API 返回 ${resp.status}` }
    }

    const data = await resp.json() as {
      tag_name: string
      name: string
      body: string
      html_url: string
      published_at: string
      assets: Array<{ name: string; browser_download_url: string; size: number }>
    }

    const version = stripTagPrefix(data.tag_name)
    const { url: exeUrl, size: assetSize } = findExeAsset(data.assets || [])

    const latest: ReleaseInfo = {
      tagName: data.tag_name,
      version,
      name: data.name || data.tag_name,
      body: data.body || '',
      htmlUrl: data.html_url,
      publishedAt: data.published_at,
      exeUrl,
      assetSize,
    }

    const cmp = compareVersion(version, CURRENT_VERSION)
    if (cmp > 0) {
      return { kind: 'update-available', current: CURRENT_VERSION, latest }
    }
    return { kind: 'up-to-date', current: CURRENT_VERSION, latest }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { kind: 'error', message: '请求超时（15秒）' }
    }
    return {
      kind: 'error',
      message: err instanceof Error ? err.message : '网络请求失败',
    }
  }
}

// ── 格式化文件大小 ───────────────────────────────────────────────────────
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

// ── 格式化发布时间（本地化） ─────────────────────────────────────────────
export function formatDate(iso: string, lang: 'zh' | 'en' = 'zh'): string {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    if (lang === 'en') {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}
