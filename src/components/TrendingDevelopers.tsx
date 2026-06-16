import { useState, useRef, useEffect } from 'react'
import type { Developer } from '../github'
import { fetchTrendingDevelopers } from '../github'
import { useI18n } from '../i18n'

type Period = 'today' | 'week' | 'month'

type Props = {
  /** 视图是否处于激活状态（display !== 'none'）。激活且未加载时自动刷新 */
  active?: boolean
}

export default function TrendingDevelopers({ active = true }: Props) {
  const { t } = useI18n()
  const [period, setPeriod] = useState<Period>('today')
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const loadId = useRef(0)

  const PERIOD_LABEL: Record<Period, string> = {
    today: t('common.today'),
    week: t('common.week'),
    month: t('common.month'),
  }

  // 视图首次激活时自动加载数据（“首次进入自动刷新”）
  useEffect(() => {
    if (active && !loaded && !loading) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const loadData = async (p?: Period) => {
    const currentPeriod = p || period
    const myId = ++loadId.current
    setLoading(true)
    setError(null)
    try {
      const devs = await fetchTrendingDevelopers(currentPeriod)
      if (myId !== loadId.current) return
      setDevelopers(devs)
      setLoaded(true)
    } catch (err) {
      if (myId !== loadId.current) return
      setError(err instanceof Error ? err.message : t('trending.loadFailed'))
    } finally {
      if (myId === loadId.current) setLoading(false)
    }
  }

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    if (loaded) loadData(p)
  }

  return (
    <div className="trending-page">
      <div className="trending-filters">
        <div className="filter-group">
          {(['today', 'week', 'month'] as Period[]).map(p => (
            <button
              key={p}
              className={`filter-btn ${period === p ? 'active' : ''}`}
              onClick={() => handlePeriodChange(p)}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>

        <button
          className="refresh-data-btn"
          onClick={() => loadData()}
          disabled={loading}
        >
          <svg className={loading ? 'spinning' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 11-6.22-8.56" />
            <path d="M21 3v5h-5" />
          </svg>
          {loading ? t('trending.refreshing') : t('trending.refresh')}
        </button>

        <span className="filter-count">
          {loaded ? t('dev.count', { n: developers.length }) : ''}
        </span>
      </div>

      {error && (
        <div className="page-error">
          <p>{error}</p>
          <button className="btn-secondary" onClick={() => loadData()}>{t('common.retry')}</button>
        </div>
      )}

      {loading && !error && (
        <div className="page-loading">
          <div className="spinner-lg" />
          <span>{t('dev.fetching')}</span>
        </div>
      )}

      {!loading && !error && !loaded && (
        <div className="page-empty">
          <p>{t('dev.clickRefresh')}</p>
        </div>
      )}

      {!loading && !error && loaded && developers.length === 0 && (
        <div className="page-empty">
          <p>{t('dev.noData')}</p>
        </div>
      )}

      {!loading && !error && loaded && (
        <div className="dev-list">
          {developers.slice(0, 25).map((dev, index) => (
            <a
              key={dev.username}
              href={dev.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              className="dev-card"
            >
              <span className={`dev-rank rank-${index + 1}`}>{index + 1}</span>
              <img src={dev.avatar_url} alt="" className="dev-avatar" loading="lazy" />
              <div className="dev-info">
                <div className="dev-name">{dev.display_name}</div>
                <div className="dev-username">@{dev.username}</div>
                {dev.popular_repo.full_name && (
                  <div className="dev-popular">
                    <span className="dev-popular-label">{t('dev.popularRepo')}</span>
                    <span className="dev-popular-name">{dev.popular_repo.full_name}</span>
                    {dev.popular_repo.description && (
                      <span className="dev-popular-desc">{dev.popular_repo.description}</span>
                    )}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
