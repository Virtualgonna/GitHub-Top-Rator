import { useState, useEffect, useRef } from 'react'
import type { Repo } from '../github'
import { formatNumber, translateTopic } from '../github'
import {
  getFavoriteFolders, removeRepoFromFolder,
  createFolder, deleteFolder, renameFolder, addRepoToFolder,
} from '../store'
import type { FavoriteFolder } from '../store'
import { langColor } from '../utils'
import { useI18n } from '../i18n'

type Props = {
  onOpenDetail: (repo: Repo) => void
}

export default function Favorites({ onOpenDetail }: Props) {
  const { t } = useI18n()
  const [folders, setFolders] = useState<FavoriteFolder[]>(getFavoriteFolders())
  const [activeFolderId, setActiveFolderId] = useState(folders[0]?.id || '')
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [moveRepoId, setMoveRepoId] = useState<number | null>(null)
  const moveRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭移动弹窗
  useEffect(() => {
    if (moveRepoId === null) return
    const handler = (e: MouseEvent) => {
      if (moveRef.current && !moveRef.current.contains(e.target as Node)) {
        setMoveRepoId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moveRepoId])

  const refresh = () => setFolders(getFavoriteFolders())

  // 监听收藏变化事件，自动刷新
  useEffect(() => {
    const handler = () => refresh()
    window.addEventListener('favorites-changed', handler)
    return () => window.removeEventListener('favorites-changed', handler)
  }, [])

  const activeFolder = folders.find(f => f.id === activeFolderId)

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    createFolder(newFolderName.trim())
    setNewFolderName('')
    refresh()
  }

  const handleDeleteFolder = (id: string) => {
    if (folders.length <= 1) return
    if (!confirm(t('fav.confirmDelete'))) return
    deleteFolder(id)
    refresh()
    if (activeFolderId === id) {
      const remaining = getFavoriteFolders()
      setActiveFolderId(remaining[0]?.id || '')
    }
  }

  const handleRenameStart = (f: FavoriteFolder) => {
    setEditingFolderId(f.id)
    setEditingName(f.name)
  }

  const handleRenameConfirm = () => {
    if (editingFolderId && editingName.trim()) {
      renameFolder(editingFolderId, editingName.trim())
      refresh()
    }
    setEditingFolderId(null)
  }

  const handleRemoveRepo = (repoId: number) => {
    if (!activeFolder) return
    removeRepoFromFolder(activeFolder.id, repoId)
    refresh()
  }

  const handleMoveRepo = (repoId: number, targetFolderId: string) => {
    if (!activeFolder) return
    const repo = activeFolder.repos.find(r => r.id === repoId)
    if (!repo) return
    addRepoToFolder(targetFolderId, repo)
    removeRepoFromFolder(activeFolder.id, repoId)
    setMoveRepoId(null)
    refresh()
  }

  return (
    <div className="favorites-page">
      <div className="favorites-layout">
        {/* 左侧：收藏夹列表 */}
        <aside className="favorites-sidebar">
          <h3 className="sidebar-title">{t('fav.title')}</h3>
          <div className="sidebar-list">
            {folders.map(f => (
              <div
                key={f.id}
                className={`sidebar-item ${activeFolderId === f.id ? 'active' : ''}`}
                onClick={() => setActiveFolderId(f.id)}
              >
                {editingFolderId === f.id ? (
                  <input
                    className="sidebar-edit-input"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={handleRenameConfirm}
                    onKeyDown={e => e.key === 'Enter' && handleRenameConfirm()}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="sidebar-item-name">{f.name}</span>
                    <span className="sidebar-item-count">{f.repos.length}</span>
                    <div className="sidebar-item-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className="sidebar-action-btn"
                        title={t('fav.rename')}
                        onClick={() => handleRenameStart(f)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {folders.length > 1 && (
                        <button
                          className="sidebar-action-btn danger"
                          title={t('fav.delete')}
                          onClick={() => handleDeleteFolder(f.id)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="sidebar-create">
            <input
              type="text"
              className="sidebar-create-input"
              placeholder={t('fav.newFolder')}
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
            />
            <button className="sidebar-create-btn" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              +
            </button>
          </div>
        </aside>

        {/* 右侧：收藏的项目列表 */}
        <div className="favorites-content">
          {activeFolder && (
            <>
              <h3 className="content-title">{activeFolder.name} ({activeFolder.repos.length})</h3>

              {activeFolder.repos.length === 0 && (
                <div className="content-empty">
                  <p>{t('fav.noRepos')}</p>
                  <p className="content-empty-hint">{t('fav.noReposHint')}</p>
                </div>
              )}

              <div className="fav-list">
                {activeFolder.repos.map((repo, index) => (
                  <div key={repo.id} className="fav-card" onClick={() => onOpenDetail(repo)}>
                    <span className="fav-rank">{index + 1}</span>
                    <img src={repo.owner.avatar_url} alt="" className="fav-avatar" loading="lazy" />
                    <div className="fav-info">
                      <span className="fav-name">{repo.full_name}</span>
                      {repo.description && <p className="fav-desc">{repo.description}</p>}
                      <div className="fav-meta">
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
                          <span className="fav-topics">
                            {repo.topics.slice(0, 3).map(t => (
                              <span key={t} className="topic-tag-sm">{translateTopic(t)}</span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="fav-actions-right">
                      <button
                        className="fav-move-btn"
                        title={t('fav.moveTo')}
                        onClick={e => { e.stopPropagation(); setMoveRepoId(moveRepoId === repo.id ? null : repo.id) }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                        </svg>
                      </button>
                      <button
                        className="fav-remove-btn"
                        title={t('fav.unfavorite')}
                        onClick={e => { e.stopPropagation(); handleRemoveRepo(repo.id) }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                      {moveRepoId === repo.id && (
                        <div className="folder-picker fav-move-picker" ref={moveRef} onClick={e => e.stopPropagation()}>
                          <div className="folder-picker-title">{t('fav.moveTitle')}</div>
                          {folders.filter(f => f.id !== activeFolderId).map(f => (
                            <button
                              key={f.id}
                              className="folder-option"
                              onClick={() => handleMoveRepo(repo.id, f.id)}
                            >
                              <span>{f.name}</span>
                              <span className="folder-check">{f.repos.some(r => r.id === repo.id) ? '✓' : ''}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
