import { useState, useEffect, useRef } from 'react'
import type { Repo } from '../github'
import { fetchReadme, formatNumber, translateTopic } from '../github'
import { summarizeReadmeStructured, getCachedSummary } from '../ai'
import type { StructuredSummary } from '../ai'
import { getAIConfig } from '../store'
import {
  getFavoriteFolders, isRepoFavorited,
  addRepoToFolder, removeRepoFromFolder, createFolder,
} from '../store'
import { langColor } from '../utils'
import { useI18n } from '../i18n'

type Props = {
  repo: Repo
  onBack: () => void
}

export default function RepoDetail({ repo, onBack }: Props) {
  const { t, lang } = useI18n()
  const [readme, setReadme] = useState<string | null>(null)
  const [readmeLoading, setReadmeLoading] = useState(false)
  const [readmeError, setReadmeError] = useState<string | null>(null)

  const [summary, setSummary] = useState<StructuredSummary | null>(() => getCachedSummary(repo.full_name, lang))
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [showReadme, setShowReadme] = useState(false)
  const [faved, setFaved] = useState(isRepoFavorited(repo.id))
  const [showPicker, setShowPicker] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  const folders = getFavoriteFolders()

  const lc = langColor(repo.language)

  // 点击外部关闭 picker
  useEffect(() => {
    if (!showPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
        setNewFolderName('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPicker])

  // 收藏按钮：已收藏→直接取消，未收藏→弹出文件夹选择
  const handleFavClick = () => {
    if (faved) {
      folders.forEach(f => {
        if (f.repos.some(r => r.id === repo.id)) {
          removeRepoFromFolder(f.id, repo.id)
        }
      })
      setFaved(false)
    } else {
      setShowPicker(true)
      setNewFolderName('')
    }
  }

  const handlePickFolder = (folderId: string) => {
    addRepoToFolder(folderId, repo)
    setFaved(true)
    setShowPicker(false)
  }

  const handleCreateAndPick = () => {
    if (!newFolderName.trim()) return
    const newFolder = createFolder(newFolderName.trim())
    addRepoToFolder(newFolder.id, repo)
    setFaved(true)
    setShowPicker(false)
    setNewFolderName('')
  }

  // 加载 README
  useEffect(() => {
    let cancelled = false
    setReadmeLoading(true)
    setReadmeError(null)

    fetchReadme(repo.full_name)
      .then(text => { if (!cancelled) setReadme(text) })
      .catch(err => { if (!cancelled) setReadmeError(err.message) })
      .finally(() => { if (!cancelled) setReadmeLoading(false) })

    return () => { cancelled = true }
  }, [repo.full_name])

  // AI 结构化总结
  const handleSummarize = async () => {
    if (!readme) return
    setSummaryLoading(true)
    setSummaryError(null)
    setSummary(null)

    const config = getAIConfig()
    try {
      const result = await summarizeReadmeStructured(
        readme,
        repo.description || '',
        repo.full_name,
        config,
        lang,
      )
      setSummary(result)
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : t('detail.summaryFailed'))
    } finally {
      setSummaryLoading(false)
    }
  }

  // 自动总结（如果有 README 且未总结过）
  useEffect(() => {
    if (readme && !summary && !summaryLoading) {
      handleSummarize()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readme])

  return (
    <div className="detail-page">
      {/* 顶部导航 */}
      <div className="detail-topbar">
        <button className="btn-back" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t('detail.backToList')}
        </button>
      </div>

      {/* 项目信息头部 */}
      <div className="detail-header">
        <div className="detail-header-top">
          <img src={repo.owner.avatar_url} alt="" className="detail-avatar" />
          <div className="detail-title-area">
            <h2 className="detail-title">{repo.full_name}</h2>
            {repo.description && <p className="detail-desc">{repo.description}</p>}
          </div>
        </div>

        <div className="detail-stats">
          <div className="stat-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="stat-value">{formatNumber(repo.stargazers_count)}</span>
            <span className="stat-label">Stars</span>
          </div>
          <div className="stat-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" />
              <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" /><path d="M12 12v3" />
            </svg>
            <span className="stat-value">{formatNumber(repo.forks_count)}</span>
            <span className="stat-label">Forks</span>
          </div>
          <div className="stat-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="stat-value">{formatNumber(repo.open_issues_count)}</span>
            <span className="stat-label">Issues</span>
          </div>
          {repo.language && (
            <div className="stat-item">
              <span className="lang-dot-lg" style={{ backgroundColor: lc }} />
              <span className="stat-value">{repo.language}</span>
            </div>
          )}
        </div>

        {repo.topics && repo.topics.length > 0 && (
          <div className="detail-topics">
            {repo.topics.map(t => (
              <span key={t} className="topic-tag">{translateTopic(t)}</span>
            ))}
          </div>
        )}

        <div className="detail-actions">
          <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {t('detail.viewSource')}
          </a>
          <div className="fav-wrapper" style={{ position: 'relative' }}>
            <button
              className={`btn-secondary fav-btn ${faved ? 'faved' : ''}`}
              onClick={handleFavClick}
              title={faved ? t('detail.unfavorite') : t('detail.favorite')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={faved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
              {faved ? t('detail.favorited') : t('detail.favorite')}
            </button>
            {showPicker && (
              <div className="folder-picker" ref={pickerRef}>
                <div className="folder-picker-title">{t('detail.chooseFolder')}</div>
                {folders.map(f => (
                  <button
                    key={f.id}
                    className="folder-option"
                    onClick={() => handlePickFolder(f.id)}
                  >
                    <span>{f.name}</span>
                    <span className="folder-check">{f.repos.some(r => r.id === repo.id) ? '✓' : ''}</span>
                  </button>
                ))}
                <div className="folder-create-row">
                  <input
                    className="folder-create-input"
                    placeholder={t('detail.newFolder')}
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateAndPick()}
                  />
                  <button className="folder-create-btn" onClick={handleCreateAndPick} disabled={!newFolderName.trim()}>+</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="detail-meta-info">
          <span>{t('detail.createdTime')}: {new Date(repo.created_at).toLocaleDateString()}</span>
          <span>{t('detail.lastActive')}: {new Date(repo.pushed_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* AI 智能总结区域 */}
      <div className="detail-section">
        <div className="detail-section-header">
          <h3>{t('detail.aiSummary')}</h3>
          {summary && !summaryLoading && (
            <button className="btn-text" onClick={handleSummarize}>{t('detail.regenerate')}</button>
          )}
          {summaryError && (
            <button className="btn-text" onClick={handleSummarize}>{t('common.retry')}</button>
          )}
        </div>

        {readmeLoading && (
          <div className="detail-loading">
            <div className="spinner-lg" />
            <span>{t('detail.loadingReadme')}</span>
          </div>
        )}

        {readmeError && (
          <div className="detail-error">
            <p>{t('detail.readmeError')}: {readmeError}</p>
          </div>
        )}

        {!readmeLoading && !readmeError && !readme && (
          <div className="detail-empty">
            <p>{t('detail.noReadmeFile')}</p>
          </div>
        )}

        {readme && !summary && !summaryLoading && (
          <div className="detail-empty">
            <p>{t('detail.readmeLoaded')}</p>
            <button className="btn-secondary" onClick={handleSummarize}>{t('detail.generateSummary')}</button>
          </div>
        )}

        {summaryLoading && (
          <div className="detail-loading">
            <div className="spinner-lg" />
            <span>{t('detail.analyzing')}</span>
          </div>
        )}

        {summary && !summaryLoading && (
          <div className="ai-summary-cards">
            {summary.basicInfo && (
              <div className="ai-card ai-card-info">
                <div className="ai-card-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                  </svg>
                  <span>{t('detail.basicInfo')}</span>
                </div>
                <p className="ai-card-body">{summary.basicInfo}</p>
              </div>
            )}
            {summary.features && (
              <div className="ai-card ai-card-features">
                <div className="ai-card-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span>{t('detail.features')}</span>
                </div>
                <div className="ai-card-body ai-card-list">
                  {summary.features.split('\n').filter(Boolean).map((line, i) => (
                    <div key={i} className="ai-card-list-item">
                      <span className="ai-card-bullet">•</span>
                      <span>{line.replace(/^[•·\-]\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {summary.architecture && (
              <div className="ai-card ai-card-arch">
                <div className="ai-card-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                  <span>{t('detail.architecture')}</span>
                </div>
                <p className="ai-card-body">{summary.architecture}</p>
              </div>
            )}
            {summary.deployment && (
              <div className="ai-card ai-card-deploy">
                <div className="ai-card-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>{t('detail.deployment')}</span>
                </div>
                <div className="ai-card-body ai-card-code">{summary.deployment}</div>
              </div>
            )}
            {summary.useCases && (
              <div className="ai-card ai-card-cases">
                <div className="ai-card-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                  <span>{t('detail.useCases')}</span>
                </div>
                <p className="ai-card-body">{summary.useCases}</p>
              </div>
            )}
          </div>
        )}

        {summaryError && (
          <div className="detail-error">
            <p>{summaryError}</p>
            <p className="error-hint">{t('detail.checkAIConfig')}</p>
          </div>
        )}
      </div>

      {/* 原始 README */}
      {readme && (
        <div className="detail-section">
          <button className="detail-toggle-readme" onClick={() => setShowReadme(!showReadme)}>
            {showReadme ? t('detail.collapseReadme') : t('detail.expandReadme')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: showReadme ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showReadme && (
            <pre className="detail-readme-raw">{readme}</pre>
          )}
        </div>
      )}
    </div>
  )
}
