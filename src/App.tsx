import { useState, useCallback } from 'react'
import type { Repo } from './github'
import { I18nContext, useI18nProvider, useI18n } from './i18n'
import TrendingList from './components/TrendingList'
import TrendingDevelopers from './components/TrendingDevelopers'
import TopReposList from './components/TopReposList'
import RepoDetail from './components/RepoDetail'
import Favorites from './components/Favorites'
import History from './components/History'
import Settings from './components/Settings'

type View = 'trending' | 'developers' | 'new2026' | 'alltime' | 'favorites' | 'history'

function AppContent() {
  const { t, lang, setLang } = useI18n()
  const [currentView, setCurrentView] = useState<View>('trending')
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const handleOpenDetail = useCallback((repo: Repo) => {
    setSelectedRepo(repo)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedRepo(null)
  }, [])

  const handleNavClick = useCallback((view: View) => {
    setCurrentView(view)
    setSelectedRepo(null)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-left">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="header-logo" />
          </div>

          {!selectedRepo && (
            <nav className="header-nav">
              <button
                className={`nav-tab ${currentView === 'trending' ? 'active' : ''}`}
                onClick={() => handleNavClick('trending')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
                </svg>
                Repos
              </button>
              <button
                className={`nav-tab ${currentView === 'developers' ? 'active' : ''}`}
                onClick={() => handleNavClick('developers')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
                Developers
              </button>
              <button
                className={`nav-tab ${currentView === 'new2026' ? 'active' : ''}`}
                onClick={() => handleNavClick('new2026')}
                title={t('nav.newRepos2026')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {t('nav.newRepos2026')}
              </button>
              <button
                className={`nav-tab ${currentView === 'alltime' ? 'active' : ''}`}
                onClick={() => handleNavClick('alltime')}
                title={t('nav.topStar')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {t('nav.topStar')}
              </button>
              <button
                className={`nav-tab ${currentView === 'favorites' ? 'active' : ''}`}
                onClick={() => handleNavClick('favorites')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
                {t('nav.favorites')}
              </button>
              <button
                className={`nav-tab ${currentView === 'history' ? 'active' : ''}`}
                onClick={() => handleNavClick('history')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                {t('nav.history')}
              </button>
            </nav>
          )}

          <div className="header-right">
            <button
              className="lang-toggle-btn"
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              title={lang === 'zh' ? 'Switch to English' : '切换到中文'}
            >
              {lang === 'zh' ? 'EN' : '中'}
            </button>
            <button
              className="settings-icon-btn"
              onClick={() => setShowSettings(true)}
              title={t('nav.settings')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div style={{ display: selectedRepo ? 'none' : 'block' }}>
          <div style={{ display: currentView === 'trending' ? 'block' : 'none' }}>
            <TrendingList
              onOpenDetail={handleOpenDetail}
              active={!selectedRepo && currentView === 'trending'}
            />
          </div>
          <div style={{ display: currentView === 'developers' ? 'block' : 'none' }}>
            <TrendingDevelopers active={!selectedRepo && currentView === 'developers'} />
          </div>
          <div style={{ display: currentView === 'new2026' ? 'block' : 'none' }}>
            <TopReposList
              mode="new2026"
              active={!selectedRepo && currentView === 'new2026'}
              onOpenDetail={handleOpenDetail}
            />
          </div>
          <div style={{ display: currentView === 'alltime' ? 'block' : 'none' }}>
            <TopReposList
              mode="alltime"
              active={!selectedRepo && currentView === 'alltime'}
              onOpenDetail={handleOpenDetail}
            />
          </div>
          <div style={{ display: currentView === 'favorites' ? 'block' : 'none' }}>
            <Favorites onOpenDetail={handleOpenDetail} />
          </div>
          <div style={{ display: currentView === 'history' ? 'block' : 'none' }}>
            <History onOpenDetail={handleOpenDetail} />
          </div>
        </div>
        {selectedRepo && (
          <RepoDetail repo={selectedRepo} onBack={handleBack} />
        )}
      </main>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}

export default function App() {
  const i18n = useI18nProvider()
  return (
    <I18nContext.Provider value={i18n}>
      <AppContent />
    </I18nContext.Provider>
  )
}
