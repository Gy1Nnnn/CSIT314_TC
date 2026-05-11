/* eslint-disable react-hooks/set-state-in-effect */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import NavBar from './components/NavBar.jsx'
import Footer from './components/Footer.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import UserProfilePage from './pages/UserProfilePage.jsx'
import UserAccountPage from './pages/UserAccountPage.jsx'
import FundraiserPage from './pages/FundraiserPage.jsx'
import ManagePlatformPage from './pages/ManagePlatformPage.jsx'
import DoneePage from './pages/DoneePage.jsx'
import { api } from './api/ApiClient.js'
import './App.css'

function Home() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [donatePick, setDonatePick] = useState(null)

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

  return (
    <main className="main-content">
      <h1>Donate</h1>
      <p className="home-sub">Choose a category to donate.</p>

      {error ? (
        <div className="home-alert" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? <p className="home-muted">Loading categories…</p> : null}

      {!loading && categories.length === 0 ? (
        <p className="home-muted">No active categories yet.</p>
      ) : null}

      {!loading && categories.length > 0 ? (
        <div className="cat-grid" aria-label="Donation categories">
          {categories.map((c) => (
            <article key={c.category_id} className="cat-card">
              <h2 className="cat-title">{c.category_name}</h2>
              {c.description ? <p className="cat-desc">{c.description}</p> : null}
              <div className="cat-activities" aria-label="Fundraising activities in this category">
                <h3 className="cat-activities-heading">Activities</h3>
                {c.activities.length === 0 ? (
                  <p className="cat-activities-empty">No activities yet.</p>
                ) : (
                  <ul className="cat-activity-list">
                    {c.activities.map((a) => (
                      <li key={a.activity_id} className="cat-activity-item">
                        <div className="cat-activity-row">
                          <div className="cat-activity-copy">
                            <span className="cat-activity-name">{a.activity_name}</span>
                            {a.description ? (
                              <span className="cat-activity-desc">{a.description}</span>
                            ) : null}
                            {a.target_amount === 0 || a.target_amount ? (
                              <span className="cat-activity-meta">
                                Goal: {Number(a.target_amount).toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="cat-btn cat-btn-inline"
                            onClick={() =>
                              setDonatePick({
                                activity: a,
                                categoryName: c.category_name,
                              })
                            }
                          >
                            Donate
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {donatePick ? (
        <div
          className="home-modal-root"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDonatePick(null)
          }}
        >
          <div
            className="home-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-donate-title"
          >
            <h2 id="home-donate-title">Donate</h2>
            <p>
              You are supporting{' '}
              <strong>{donatePick.activity.activity_name}</strong> under{' '}
              <strong>{donatePick.categoryName}</strong>.
            </p>
            <p className="home-modal-note">
              This coursework app does not process real payments. Thank you for your interest.
            </p>
            <button type="button" className="cat-btn" onClick={() => setDonatePick(null)}>
              Close
            </button>
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

  return (
    <div className="app-root">
      <BrowserRouter>
        <div className="app-shell">
          <NavBar user={user} onLogout={handleLogout} />
          <div className="app-shell-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
              <Route
                path="/admin"
                element={
                  user && (user.profile_name || '').toLowerCase() === 'user admin' ? (
                    <AdminPage user={user} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/admin/user-profiles"
                element={
                  user && (user.profile_name || '').toLowerCase() === 'user admin' ? (
                    <UserProfilePage />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/admin/user-accounts"
                element={
                  user && (user.profile_name || '').toLowerCase() === 'user admin' ? (
                    <UserAccountPage />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/fundraiser"
                element={
                  user && (user.profile_name || '').toLowerCase() === 'fundraiser' ? (
                    <FundraiserPage user={user} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/platform"
                element={
                  user && (user.profile_name || '').toLowerCase() === 'platform manager' ? (
                    <ManagePlatformPage />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/donee"
                element={
                  user && (user.profile_name || '').toLowerCase() === 'donee' ? (
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
