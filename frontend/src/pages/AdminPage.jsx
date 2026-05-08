import { Link } from 'react-router-dom'
import './AdminPage.css'

export default function AdminPage({ user }) {
  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <h1>Admin</h1>
          <p className="admin-sub">
            Signed in as <strong>{user?.name || 'User'}</strong>
          </p>
        </div>
        <Link className="admin-back" to="/">
          Back to home
        </Link>
      </header>

      <section className="admin-grid" aria-label="Admin tools">
        <Link className="admin-card admin-card-link" to="/admin/user-profiles">
          <h2>Manage User Profile</h2>
          <p>Create, view, update, suspend, and search user profiles.</p>
        </Link>

        <Link className="admin-card admin-card-link" to="/admin/user-accounts">
          <h2>Manage User Account</h2>
          <p>Create, update, and assign accounts to profiles.</p>
        </Link>
      </section>
    </main>
  )
}

