import { useState, useCallback } from 'react'
import {
  getSettings, saveSettings,
  getAIModels, addAIModel, updateAIModel, deleteAIModel, setActiveAIModel, setTranslationModel,
  AI_PROVIDERS, getProvider,
} from '../store'
import type { AppSettings, AIModelEntry } from '../store'
import { testAIConnection } from '../ai'
import { useI18n } from '../i18n'
import {
  CURRENT_VERSION, fetchLatestRelease, formatBytes, formatDate,
  RELEASES_PAGE,
} from '../version'
import type { UpdateCheckResult, ReleaseInfo } from '../version'

type Props = {
  onClose: () => void
}

type EditingModel = {
  id?: string              // undefined = 新建
  providerId: string
  name: string
  model: string
  endpoint: string
  apiKey: string
  isCustomModel: boolean   // 是否手动输入模型名
}

const EMPTY_MODEL: EditingModel = {
  providerId: 'github-models',
  name: '',
  model: '',
  endpoint: '',
  apiKey: '',
  isCustomModel: false,
}

export default function Settings({ onClose }: Props) {
  const { t, lang } = useI18n()
  const [settings, setSettings] = useState<AppSettings>(getSettings())
  const [models, setModels] = useState<AIModelEntry[]>(getAIModels())
  const [activeId, setActiveId] = useState<string | null>(settings.aiActiveModelId)
  const [saved, setSaved] = useState(false)

  // 编辑状态
  const [editing, setEditing] = useState<EditingModel | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)

  // ─── 版本更新 ─────────────────────────────────────────────────
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null)
  const [updateChecking, setUpdateChecking] = useState(false)
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null)

  // ─── GitHub Token ─────────────────────────────────────────────────
  const handleSaveGitHub = () => {
    saveSettings(settings)
    flashSaved()
  }

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ─── 模型编辑 ─────────────────────────────────────────────────────
  const handleAddModel = () => {
    setEditing({ ...EMPTY_MODEL, providerId: 'github-models' })
    setTestResult(null)
  }

  const handleEditModel = (m: AIModelEntry) => {
    const provider = getProvider(m.providerId)
    const presetModels = provider?.models || []
    setEditing({
      id: m.id,
      providerId: m.providerId,
      name: m.name,
      model: m.model,
      endpoint: m.endpoint,
      apiKey: m.apiKey,
      isCustomModel: !presetModels.includes(m.model),
    })
    setTestResult(null)
  }

  const handleCancelEdit = () => {
    setEditing(null)
    setTestResult(null)
  }

  const handleProviderChange = useCallback((providerId: string) => {
    const provider = getProvider(providerId)
    setEditing(prev => prev ? {
      ...prev,
      providerId,
      endpoint: provider?.endpoint || prev.endpoint,
      model: provider?.models[0] || '',
      isCustomModel: false,
    } : null)
  }, [])

  const handleSaveModel = () => {
    if (!editing) return
    const provider = getProvider(editing.providerId)
    const entry = {
      providerId: editing.providerId,
      name: editing.name || `${provider?.name || t('settings.unknown')} - ${editing.model}`,
      model: editing.model,
      endpoint: editing.endpoint || provider?.endpoint || '',
      apiKey: editing.apiKey,
    }

    if (editing.id) {
      updateAIModel(editing.id, entry)
    } else {
      addAIModel(entry)
    }

    setModels(getAIModels())
    setEditing(null)
    setTestResult(null)
  }

  const handleDeleteModel = (id: string) => {
    deleteAIModel(id)
    setModels(getAIModels())
    setActiveId(getSettings().aiActiveModelId)
  }

  const handleActivate = (id: string) => {
    setActiveAIModel(id)
    setActiveId(id)
  }

  const handleSetTranslation = (id: string | null) => {
    setTranslationModel(id)
    setSettings(getSettings())
  }

  // ─── 版本更新 ─────────────────────────────────────────────────
  const handleCheckUpdate = async () => {
    if (updateChecking) return
    setUpdateChecking(true)
    try {
      const result = await fetchLatestRelease()
      setUpdateResult(result)
      setLastCheckedAt(new Date().toISOString())
    } finally {
      setUpdateChecking(false)
    }
  }

  const handleTestModel = async () => {
    if (!editing) return
    setTesting(true)
    setTestResult(null)
    try {
      const provider = getProvider(editing.providerId)
      const apiKey = provider?.useGitHubToken
        ? (settings.githubToken || localStorage.getItem('github_token') || '')
        : editing.apiKey
      const result = await testAIConnection({
        endpoint: editing.endpoint || provider?.endpoint || '',
        apiKey,
        model: editing.model,
      }, lang)
      setTestResult(result)
    } catch (err) {
      setTestResult({ ok: false, message: `${t('common.error')}: ${err instanceof Error ? err.message : t('settings.unknown')}` })
    } finally {
      setTesting(false)
    }
  }

  const currentProvider = editing ? getProvider(editing.providerId) : null

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal settings-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h3>{t('settings.title')}</h3>
          <button className="settings-close-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="settings-modal-body">
          {/* ─── GitHub 配置 ─────────────────────────────────────── */}
          <div className="settings-section">
            <h4 className="settings-section-title">{t('settings.githubConfig')}</h4>
            <label className="settings-field-label">
              Personal Access Token
              <a
                href="https://github.com/settings/tokens/new?scopes=public_repo&description=GitHub%20Insights"
                target="_blank" rel="noopener noreferrer"
                className="settings-link"
              >
                {t('settings.getToken')}
              </a>
            </label>
            <div className="settings-inline-row">
              <input
                type="password"
                className="settings-field-input settings-field-flex"
                placeholder="ghp_xxxxxxxxxxxx"
                value={settings.githubToken}
                onChange={e => setSettings({ ...settings, githubToken: e.target.value })}
              />
              <button className="btn-secondary settings-save-btn" onClick={handleSaveGitHub}>{t('common.save')}</button>
            </div>
            <p className="settings-field-hint">
              {t('settings.rateLimit')}
            </p>
          </div>

          {/* ─── AI 模型管理 ────────────────────────────────────── */}
          <div className="settings-section">
            <div className="settings-section-header">
              <h4 className="settings-section-title">{t('settings.aiModels')}</h4>
              <button className="btn-secondary btn-sm" onClick={handleAddModel}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('settings.addModel')}
              </button>
            </div>

            {models.length === 0 && !editing && (
              <div className="settings-empty">
                <p>{t('settings.noModels')}</p>
                <p className="settings-field-hint">{t('settings.noModelsHint')}</p>
              </div>
            )}

            {/* 模型列表 */}
            {models.length > 0 && !editing && (
              <div className="model-list">
                {models.map(m => {
                  const provider = getProvider(m.providerId)
                  const isActive = m.id === activeId
                  const isTranslation = m.id === settings.aiTranslationModelId
                  return (
                    <div key={m.id} className={`model-card ${isActive ? 'model-card-active' : ''}`}>
                      <div className="model-card-info">
                        <div className="model-card-name">
                          {m.name}
                          {isActive && <span className="model-badge-active">{t('settings.active')}</span>}
                          {isTranslation && <span className="model-badge-translation">{t('settings.translation')}</span>}
                        </div>
                        <div className="model-card-meta">
                          <span className="model-provider-tag">{provider?.name || m.providerId}</span>
                          <span className="model-name-tag">{m.model}</span>
                        </div>
                      </div>
                      <div className="model-card-actions">
                        {!isActive && (
                          <button className="btn-icon-sm" title={t('settings.activate')} onClick={() => handleActivate(m.id)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        )}
                        {!isTranslation && (
                          <button className="btn-icon-sm" title={t('settings.setTranslation')} onClick={() => handleSetTranslation(m.id)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04z" />
                            </svg>
                          </button>
                        )}
                        {isTranslation && (
                          <button className="btn-icon-sm btn-icon-active" title={t('settings.unsetTranslation')} onClick={() => handleSetTranslation(null)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0">
                              <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04z" />
                            </svg>
                          </button>
                        )}
                        <button className="btn-icon-sm" title={t('common.edit')} onClick={() => handleEditModel(m)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="btn-icon-sm btn-icon-danger" title={t('common.delete')} onClick={() => handleDeleteModel(m.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 编辑/新建表单 */}
            {editing && (
              <div className="model-form">
                <div className="model-form-title">
                  {editing.id ? t('settings.editModelTitle') : t('settings.addModelTitle')}
                </div>

                {/* 提供商 */}
                <label className="settings-field-label">{t('settings.provider')}</label>
                <select
                  className="settings-field-input"
                  value={editing.providerId}
                  onChange={e => handleProviderChange(e.target.value)}
                >
                  {AI_PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                {/* 别名 */}
                <label className="settings-field-label">{t('settings.modelAlias')}</label>
                <input
                  type="text"
                  className="settings-field-input"
                  placeholder={`${currentProvider?.name || t('settings.model')} - My Config`}
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                />

                {/* 模型选择 */}
                <label className="settings-field-label">{t('settings.model')}</label>
                {currentProvider && currentProvider.models.length > 0 && !editing.isCustomModel ? (
                  <div className="model-select-row">
                    <select
                      className="settings-field-input settings-field-flex"
                      value={editing.model}
                      onChange={e => setEditing({ ...editing, model: e.target.value })}
                    >
                      {currentProvider.models.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <button
                      className="btn-text-sm"
                      onClick={() => setEditing({ ...editing, isCustomModel: true, model: '' })}
                    >
                      {t('settings.custom')}
                    </button>
                  </div>
                ) : (
                  <div className="model-select-row">
                    <input
                      type="text"
                      className="settings-field-input settings-field-flex"
                      placeholder={t('settings.modelPlaceholder')}
                      value={editing.model}
                      onChange={e => setEditing({ ...editing, model: e.target.value })}
                    />
                    {currentProvider && currentProvider.models.length > 0 && (
                      <button
                        className="btn-text-sm"
                        onClick={() => setEditing({ ...editing, isCustomModel: false, model: currentProvider.models[0] })}
                      >
                        {t('settings.selectPreset')}
                      </button>
                    )}
                  </div>
                )}

                {/* Endpoint */}
                <label className="settings-field-label">API Endpoint</label>
                {currentProvider?.id === 'custom' ? (
                  <input
                    type="text"
                    className="settings-field-input"
                    placeholder="https://api.example.com/v1/chat/completions"
                    value={editing.endpoint}
                    onChange={e => setEditing({ ...editing, endpoint: e.target.value })}
                  />
                ) : (
                  <input
                    type="text"
                    className="settings-field-input settings-field-readonly"
                    value={editing.endpoint || currentProvider?.endpoint || ''}
                    readOnly
                  />
                )}

                {/* API Key */}
                {!currentProvider?.useGitHubToken && (
                  <>
                    <label className="settings-field-label">API Key</label>
                    <input
                      type="password"
                      className="settings-field-input"
                      placeholder="sk-xxxxxxxxxxxx"
                      value={editing.apiKey}
                      onChange={e => setEditing({ ...editing, apiKey: e.target.value })}
                    />
                  </>
                )}
                {currentProvider?.useGitHubToken && (
                  <p className="settings-field-hint">
                    {t('settings.useGitHubToken')}
                  </p>
                )}

                {/* 操作按钮 */}
                <div className="model-form-actions">
                  <button className="btn-secondary" onClick={handleCancelEdit}>{t('common.cancel')}</button>
                  <button className="btn-secondary" onClick={handleTestModel} disabled={testing}>
                    {testing ? t('settings.testing') : t('settings.testConnection')}
                  </button>
                  <button className="btn-primary" onClick={handleSaveModel} disabled={!editing.model}>
                    {editing.id ? t('common.save') : t('settings.addModel')}
                  </button>
                </div>

                {testResult && (
                  <p className={`settings-test-result ${testResult.ok ? 'ok' : 'error'}`}>
                    {testResult.message}
                  </p>
                )}
              </div>
            )}

            {/* 描述翻译说明 */}
            {!editing && (
              <div className="settings-translation-info">
                <p className="settings-field-hint">
                  <strong>{t('settings.descTranslation')}</strong>
                  {settings.aiTranslationModelId
                    ? t('settings.useAI', { name: models.find(m => m.id === settings.aiTranslationModelId)?.name || t('settings.unknown') })
                    : t('settings.useMyMemory')
                  }
                </p>
              </div>
            )}
          </div>

          {/* ─── 版本更新 ─────────────────────────────────────── */}
          <div className="settings-section">
            <h4 className="settings-section-title">{t('settings.update')}</h4>

            <div className="update-grid">
              {/* 左：当前版本 + 检查按钮 */}
              <div className="update-current">
                <div className="update-label">{t('settings.updateCurrent')}</div>
                <div className="update-version-current">v{CURRENT_VERSION}</div>
                <button
                  className="btn-secondary update-check-btn"
                  onClick={handleCheckUpdate}
                  disabled={updateChecking}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                  {updateChecking ? t('settings.updateChecking') : t('settings.updateCheck')}
                </button>
                {lastCheckedAt && (
                  <div className="update-last-check">
                    {t('settings.updateLastCheck')}：{formatDate(lastCheckedAt, lang)} {new Date(lastCheckedAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              {/* 右：检查结果 */}
              <div className="update-result">
                {updateResult === null && (
                  <div className="update-placeholder">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p>{t('settings.updateCheck')}</p>
                  </div>
                )}

                {updateResult?.kind === 'up-to-date' && (
                  <div className="update-card update-card-ok">
                    <div className="update-card-header">
                      <span className="update-badge update-badge-ok">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {t('settings.updateUpToDate')}
                      </span>
                    </div>
                    <div className="update-card-body">
                      <div className="update-info-row">
                        <span className="update-info-label">{t('settings.updateLatest')}</span>
                        <span className="update-info-value">v{updateResult.latest?.version || CURRENT_VERSION}</span>
                      </div>
                      {updateResult.latest && (
                        <div className="update-info-row">
                          <span className="update-info-label">{t('settings.updatePublishedAt')}</span>
                          <span className="update-info-value">{formatDate(updateResult.latest.publishedAt, lang)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {updateResult?.kind === 'update-available' && (
                  <div className="update-card update-card-new">
                    <div className="update-card-header">
                      <span className="update-badge update-badge-new">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {t('settings.updateAvailable')}
                      </span>
                    </div>
                    <div className="update-card-body">
                      <div className="update-info-row">
                        <span className="update-info-label">{t('settings.updateLatest')}</span>
                        <span className="update-info-value update-version-new">v{updateResult.latest.version}</span>
                      </div>
                      <div className="update-info-row">
                        <span className="update-info-label">{t('settings.updatePublishedAt')}</span>
                        <span className="update-info-value">{formatDate(updateResult.latest.publishedAt, lang)}</span>
                      </div>
                      {updateResult.latest.assetSize > 0 && (
                        <div className="update-info-row">
                          <span className="update-info-label">{t('settings.updateFileSize')}</span>
                          <span className="update-info-value">{formatBytes(updateResult.latest.assetSize)}</span>
                        </div>
                      )}
                      {updateResult.latest.exeUrl ? (
                        <>
                          <a
                            className="btn-primary update-download-btn"
                            href={updateResult.latest.exeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            {t('settings.updateDownload')}
                          </a>
                          <p className="update-hint">{t('settings.updateDownloadHint')}</p>
                        </>
                      ) : (
                        <>
                          <p className="update-hint update-hint-warn">{t('settings.updateNoExe')}</p>
                          <a
                            className="btn-secondary update-download-btn"
                            href={updateResult.latest.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t('settings.updateViewRelease')}
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {updateResult?.kind === 'error' && (
                  <div className="update-card update-card-error">
                    <div className="update-card-header">
                      <span className="update-badge update-badge-error">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {t('settings.updateError')}
                      </span>
                    </div>
                    <div className="update-card-body">
                      <p className="update-error-msg">{updateResult.message}</p>
                      <a
                        className="btn-text-sm"
                        href={RELEASES_PAGE}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t('settings.updateViewRelease')} →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="settings-modal-footer">
          {saved && <span className="settings-saved-hint">{t('settings.saved')}</span>}
          <button className="btn-primary" onClick={onClose}>{t('common.done')}</button>
        </div>
      </div>
    </div>
  )
}
