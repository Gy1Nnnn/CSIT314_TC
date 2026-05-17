/* eslint-disable react-hooks/set-state-in-effect */
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
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
import CategoriesPage from './pages/CategoriesPage.jsx'
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

function Home({ user }) {
  const location = useLocation()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [donatePick, setDonatePick] = useState(null)
  const [viewActivity, setViewActivity] = useState(null)
  const [viewOpeningId, setViewOpeningId] = useState(null)
  const [supportAmount, setSupportAmount] = useState('')
  const [supportSaving, setSupportSaving] = useState(false)
  const [supportErr, setSupportErr] = useState(null)
  const [supportOk, setSupportOk] = useState(null)

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

  useEffect(() => {
    if (!donatePick) {
      setSupportAmount('')
      setSupportErr(null)
      setSupportOk(null)
      setSupportSaving(false)
    }
  }, [donatePick])

  async function refreshCategoriesQuietly() {
    try {
      const data = await api.listCategoriesWithActivities()
      const list = Array.isArray(data.categories) ? data.categories : []
      setCategories(
        list
          .filter((c) => !c.is_suspended)
          .map((c) => ({
            ...c,
            activities: Array.isArray(c.activities) ? c.activities : [],
          })),
      )
    } catch {
      /* ignore refresh errors */
    }
  }

  async function submitDonation() {
    if (!donatePick) return
    const amt = Number(String(supportAmount).replace(/,/g, '').trim())
    if (!Number.isFinite(amt) || amt <= 0) {
      setSupportErr('Enter an amount greater than zero.')
      return
    }
    setSupportSaving(true)
    setSupportErr(null)
    setSupportOk(null)
    try {
      await api.recordDoneeDonation({
        accountId: user?.account_id,
        activityId: donatePick.activity.activity_id,
        amount: amt,
      })
      setSupportOk('Thank you! Your donation has been recorded toward this campaign.')
      setSupportAmount('')
      await refreshCategoriesQuietly()
    } catch (e) {
      setSupportErr(e?.data?.message || e?.message || 'Could not save.')
    } finally {
      setSupportSaving(false)
    }
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

  if (selectedCategoryId != null) {
    return <Navigate to={`/categories?cat=${selectedCategoryId}#browse`} replace />
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

          <section className="home-hero-info">
            <div className="home-hero-info-inner">
              <h2 className="home-hero-info-stat">
                Real causes, supported by real people every day on Courage.
              </h2>
              <p className="home-hero-info-desc">
                Courage is a community fundraising platform: organisers publish campaigns by cause,
                and supporters discover work that matters close to home or far away. We focus on
                clarity and trust—so every story of need and every act of generosity can be seen,
                shared, and built on together.
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
            <div className="home-selected-panel home-cat-panel" id={`cat-${selectedCategory.category_id}`}>
              <div className="home-campaigns-intro home-cat-intro">
                <h2 className="home-campaigns-title">{selectedCategory.category_name}</h2>
                {selectedCategory.description ? (
                  <p className="home-campaigns-sub">{selectedCategory.description}</p>
                ) : (
                  <p className="home-campaigns-sub">
                    Discover active fundraisers in this category—open a campaign for full details or tap{' '}
                    <strong>Donate</strong> to contribute.
                  </p>
                )}
                <p className="home-cat-browse-all">
                  <Link to={{ pathname: '/categories', hash: 'browse' }}>Browse all categories</Link>
                </p>
              </div>
              {selectedCategory.activities.length === 0 ? (
                <div className="home-cat-empty">
                  <p className="home-muted">No fundraisers in this category yet.</p>
                </div>
              ) : (
                <ul
                  className="home-cat-cards"
                  aria-label={`Fundraisers in ${selectedCategory.category_name}`}
                >
                  {selectedCategory.activities.map((a) => {
                    const initial = (a.activity_name || '?').trim().slice(0, 1).toUpperCase()
                    const goal =
                      a.target_amount === 0 || a.target_amount
                        ? Number(a.target_amount).toLocaleString()
                        : null
                    const raisedNum =
                      a.amount_raised === 0 || a.amount_raised ? Number(a.amount_raised) : 0
                    const targetNum =
                      a.target_amount === 0 || a.target_amount ? Number(a.target_amount) : null
                    const pct =
                      targetNum != null && targetNum > 0 && Number.isFinite(raisedNum)
                        ? Math.min(100, (raisedNum / targetNum) * 100)
                        : 0
                    const desc = (a.description || '').trim()
                    return (
                      <li key={a.activity_id} className="home-cat-tile">
                        <div className="home-cat-tile-inner">
                          <div className="home-cat-tile-media" aria-hidden>
                            <span className="home-cat-tile-initial">{initial}</span>
                          </div>
                          <div className="home-cat-tile-main">
                            <button
                              type="button"
                              className="home-cat-tile-hit"
                              disabled={viewOpeningId === a.activity_id}
                              onClick={() =>
                                openActivityDetail(a, selectedCategory.category_name)
                              }
                            >
                              <h3 className="home-cat-tile-title">{a.activity_name}</h3>
                              {desc ? <p className="home-cat-tile-desc">{desc}</p> : null}
                              {goal != null || raisedNum > 0 ? (
                                <div className="home-cat-tile-goal">
                                  <div className="home-cat-tile-goal-row">
                                    <span className="home-cat-tile-goal-label">Raised</span>
                                    <span className="home-cat-tile-goal-value">
                                      {Number.isFinite(raisedNum) ? raisedNum.toLocaleString() : '0'}
                                    </span>
                                  </div>
                                  {goal != null ? (
                                    <div className="home-cat-tile-goal-row">
                                      <span className="home-cat-tile-goal-label">Goal</span>
                                      <span className="home-cat-tile-goal-value">{goal}</span>
                                    </div>
                                  ) : null}
                                  <div className="home-cat-tile-track" aria-hidden>
                                    <div
                                      className="home-cat-tile-track-fill"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </button>
                          </div>
                          <div className="home-cat-tile-cta">
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
                      </li>
                    )
                  })}
                </ul>
              )}
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
            <div className="modal-body home-support-modal">
              <p className="home-support-lead">
                <strong>{donatePick.activity.activity_name}</strong>
                <span className="home-support-meta"> · {donatePick.categoryName}</span>
              </p>
              {supportOk ? (
                <div className="alert success" role="status">
                  {supportOk}
                </div>
              ) : null}
              {supportErr ? (
                <div className="alert error" role="alert">
                  {supportErr}
                </div>
              ) : null}
              {!supportOk ? (
                <div className="home-support-fields">
                  <label className="home-support-field home-support-field--full">
                    <span>Donation amount</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={supportAmount}
                      onChange={(e) => setSupportAmount(e.target.value)}
                      placeholder="e.g. 25"
                      disabled={supportSaving}
                      autoFocus
                      aria-label="Donation amount"
                    />
                  </label>
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              {supportOk ? (
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setDonatePick(null)}
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={supportSaving}
                    onClick={submitDonation}
                  >
                    {supportSaving ? 'Saving…' : 'Donate'}
                  </button>
                  <button type="button" className="btn" onClick={() => setDonatePick(null)}>
                    Cancel
                  </button>
                </>
              )}
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
              <dt>Raised</dt>
              <dd>
                {viewActivity.activity.amount_raised === 0 ||
                viewActivity.activity.amount_raised
                  ? Number(viewActivity.activity.amount_raised).toLocaleString()
                  : '0'}
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
                Donate to this campaign
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
      void 0
    }
  }, [])

  function handleLogin(u) {
    setUser(u)
    try {
      localStorage.setItem('auth_user', JSON.stringify(u))
    } catch {
      void 0
    }
  }

  function handleLogout() {
    setUser(null)
    try {
      localStorage.removeItem('auth_user')
    } catch {
      void 0
    }
  }

  const role = (user?.profile_name || '').toLowerCase()

  return (
    <div className="app-root">
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <div className="app-shell">
          <NavBar user={user} onLogout={handleLogout} />
          <div className="app-shell-main">
            <Routes>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/categories" element={<CategoriesPage user={user} />} />
              <Route
                path="/login"
                element={<LoginPage onLogin={handleLogin} />}
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
                    <ReportsPage user={user} />
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
          <Footer />
        </div>
      </BrowserRouter>
    </div>
  )
}

export default App
