/* eslint-disable react-hooks/set-state-in-effect */
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import NavBar from './components/NavBar.jsx'
import Footer from './components/Footer.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import UserProfilePage from './pages/UserProfilePage.jsx'
import UserAccountPage from './pages/UserAccountPage.jsx'
import FundraiserPage from './pages/FundraiserPage.jsx'
import ManagePlatformPage from './pages/ManagePlatformPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import DoneePage from './pages/DoneePage.jsx'
import { api } from './api/ApiClient.js'
import CategoryIcon from './components/CategoryIcon.jsx'
import './App.css'

const HERO_BUBBLE_NAMES = [
  'Medical',
  'Emergency',
  'Education',
  'Animal',
  'Business',
  'Charity',
]

function Home() {
  const location = useLocation()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [donatePick, setDonatePick] = useState(null)
  const [viewActivity, setViewActivity] = useState(null)
  const [viewOpeningId, setViewOpeningId] = useState(null)

  const selectedCategoryId = useMemo(() => {
    const params = new URLSearchParams(location.search || '')
    const raw = params.get('cat')
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [location.search])

  useEffect(() => {
    const raw = (location.hash || '').replace(/^#/, '')
    if (raw === 'browse' || raw === 'site-footer') {
      window.requestAnimationFrame(() => {
        document.getElementById(raw)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [location.hash, loading, categories.length])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await api.listCategoriesWithActivities()
        if (cancelled) return
        const list = Array.isArray(data.categories) ? data.categories : []
        setCategories(
          list
            .filter((c) => !c.is_suspended)
            .map((c) => ({
              ...c,
              activities: Array.isArray(c.activities) ? c.activities : [],
            })),
        )
      } catch (e) {
        if (cancelled) return
        setError(
          e?.data?.message ||
            e?.message ||
            'Network error loading categories. Is the backend running?',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedCategory =
    selectedCategoryId == null
      ? null
      : categories.find((x) => x.category_id === selectedCategoryId) || null

  function clearCategory() {
    navigate('/', { replace: false })
  }

  async function openActivityDetail(activity, categoryName) {
    const id = activity?.activity_id
    if (id == null) return
    setViewOpeningId(id)
    setError(null)
    try {
      const data = await api.viewPublicActivity(id)
      const full = data?.activity
      if (!full) {
        setError('Could not load activity.')
        return
      }
      setViewActivity({ activity: full, categoryName })
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not load activity.')
    } finally {
      setViewOpeningId(null)
    }
  }

  return (
    <main className="home-page">
      {!selectedCategory ? (
        <>
          <section className="home-hero-gfm" aria-labelledby="home-hero-title">
            <div className="home-hero-stage">
              <div className="home-hero-bubbles" aria-hidden="true">
                {HERO_BUBBLE_NAMES.map((name, i) => (
                  <div key={name} className={`home-hero-bubble home-hero-bubble--${i + 1}`}>
                    <span className="home-hero-bubble-ring">
                      <span className="home-hero-bubble-icon">
                        <CategoryIcon name={name} index={i} />
                      </span>
                    </span>
                    <span className="home-hero-bubble-tag">{name}</span>
                  </div>
                ))}
              </div>
              <div className="home-hero-center">
                <p className="home-hero-eyebrow">A platform for everyday causes</p>
                <h1 id="home-hero-title" className="home-hero-title">
                  Small acts of courage,
                  <br />
                  big change for many.
                </h1>
              </div>
            </div>
          </section>

          <section className="home-hero-info" id="browse">
            <div className="home-hero-info-inner">
              <h2 className="home-hero-info-stat">
                Real causes, supported by real people every day on Courage.
              </h2>
              <p className="home-hero-info-desc">
                Use the <strong>Donate</strong> menu at the top to browse fundraisers by
                category. Pick a category to see active campaigns, tap a campaign for
                details, and donate to support the cause.
              </p>
            </div>
          </section>
        </>
      ) : null}

      {selectedCategory ? (
        <div className="home-body" id="browse">
          {error ? (
            <div className="alert error" role="alert">
              {error}
            </div>
          ) : null}

          {loading ? <p className="home-muted">Loading…</p> : null}

          {!loading ? (
            <div className="home-selected-panel" id={`cat-${selectedCategory.category_id}`}>
              <button type="button" className="home-back-cats" onClick={clearCategory}>
                ← Back to home
              </button>
              <div className="home-campaigns-intro">
                <h2 className="home-campaigns-title">{selectedCategory.category_name}</h2>
                {selectedCategory.description ? (
                  <p className="home-campaigns-sub">{selectedCategory.description}</p>
                ) : (
                  <p className="home-campaigns-sub">
                    Active campaigns in this category. Use <strong>View</strong> for details,
                    <strong> Donate</strong> to support, or tap the campaign name.
                  </p>
                )}
              </div>
              <article className="home-card home-card--detail home-card--single">
                <div
                  className="home-card-activities home-card-activities--open"
                  aria-label="Fundraising activities in this category"
                >
                  {selectedCategory.activities.length === 0 ? (
                    <p className="home-muted">No activities yet.</p>
                  ) : (
                    selectedCategory.activities.map((a) => (
                      <div key={a.activity_id} className="home-activity">
                        <button
                          type="button"
                          className="home-activity-main"
                          disabled={viewOpeningId === a.activity_id}
                          onClick={() =>
                            openActivityDetail(a, selectedCategory.category_name)
                          }
                        >
                          <div className="home-activity-name">{a.activity_name}</div>
                          {a.target_amount === 0 || a.target_amount ? (
                            <div className="home-activity-meta">
                              Goal: {Number(a.target_amount).toLocaleString()}
                            </div>
                          ) : null}
                        </button>
                        <div className="home-activity-actions">
                          <button
                            type="button"
                            className="btn sm"
                            disabled={viewOpeningId === a.activity_id}
                            onClick={() =>
                              openActivityDetail(a, selectedCategory.category_name)
                            }
                          >
                            {viewOpeningId === a.activity_id ? '…' : 'View'}
                          </button>
                          <button
                            type="button"
                            className="btn primary sm"
                            onClick={() =>
                              setDonatePick({
                                activity: a,
                                categoryName: selectedCategory.category_name,
                              })
                            }
                          >
                            Donate
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          ) : null}
        </div>
      ) : null}

      {donatePick ? (
        <div
          className="modal-root"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDonatePick(null)
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-donate-title"
          >
            <div className="modal-head">
              <h2 id="home-donate-title">Donate</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setDonatePick(null)}
              >
                ×
              </button>
            </div>
            <p className="modal-body">
              You are supporting{' '}
              <strong>{donatePick.activity.activity_name}</strong> under{' '}
              <strong>{donatePick.categoryName}</strong>.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => setDonatePick(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewActivity ? (
        <div
          className="modal-root"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewActivity(null)
          }}
        >
          <div
            className="modal-card lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-view-title"
          >
            <div className="modal-head">
              <h2 id="home-view-title">{viewActivity.activity.activity_name}</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setViewActivity(null)}
              >
                ×
              </button>
            </div>
            <dl className="detail-list" style={{ marginTop: '0.5rem' }}>
              <dt>Category</dt>
              <dd>{viewActivity.categoryName}</dd>
              <dt>Status</dt>
              <dd>{viewActivity.activity.status || '—'}</dd>
              <dt>Goal</dt>
              <dd>
                {viewActivity.activity.target_amount === 0 ||
                viewActivity.activity.target_amount
                  ? Number(viewActivity.activity.target_amount).toLocaleString()
                  : '—'}
              </dd>
              <dt>Start</dt>
              <dd>{viewActivity.activity.start_date || '—'}</dd>
              <dt>End</dt>
              <dd>{viewActivity.activity.end_date || '—'}</dd>
              <dt>Description</dt>
              <dd>{viewActivity.activity.description || '—'}</dd>
            </dl>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setViewActivity(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setDonatePick({
                    activity: viewActivity.activity,
                    categoryName: viewActivity.categoryName,
                  })
                  setViewActivity(null)
                }}
              >
                Donate
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user')
      if (raw) setUser(JSON.parse(raw))
    } catch {
      // ignore
    }
  }, [])

  function handleLogin(u) {
    setUser(u)
    try {
      localStorage.setItem('auth_user', JSON.stringify(u))
    } catch {
      // ignore
    }
  }

  function handleLogout() {
    setUser(null)
    try {
      localStorage.removeItem('auth_user')
    } catch {
      // ignore
    }
  }

  const role = (user?.profile_name || '').toLowerCase()

  return (
    <div className="app-root">
      <BrowserRouter>
        <div className="app-shell">
          <NavBar user={user} onLogout={handleLogout} />
          <div className="app-shell-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/login"
                element={<LoginPage onLogin={handleLogin} user={user} />}
              />
              <Route
                path="/admin"
                element={
                  user && role === 'user admin' ? (
                    <AdminPage user={user} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/admin/user-profiles"
                element={
                  user && role === 'user admin' ? (
                    <UserProfilePage />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/admin/user-accounts"
                element={
                  user && role === 'user admin' ? (
                    <UserAccountPage />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/fundraiser"
                element={
                  user && role === 'fundraiser' ? (
                    <FundraiserPage user={user} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/platform"
                element={
                  user && role === 'platform manager' ? (
                    <ManagePlatformPage />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/platform/reports"
                element={
                  user && role === 'platform manager' ? (
                    <ReportsPage />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/donee"
                element={
                  user && role === 'donee' ? (
                    <DoneePage user={user} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
            </Routes>
          </div>
          <Footer user={user} />
        </div>
      </BrowserRouter>
    </div>
  )
}

export default App
