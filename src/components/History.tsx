import { useState } from 'react'
import type { Repo } from '../github'
import { formatNumber, translateTopic } from '../github'
import {
  getHistory, clearHistory, removeHistoryEntry,
  addRepoToFolder, getFavoriteFolders, isRepoFavorited,
} from '../store'
import type { HistoryEntry } from '../store'
import { langColor, formatRelativeTime } from '../utils'
import { useI18n } from '../i18n'

type Props = {
  onOpenDetail: (repo: Repo) => void
}

export default function History({ onOpenDetail }: Props) {
  const { t } = useI18n()
  const [history, setHistory] = useState<HistoryEntry[]>(getHistory())

  const refresh = () => setHistory(getHistory())

  const handleClear = () => {
    if (!confirm(t('hist.confirmClear'))) return
    clearHistory()
    refresh()
  }

  const handleRemove = (repoId: number) => {
    removeHistoryEntry(repoId)
    refresh()
  }

  const handleQuickFav = (e: React.MouseEvent, repo: Repo) => {
    e.stopPropagation()
    const folders = getFavoriteFolders()
    const defaultFolder = folders[0] || { id: 'default' }
    addRepoToFolder(defaultFolder.id, repo)
    refresh()
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <h3 className="history-title">{t('hist.title')} ({history.length})</h3>
        {history.length > 0 && (
          <button className="btn-text danger" onClick={handleClear}>{t('hist.clearAll')}</button>
        )}
      </div>

      {history.length === 0 && (
        <div className="content-empty">
          <p>{t('hist.noHistory')}</p>
          <p className="content-empty-hint">{t('hist.noHistoryHint')}</p>
        </div>
      )}

      <div className="history-list">
        {history.map((entry) => {
          const repo = entry.repo
          const faved = isRepoFavorited(repo.id)

          return (
            <div key={entry.repoId} className="history-card" onClick={() => onOpenDetail(repo)}>
              <div className="history-time-dot" />
              <div className="history-time-line" />

              <img src={repo.owner.avatar_url} alt="" className="history-avatar" loading="lazy" />
              <div className="history-info">
                <span className="history-name">{repo.full_name}</span>
                {repo.description && <p className="history-desc">{repo.description}</p>}
                <div className="history-meta">
                  <span className="meta-item meta-stars">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {formatNumber(repo.stargazers_count)}
                  </span>
                  {repo.language && (
                    <span className="meta-item">
                      <span className="lang-dot" style={{ backgroundColor: langColor(repo.language) }} />
                      {repo.language}
                    </span>
                  )}
                  {repo.topics && repo.topics.length > 0 && (
                    <span className="history-topics">
                      {repo.topics.slice(0, 3).map(t => (
                        <span key={t} className="topic-tag-sm">{translateTopic(t)}</span>
                      ))}
                    </span>
                  )}
                  <span className="history-viewed" title={new Date(entry.viewedAt).toLocaleString()}>
                    {t('hist.viewed')} {formatRelativeTime(entry.viewedAt)}
                  </span>
                </div>
              </div>

              <div className="history-actions">
                <button
                  className={`fav-btn-quick ${faved ? 'faved' : ''}`}
                  onClick={e => handleQuickFav(e, repo)}
                  title={faved ? t('hist.favorited') : t('hist.addToFav')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={faved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                  </svg>
                </button>
                <button
                  className="history-remove-btn"
                  title={t('hist.removeEntry')}
                  onClick={e => { e.stopPropagation(); handleRemove(entry.repoId) }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
