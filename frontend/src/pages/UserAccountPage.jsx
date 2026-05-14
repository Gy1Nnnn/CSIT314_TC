/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react'
import { api } from '../api/ApiClient.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
import './UserAccountPage.css'

const VIEWS = { LIST: 'list', CREATE: 'create', UPDATE: 'update', VIEW: 'view' }

function AccountForm({ mode, initial, profiles, onCancel, onSubmit, busy }) {
  const [name, setName] = useState(initial?.name || '')
  const [email, setEmail] = useState(initial?.email || '')
  const [password, setPassword] = useState('')
  const [profileId, setProfileId] = useState(
    initial?.profile_id ? String(initial.profile_id) : '',
  )
  const [suspended, setSuspended] = useState(Boolean(initial?.is_suspended))

  const isEdit = mode === 'update'
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    (isEdit || password.trim().length > 0) &&
    String(profileId || '').trim().length > 0 &&
    !busy

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit) return
        const payload = {
          name: name.trim(),
          email: email.trim(),
          profile_id: Number(profileId),
        }
        if (password.trim()) payload.password = password
        payload.is_suspended = suspended
        onSubmit(payload)
      }}
    >
      <div className="form-grid">
        <div className="field">
          <label className="field-label" htmlFor="ac-username">
            Username <span className="req">*</span>
          </label>
          <input
            id="ac-username"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., alextan"
            required
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="ac-email">
            Email <span className="req">*</span>
          </label>
          <input
            id="ac-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g., alex@example.com"
            required
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="ac-password">
            {isEdit ? 'Reset Password' : (
              <>
                Password <span className="req">*</span>
              </>
            )}
          </label>
          <input
            id="ac-password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEdit ? 'Leave blank to keep' : '••••••••'}
            required={!isEdit}
          />
          {isEdit ? (
            <span className="field-hint">Leave blank to keep the current password.</span>
          ) : null}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="ac-profile">
            Profile <span className="req">*</span>
          </label>
          <select
            id="ac-profile"
            className="select"
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            required
          >
            <option value="" disabled>Select a profile</option>
            {profiles.map((p) => (
              <option key={p.profile_id} value={String(p.profile_id)}>
                {p.profile_name}
              </option>
            ))}
          </select>
        </div>

        <div className="field full">
          <label className="field-label">Status</label>
          <div className="status-toggle">
            <label className={`status-opt ${!suspended ? 'active' : ''}`}>
              <input
                type="radio"
                name="status"
                checked={!suspended}
                onChange={() => setSuspended(false)}
              />
              Active
            </label>
            <label className={`status-opt ${suspended ? 'active' : ''}`}>
              <input
                type="radio"
                name="status"
                checked={suspended}
                onChange={() => setSuspended(true)}
              />
              Suspended
            </label>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={!canSubmit}>
          {busy ? 'Saving…' : isEdit ? 'Save' : 'Create'}
        </button>
      </div>
    </form>
  )
}

export default function UserAccountPage() {
  const [view, setView] = useState(VIEWS.LIST)
  const [accounts, setAccounts] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [selected, setSelected] = useState(null)
  const [confirm, setConfirm] = useState(null) // {mode:'suspend'|'reinstate', account}

  const [viewDetailLoading, setViewDetailLoading] = useState(false)
  const [viewDetailError, setViewDetailError] = useState(null)
  const viewAccountLoadedId = useRef(null)

  async function loadProfiles() {
    try {
      const data = await api.listUserProfiles('')
      setProfiles(Array.isArray(data.profiles) ? data.profiles : [])
    } catch {
    }
  }

  async function loadAccounts() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.listUserAccounts(applied)
      setAccounts(Array.isArray(data.accounts) ? data.accounts : [])
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not load accounts.')
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [])

  useEffect(() => {
    loadAccounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied])

  useEffect(() => {
    if (view !== VIEWS.VIEW) {
      viewAccountLoadedId.current = null
      setViewDetailError(null)
      setViewDetailLoading(false)
      return
    }
    if (selected?.account_id == null) return
    const accountId = selected.account_id
    if (viewAccountLoadedId.current === accountId) return

    let cancelled = false
    async function loadDetail() {
      setViewDetailLoading(true)
      setViewDetailError(null)
      try {
        const data = await api.viewUserAccount(accountId)
        if (cancelled) return
        if (data?.account) {
          setSelected(data.account)
        }
      } catch (e) {
        if (!cancelled) {
          setViewDetailError(
            e?.data?.message || e?.message || 'Could not load account.',
          )
        }
      } finally {
        if (!cancelled) {
          setViewDetailLoading(false)
          viewAccountLoadedId.current = accountId
        }
      }
    }
    loadDetail()
    return () => {
      cancelled = true
    }
  }, [view, selected?.account_id])

  function clearMessages() {
    setError(null)
    setSuccess(null)
  }

  async function handleCreate(payload) {
    setSaving(true)
    clearMessages()
    try {
      await api.createUserAccount(payload)
      setSuccess('Account created successfully.')
      setView(VIEWS.LIST)
      await loadAccounts()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not create account.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(payload) {
    if (!selected) return
    setSaving(true)
    clearMessages()
    try {
      await api.updateUserAccount(selected.account_id, payload)
      setSuccess('Account updated successfully.')
      setView(VIEWS.LIST)
      setSelected(null)
      await loadAccounts()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not update account.')
    } finally {
      setSaving(false)
    }
  }

  async function performSuspend() {
    if (!confirm) return
    setSaving(true)
    clearMessages()
    const target = confirm.account
    const wantSuspend = confirm.mode === 'suspend'
    try {
      await api.suspendUserAccount(target.account_id, wantSuspend)
      setSuccess(
        wantSuspend ? 'Account suspended.' : 'Account reinstated.',
      )
      setConfirm(null)
      await loadAccounts()
      if (view === VIEWS.VIEW && target.account_id != null) {
        try {
          const d = await api.viewUserAccount(target.account_id)
          if (d?.account) {
            setSelected(d.account)
            viewAccountLoadedId.current = target.account_id
          }
        } catch {
        }
      }
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not update suspension.')
    } finally {
      setSaving(false)
    }
  }

  if (view === VIEWS.CREATE) {
    return (
      <main className="page">
        <button type="button" className="page-back" onClick={() => setView(VIEWS.LIST)}>
          Back to list
        </button>
        <div className="page-header">
          <div>
            <h1>Create User Account</h1>
            <p className="page-sub">Create credentials for a user.</p>
          </div>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <div className="card">
          <div className="card-section">
            <AccountForm
              mode="create"
              initial={null}
              profiles={profiles}
              busy={saving}
              onCancel={() => setView(VIEWS.LIST)}
              onSubmit={handleCreate}
            />
          </div>
        </div>
      </main>
    )
  }

  if (view === VIEWS.UPDATE && selected) {
    return (
      <main className="page">
        <button type="button" className="page-back" onClick={() => { setView(VIEWS.LIST); setSelected(null) }}>
          Back to list
        </button>
        <div className="page-header">
          <div>
            <h1>Update User Account</h1>
            <p className="page-sub">Update account credentials (prefilled).</p>
          </div>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <div className="card">
          <div className="card-section">
            <AccountForm
              mode="update"
              initial={selected}
              profiles={profiles}
              busy={saving}
              onCancel={() => { setView(VIEWS.LIST); setSelected(null) }}
              onSubmit={handleUpdate}
            />
          </div>
        </div>
      </main>
    )
  }

  if (view === VIEWS.VIEW && selected) {
    const suspended = Boolean(selected.is_suspended)
    return (
      <main className="page">
        <button
          type="button"
          className="page-back"
          onClick={() => {
            viewAccountLoadedId.current = null
            setView(VIEWS.LIST)
            setSelected(null)
            setViewDetailError(null)
          }}
        >
          Back to list
        </button>
        <div className="page-header">
          <div>
            <h1>View User Account</h1>
            <p className="page-sub">Read-only account details from the server.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn"
              disabled={viewDetailLoading}
              onClick={() => setView(VIEWS.UPDATE)}
            >
              Edit
            </button>
            <button
              type="button"
              className={`btn ${suspended ? 'primary' : 'danger'}`}
              disabled={viewDetailLoading}
              onClick={() => setConfirm({ mode: suspended ? 'reinstate' : 'suspend', account: selected })}
            >
              {suspended ? 'Reinstate' : 'Suspend'}
            </button>
          </div>
        </div>
        {viewDetailError ? <div className="alert error">{viewDetailError}</div> : null}
        <div className="card">
          <div className="card-section">
            <h2 className="card-title">Account details</h2>
            {viewDetailLoading ? (
              <p className="field-hint" style={{ marginTop: '1rem' }}>
                Loading…
              </p>
            ) : (
              <dl className="detail-list" style={{ marginTop: '1rem' }}>
                <dt>Account ID</dt>
                <dd>{String(selected.account_id).padStart(3, '0')}</dd>
                <dt>Username</dt>
                <dd>{selected.name}</dd>
                <dt>Email</dt>
                <dd>{selected.email}</dd>
                <dt>Profile</dt>
                <dd>{selected.profile_name || '—'}</dd>
                <dt>Status</dt>
                <dd>
                  <span className={`pill ${suspended ? 'danger' : 'ok'}`}>
                    {suspended ? 'Suspended' : 'Active'}
                  </span>
                </dd>
              </dl>
            )}
          </div>
        </div>
        <ConfirmModal
          open={Boolean(confirm)}
          variant={confirm?.mode === 'suspend' ? 'danger' : 'primary'}
          title={confirm?.mode === 'suspend' ? 'Suspend user account?' : 'Reinstate user account?'}
          message={
            confirm?.mode === 'suspend'
              ? 'User will not be able to log in while suspended.'
              : 'This user will be able to log in again.'
          }
          confirmLabel={confirm?.mode === 'suspend' ? 'Suspend' : 'Reinstate'}
          withReason={confirm?.mode === 'suspend'}
          busy={saving}
          onCancel={() => setConfirm(null)}
          onConfirm={performSuspend}
        />
      </main>
    )
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>User Accounts</h1>
          <p className="page-sub">
            Create, view, update, search, and suspend user accounts.
          </p>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={() => { clearMessages(); setSelected(null); setView(VIEWS.CREATE) }}
        >
          + Create Account
        </button>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setApplied(search.trim())
              }}
              placeholder="Search by name, email, or status…"
            />
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => setApplied(search.trim())}
            disabled={loading}
          >
            Search
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => { setSearch(''); setApplied('') }}
            disabled={loading}
          >
            Clear
          </button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Profile</th>
                <th>Status</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const suspended = Boolean(a.is_suspended)
                return (
                  <tr key={a.account_id}>
                    <td className="muted">{String(a.account_id).padStart(3, '0')}</td>
                    <td>{a.name}</td>
                    <td className="muted">{a.email}</td>
                    <td className="muted">{a.profile_name || '—'}</td>
                    <td>
                      <span className={`pill ${suspended ? 'danger' : 'ok'}`}>
                        {suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => { setSelected(a); setView(VIEWS.VIEW) }}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => { setSelected(a); setView(VIEWS.UPDATE) }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`btn-link ${suspended ? '' : 'danger'}`}
                        onClick={() => setConfirm({ mode: suspended ? 'reinstate' : 'suspend', account: a })}
                      >
                        {suspended ? 'Reinstate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && accounts.length === 0 ? (
            <div className="data-empty">
              No accounts found. Try a different search or create a new account.
            </div>
          ) : null}
          {loading ? <div className="data-empty">Loading…</div> : null}
        </div>
      </div>

      <ConfirmModal
        open={Boolean(confirm)}
        variant={confirm?.mode === 'suspend' ? 'danger' : 'primary'}
        title={confirm?.mode === 'suspend' ? 'Suspend user account?' : 'Reinstate user account?'}
        message={
          confirm?.mode === 'suspend'
            ? 'User will not be able to log in while suspended.'
            : 'This user will be able to log in again.'
        }
        confirmLabel={confirm?.mode === 'suspend' ? 'Suspend' : 'Reinstate'}
        withReason={confirm?.mode === 'suspend'}
        busy={saving}
        onCancel={() => setConfirm(null)}
        onConfirm={performSuspend}
      />
    </main>
  )
}
