import { Link } from 'react-router-dom'
import './AdminPage.css'

export default function AdminPage({ user }) {
  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>User Admin Dashboard</h1>
          <p className="page-sub">
            Signed in as <strong>{user?.name || 'User'}</strong>. Manage user
            accounts and user profiles.
          </p>
        </div>
      </div>

      <section className="admin-grid" aria-label="Admin tools">
        <Link className="admin-tile" to="/admin/user-accounts">
          <div className="admin-tile-icon" aria-hidden="true">UA</div>
          <h2>User Accounts</h2>
          <p>Create, view, update, suspend, and search user accounts.</p>
          <span className="admin-tile-cta">Open →</span>
        </Link>

        <Link className="admin-tile" to="/admin/user-profiles">
          <div className="admin-tile-icon" aria-hidden="true">UP</div>
          <h2>User Profiles</h2>
          <p>Create, view, update, suspend, and search user profiles.</p>
          <span className="admin-tile-cta">Open →</span>
        </Link>
      </section>
    </main>
  )
}
