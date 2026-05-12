import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'
import './Logo.css'
import './Footer.css'

function publicRoleTitle(profileName) {
  const key = String(profileName || '').toLowerCase()
  if (key === 'user admin') return 'Admin'
  if (key === 'fundraiser') return 'Fundraiser'
  if (key === 'platform manager') return 'Platform Manager'
  if (key === 'donee') return 'Donee'
  return 'Signed in'
}

function dashboardPath(profileName) {
  const key = String(profileName || '').toLowerCase()
  if (key === 'user admin') return '/admin/user-accounts'
  if (key === 'fundraiser') return '/fundraiser'
  if (key === 'platform manager') return '/platform'
  if (key === 'donee') return '/donee'
  return '/login'
}

export default function Footer({ user }) {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer" id="site-footer">
      <div className="site-footer-main">
        <div className="site-footer-row">
          <nav className="site-footer-nav" aria-label="Quick links">
            <Link className="site-footer-link" to={{ pathname: '/', hash: 'browse' }}>
              Browse fundraisers
            </Link>
            <Link className="site-footer-link" to="/login">
              Start a Courage
            </Link>
            {!user ? (
              <Link className="site-footer-signin" to="/login">
                Sign in
              </Link>
            ) : (
              <>
                <span className="site-footer-role" title="Your account role">
                  {publicRoleTitle(user.profile_name)}
                </span>
                <Link className="site-footer-link site-footer-link--strong" to={dashboardPath(user.profile_name)}>
                  Open dashboard
                </Link>
              </>
            )}
          </nav>
          <p className="site-footer-blurb">
            Explore campaigns by category on the home page. After you sign in, your role
            determines which tools you can access in the top navigation.
          </p>
        </div>
      </div>

      <div className="site-footer-bar">
        <div className="site-footer-bar-inner site-footer-bar-inner--simple">
          <p className="site-footer-copy">© {year} Courage.</p>
          <Link className="site-footer-brand-mark" to="/" aria-label="Courage home">
            <Logo size="sm" variant="wordmark" />
          </Link>
        </div>
      </div>
    </footer>
  )
}
