// ─── OpenAI 兼容 API：README 总结与翻译 ────────────────────────────────

import type { AIConfig } from './store'
import { resolveUrl } from './utils'
import type { Lang } from './i18n'
import { t as i18nT } from './i18n'

/** 结构化总结结果 */
export type StructuredSummary = {
  basicInfo: string
  features: string
  architecture: string
  deployment: string
  useCases: string
}

/** 内存缓存：同一会话内避免重复请求 */
const _summaryCache = new Map<string, StructuredSummary>()

export function getCachedSummary(repoName: string, lang: Lang = 'zh'): StructuredSummary | null {
  return _summaryCache.get(`${repoName}:${lang}`) ?? null
}

/**
 * 结构化总结 README，返回 5 个维度的分析卡片（带缓存）
 */
export async function summarizeReadmeStructured(
  readme: string,
  description: string,
  repoName: string,
  config: AIConfig,
  lang: Lang = 'zh',
): Promise<StructuredSummary> {
  // 命中缓存直接返回（按语言分别缓存）
  const cacheKey = `${repoName}:${lang}`
  const cached = _summaryCache.get(cacheKey)
  if (cached) return cached

  if (!config.apiKey) throw new Error(i18nT('ai.errNoApiKey', lang))
  if (!config.endpoint) throw new Error(i18nT('ai.errNoEndpoint', lang))

  const truncated = readme.slice(0, 4000)

  // ★ 根据 lang 动态生成对应语言的 prompt，让 AI 输出对应语言的总结内容
  const prompt = lang === 'en'
    ? `Analyze the following GitHub project and output JSON in English.
Project: ${repoName}
Description: ${description || 'None'}
README:
${truncated}

Output JSON (no code block markers):
{"basicInfo":"3 sentences summarizing the project","features":"5 highlights, each starting with •, separated by newlines","architecture":"tech stack and architecture","deployment":"install commands and steps","useCases":"3 sentences of applicable scenarios"}

Requirements: each field must have substantial content; if missing, infer reasonably.`
    : `分析以下GitHub项目，用中文输出JSON。
项目: ${repoName}
描述: ${description || '无'}
README:
${truncated}

输出JSON（不含代码块标记）:
{"basicInfo":"3句话概括项目","features":"5条亮点,每条•开头,换行分隔","architecture":"技术栈与架构","deployment":"安装命令与步骤","useCases":"适用场景3句话"}

要求:每个字段必须有实质内容,没有则合理推断。`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(resolveUrl(config.endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1200,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(i18nT('ai.errApiFailed', lang, { status: res.status, detail: errText }))
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) throw new Error(i18nT('ai.errEmptyResponse', lang))

    let result: StructuredSummary
    try {
      result = JSON.parse(content)
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) result = JSON.parse(jsonMatch[0])
      else throw new Error(i18nT('ai.errParseFailed', lang))
    }

    // 写入缓存（按语言分别缓存）
    _summaryCache.set(cacheKey, result)
    return result
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(i18nT('ai.errTimeout', lang))
    }
    throw err
  }
}

/**
 * 测试 AI API 连接
 */
export async function testAIConnection(
  config: AIConfig,
  lang: Lang = 'zh',
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(resolveUrl(config.endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    })

    if (res.ok) {
      return { ok: true, message: i18nT('ai.testOk', lang) }
    }

    const errText = await res.text().catch(() => '')
    if (res.status === 401) {
      return { ok: false, message: i18nT('ai.testInvalidKey', lang) }
    }
    if (res.status === 404) {
      return { ok: false, message: i18nT('ai.testNotFound', lang) }
    }
    return { ok: false, message: i18nT('ai.testApiError', lang, { status: res.status, detail: errText.slice(0, 100) }) }
  } catch (err) {
    return { ok: false, message: i18nT('ai.testNetworkError', lang, { msg: err instanceof Error ? err.message : '' }) }
  }
}
