import { Link } from 'react-router-dom'
import './NavBar.css'

export default function NavBar({ user, onLogout }) {
  const role = (user?.profile_name || '').toLowerCase()
  return (
    <header className="site-header">
      <nav className="nav-bar" aria-label="Main">
        <div className="nav-left">
          <Link className="nav-brand" to="/">
            Site
          </Link>
          <Link className="nav-donate" to="/">
            Donate
          </Link>
        </div>
        <div className="nav-actions">
          {user ? (
            <div className="nav-auth">
              {role === 'user admin' ? (
                <Link className="nav-link" to="/admin">
                  Admin
                </Link>
              ) : null}
              {role === 'fundraiser' ? (
                <Link className="nav-link" to="/fundraiser">
                  Fundraiser
                </Link>
              ) : null}
              {role === 'platform manager' ? (
                <Link className="nav-link" to="/platform">
                  Platform Manager
                </Link>
              ) : null}
              {role === 'donee' ? (
                <Link className="nav-link" to="/donee">
                  Donee
                </Link>
              ) : null}
              <button type="button" className="btn-login" onClick={onLogout}>
                Log out
              </button>
            </div>
          ) : (
            <Link className="btn-login" to="/login">
              Log in
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
