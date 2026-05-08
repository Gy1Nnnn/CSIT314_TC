/* eslint-disable react-hooks/set-state-in-effect */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import NavBar from './components/NavBar.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import UserProfilePage from './pages/UserProfilePage.jsx'
import UserAccountPage from './pages/UserAccountPage.jsx'
import FundraiserPage from './pages/FundraiserPage.jsx'
import ManagePlatformPage from './pages/ManagePlatformPage.jsx'
import { api } from './api/ApiClient.js'
import './App.css'

function Home() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await api.listCategories()
        if (cancelled) return
        const list = Array.isArray(data.categories) ? data.categories : []
        // active only
        setCategories(list.filter((c) => !c.is_suspended))
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
              <button type="button" className="cat-btn" disabled>
                Donate
              </button>
            </article>
          ))}
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
    <BrowserRouter>
      <NavBar user={user} onLogout={handleLogout} />
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
            user && (user.profile_name || '').toLowerCase() === 'platform management' ? (
              <ManagePlatformPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
