import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import CategoryIcon from './CategoryIcon.jsx'
import { api } from '../api/ApiClient.js'
import './Logo.css'
import './NavBar.css'

const ROLE_LABEL = {
  'user admin': 'User Admin',
  fundraiser: 'Fundraising Rep',
  'platform manager': 'Platform Manager',
  donee: 'Donee',
}

function roleLabel(profileName) {
  const key = String(profileName || '').toLowerCase()
  return ROLE_LABEL[key] || profileName || 'Guest'
}

function publicRoleTitle(profileName) {
  const key = String(profileName || '').toLowerCase()
  if (key === 'user admin') return 'Admin'
  if (key === 'fundraiser') return 'Fundraiser'
  if (key === 'platform manager') return 'Platform Manager'
  if (key === 'donee') return 'Donee'
  return roleLabel(profileName)
}

function MenuLink({ to, end, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `topbar-link${isActive ? ' active' : ''}`}
    >
      {children}
    </NavLink>
  )
}

function HeartLeafIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 19s-6-3.7-6-9a3.5 3.5 0 0 1 6-2.45A3.5 3.5 0 0 1 18 10c0 5.3-6 9-6 9z"
        stroke="#1f6f4a"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DonateDropdown() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('menu')
  const [cats, setCats] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!open || loaded) return
    let cancelled = false
    api
      .listCategoriesWithActivities()
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data.categories) ? data.categories : []
        setCats(list.filter((c) => !c.is_suspended))
        setLoaded(true)
      })
      .catch((e) => {
        if (cancelled) return
        setErr(e?.data?.message || e?.message || 'Could not load categories.')
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [open, loaded])

  useEffect(() => {
    function handler(e) {
      if (!open) return
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setView('menu')
      }
    }
    function keyHandler(e) {
      if (e.key === 'Escape') {
        setOpen(false)
        setView('menu')
      }
    }
    window.addEventListener('mousedown', handler)
    window.addEventListener('keydown', keyHandler)
    return () => {
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('keydown', keyHandler)
    }
  }, [open])

  function toggle() {
    setOpen((v) => {
      const next = !v
      if (!next) setView('menu')
      return next
    })
  }

  function closeAll() {
    setOpen(false)
    setView('menu')
  }

  return (
    <div className="topbar-donate" ref={ref}>
      <button
        type="button"
        className="topbar-donate-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        Donate
        <span className="topbar-caret" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="topbar-donate-menu" role="menu">
          <div className="topbar-donate-header">
            <span className="topbar-donate-header-icon" aria-hidden="true">
              <HeartLeafIcon />
            </span>
            <span className="topbar-donate-header-text">Discover fundraisers to support</span>
          </div>

          {view === 'menu' ? (
            <button
              type="button"
              role="menuitem"
              className="topbar-donate-row"
              onClick={() => setView('categories')}
              aria-haspopup="true"
              aria-expanded={false}
            >
              <span className="topbar-donate-row-text">
                <span className="topbar-donate-row-title">Categories</span>
                <span className="topbar-donate-row-sub">Browse fundraisers by category</span>
              </span>
              <span className="topbar-donate-row-caret" aria-hidden="true">›</span>
            </button>
          ) : (
            <div className="topbar-donate-cats">
              <button
                type="button"
                className="topbar-donate-back"
                onClick={() => setView('menu')}
              >
                ‹ Back
              </button>
              {!loaded ? (
                <div className="topbar-donate-empty">Loading…</div>
              ) : err ? (
                <div className="topbar-donate-empty">{err}</div>
              ) : cats.length === 0 ? (
                <div className="topbar-donate-empty">No categories yet.</div>
              ) : (
                <div className="topbar-donate-grid">
                  {cats.map((c, i) => (
                    <Link
                      key={c.category_id}
                      to={`/?cat=${c.category_id}#browse`}
                      className="topbar-donate-item"
                      role="menuitem"
                      onClick={closeAll}
                    >
                      <span className="topbar-donate-icon">
                        <CategoryIcon name={c.category_name} index={i} />
                      </span>
                      <span className="topbar-donate-label">{c.category_name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function NavBar({ user, onLogout }) {
  const navigate = useNavigate()
  const role = (user?.profile_name || '').toLowerCase()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (!menuOpen) return
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [menuOpen])

  function handleLogoutClick() {
    setMenuOpen(false)
    setConfirmLogout(true)
  }

  function performLogout() {
    setConfirmLogout(false)
    onLogout?.()
    navigate('/login', { replace: true })
  }

  return (
    <header className="topbar">
      <div className={`topbar-inner ${user ? 'topbar-inner--auth' : 'topbar-inner--guest'}`}>
        <div className="topbar-side topbar-side--left">
          <DonateDropdown />
          {user ? (
            <nav className="topbar-nav" aria-label="Sections">
              {role === 'user admin' ? (
                <>
                  <MenuLink to="/admin/user-accounts">User Accounts</MenuLink>
                  <MenuLink to="/admin/user-profiles">User Profiles</MenuLink>
                </>
              ) : null}
              {role === 'platform manager' ? (
                <>
                  <MenuLink to="/platform">FRA Categories</MenuLink>
                  <MenuLink to="/platform/reports">Reports</MenuLink>
                </>
              ) : null}
              {role === 'fundraiser' ? (
                <MenuLink to="/fundraiser">Activities</MenuLink>
              ) : null}
              {role === 'donee' ? <MenuLink to="/donee">Browse</MenuLink> : null}
            </nav>
          ) : null}
        </div>

        <div className="topbar-center">
          <Link className="topbar-brand" to="/">
            <Logo size="md" variant="wordmark" />
          </Link>
        </div>

        <div className="topbar-side topbar-side--right">
          {!user ? (
            <>
              <Link className="topbar-text-link" to={{ pathname: '/', hash: 'site-footer' }}>
                About
              </Link>
              <Link className="btn btn-signin-pill" to="/login">
                Sign in
              </Link>
            </>
          ) : (
            <>
              <span className="topbar-role-badge" title={roleLabel(user.profile_name)}>
                {publicRoleTitle(user.profile_name)}
              </span>
              <div className="topbar-user" ref={menuRef}>
                <button
                  type="button"
                  className="topbar-user-btn"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <span className="topbar-avatar" aria-hidden="true">
                    {(user.name || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="topbar-user-text">
                    <span className="topbar-user-name">{user.name || 'User'}</span>
                    <span className="topbar-user-role">{roleLabel(user.profile_name)}</span>
                  </span>
                  <span className="topbar-caret" aria-hidden="true">▾</span>
                </button>
                {menuOpen ? (
                  <div className="topbar-menu" role="menu">
                    <div className="topbar-menu-heading">{roleLabel(user.profile_name)}</div>
                    <button
                      type="button"
                      role="menuitem"
                      className="topbar-menu-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      {role === 'fundraiser'
                        ? 'My account'
                        : role === 'platform manager'
                          ? 'Account'
                          : 'Profile'}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="topbar-menu-item danger"
                      onClick={handleLogoutClick}
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {confirmLogout ? (
        <div
          className="modal-root"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmLogout(false)
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            <div className="modal-head">
              <h2 id="logout-title">Log out?</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setConfirmLogout(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="modal-body">
              You will be signed out and returned to the login screen.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setConfirmLogout(false)}>
                Cancel
              </button>
              <button type="button" className="btn primary" onClick={performLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}
