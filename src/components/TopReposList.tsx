import { useState, useRef, useCallback, useEffect } from 'react'
import type { Repo } from '../github'
import { fetchNewRepos2026, fetchTopStarRepos, translateRepos, translateTopic, formatNumber } from '../github'
import { addHistoryEntry, isRepoFavorited, getFavoriteFolders, addRepoToFolder, removeRepoFromFolder, createFolder } from '../store'
import { langColor, formatRelativeTime } from '../utils'
import { useI18n } from '../i18n'

type TopMode = 'new2026' | 'alltime'

type Props = {
  mode: TopMode
  /** 视图是否处于激活状态（display !== 'none'）。激活且未加载时自动刷新 */
  active?: boolean
  onOpenDetail: (repo: Repo) => void
}

export default function TopReposList({ mode, active = true, onOpenDetail }: Props) {
  const { t } = useI18n()
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [progress, setProgress] = useState('')
  const [favState, setFavState] = useState<Record<number, boolean>>({})
  const [pickerRepo, setPickerRepo] = useState<Repo | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)
  const loadId = useRef(0)

  const description = mode === 'new2026' ? t('top.newReposDesc') : t('top.alltimeDesc')

  // 收藏夹面板外部点击关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerRepo(null)
        setNewFolderName('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 视图首次激活时自动加载数据
  useEffect(() => {
    if (active && !loaded && !loading) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const folders = getFavoriteFolders()

  const handleFavClick = useCallback((e: React.MouseEvent, repo: Repo) => {
    e.stopPropagation()
    const faved = favState[repo.id] ?? isRepoFavorited(repo.id)
    if (faved) {
      folders.forEach(f => {
        if (f.repos.some(r => r.id === repo.id)) {
          removeRepoFromFolder(f.id, repo.id)
        }
      })
      setFavState(prev => ({ ...prev, [repo.id]: false }))
    } else {
      setPickerRepo(repo)
      setNewFolderName('')
    }
  }, [favState, folders])

  const handlePickFolder = (folderId: string) => {
    if (!pickerRepo) return
    addRepoToFolder(folderId, pickerRepo)
    setFavState(prev => ({ ...prev, [pickerRepo.id]: true }))
    setPickerRepo(null)
  }

  const handleCreateAndPick = () => {
    if (!pickerRepo || !newFolderName.trim()) return
    const newFolder = createFolder(newFolderName.trim())
    addRepoToFolder(newFolder.id, pickerRepo)
    setFavState(prev => ({ ...prev, [pickerRepo.id]: true }))
    setPickerRepo(null)
    setNewFolderName('')
  }

  const loadData = async () => {
    const myId = ++loadId.current
    setLoading(true)
    setError(null)
    setProgress(t('top.fetching'))
    try {
      const raw = mode === 'new2026' ? await fetchNewRepos2026() : await fetchTopStarRepos()
      if (myId !== loadId.current) return

      setProgress(t('top.translating'))
      const translated = await translateRepos(raw.slice(0, 20))
      if (myId !== loadId.current) return

      setRepos(translated)
      setLoaded(true)
    } catch (err) {
      if (myId !== loadId.current) return
      setError(err instanceof Error ? err.message : t('trending.loadFailed'))
    } finally {
      if (myId === loadId.current) {
        setLoading(false)
        setProgress('')
      }
    }
  }

  const handleCardClick = (repo: Repo) => {
    addHistoryEntry(repo)
    onOpenDetail(repo)
  }

  return (
    <div className="trending-page">
      <div className="trending-filters top-repos-filters">
        <span className="top-repos-desc">{description}</span>

        <button
          className="refresh-data-btn"
          onClick={loadData}
          disabled={loading}
        >
          <svg className={loading ? 'spinning' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 11-6.22-8.56" />
            <path d="M21 3v5h-5" />
          </svg>
          {loading ? t('trending.refreshing') : t('trending.refresh')}
        </button>

        <span className="filter-count">
          {loaded ? t('top.count', { n: repos.length }) : ''}
        </span>
      </div>

      {error && (
        <div className="page-error">
          <p>{error}</p>
          <button className="btn-secondary" onClick={loadData}>{t('common.retry')}</button>
        </div>
      )}

      {loading && !error && (
        <div className="page-loading">
          <div className="spinner-lg" />
          <span>{progress || t('top.fetching')}</span>
        </div>
      )}

      {!loading && !error && !loaded && (
        <div className="page-empty">
          <p>{t('top.clickRefresh')}</p>
          <p className="page-empty-hint">{description}</p>
        </div>
      )}

      {!loading && !error && loaded && repos.length === 0 && (
        <div className="page-empty">
          <p>{t('trending.noMatch')}</p>
        </div>
      )}

      {!loading && !error && loaded && (
        <div className="trending-list">
          {repos.map((repo, index) => {
            const faved = favState[repo.id] ?? isRepoFavorited(repo.id)

            return (
              <div
                key={repo.id}
                className="trending-card top-repo-card"
                onClick={() => handleCardClick(repo)}
              >
                <span className={`trending-rank rank-${index + 1}`}>{index + 1}</span>

                <img src={repo.owner.avatar_url} alt="" className="trending-avatar" loading="lazy" />

                <div className="trending-content">
                  <div className="trending-title-row">
                    <span className="trending-name">{repo.full_name}</span>
                  </div>

                  {repo.description && (
                    <p className="trending-desc">{repo.description}</p>
                  )}

                  <div className="trending-meta">
                    <span className="meta-item meta-stars" title={t('top.viewTotalStars')}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
                    <span className="meta-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" />
                        <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" /><path d="M12 12v3" />
                      </svg>
                      {formatNumber(repo.forks_count)}
                    </span>
                    {repo.created_at && (
                      <span className="trending-created" title={`${t('trending.createdTime')}: ${new Date(repo.created_at).toLocaleString()}`}>
                        {t('trending.created')} {new Date(repo.created_at).toLocaleDateString()}
                      </span>
                    )}
                    {repo.pushed_at && (
                      <span className="trending-active" title={`${t('trending.lastActive')}: ${new Date(repo.pushed_at).toLocaleString()}`}>
                        {t('trending.active')} {formatRelativeTime(repo.pushed_at)}
                      </span>
                    )}
                  </div>

                  {repo.topics && repo.topics.length > 0 && (
                    <div className="trending-topics">
                      {repo.topics.slice(0, 6).map(tp => (
                        <span key={tp} className="topic-tag">
                          {translateTopic(tp)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="top-repo-sidebar">
                  <button
                    className={`fav-btn-quick ${faved ? 'faved' : ''}`}
                    onClick={e => handleFavClick(e, repo)}
                    title={faved ? t('trending.unfavorite') : t('trending.favorite')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={faved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </button>
                  {pickerRepo && pickerRepo.id === repo.id && (
                    <div className="folder-picker" ref={pickerRef} onClick={e => e.stopPropagation()}>
                      <div className="folder-picker-title">{t('trending.chooseFolder')}</div>
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
                          placeholder={t('trending.newFolder')}
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
            )
          })}
        </div>
      )}
    </div>
  )
}
