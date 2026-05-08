/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/ApiClient.js'
import './UserAccountPage.css'

function AccountForm({ mode, initial, nextId, profiles, onCancel, onSubmit, busy }) {
  const [name, setName] = useState(initial.name || '')
  const [email, setEmail] = useState(initial.email || '')
  const [password, setPassword] = useState(initial.password || '')
  const [profileId, setProfileId] = useState(
    initial.profile_id ? String(initial.profile_id) : '',
  )

  useEffect(() => {
    setName(initial.name || '')
    setEmail(initial.email || '')
    setPassword(initial.password || '')
    setProfileId(initial.profile_id ? String(initial.profile_id) : '')
  }, [initial])

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    String(profileId || '').trim().length > 0 &&
    !busy

  const displayId =
    mode === 'edit'
      ? String(initial.account_id || '').padStart(3, '0')
      : String(nextId || '').padStart(3, '0')

  return (
    <form
      className="mup-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit) return
        onSubmit({
          name: name.trim(),
          email: email.trim(),
          password: password,
          profile_id: Number(profileId),
        })
      }}
    >
      <div className="mup-form-header">
        <h2>{mode === 'edit' ? 'Update account' : 'Create account'}</h2>
        {mode === 'edit' ? (
          <span className="mup-pill">Editing #{initial.account_id}</span>
        ) : null}
      </div>

      <label className="mup-field">
        <span className="mup-label">Account ID (Auto)</span>
        <input value={displayId} readOnly aria-readonly="true" />
      </label>

      <label className="mup-field">
        <span className="mup-label">Name *</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. John Tan"
          required
        />
      </label>

      <label className="mup-field">
        <span className="mup-label">Email *</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. user@gmail.com"
          required
        />
      </label>

      <label className="mup-field">
        <span className="mup-label">Password *</span>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
      </label>

      <label className="mup-field">
        <span className="mup-label">Profile *</span>
        <select
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          required
        >
          <option value="" disabled>
            Select a profile
          </option>
          {profiles.map((p) => (
            <option key={p.profile_id} value={String(p.profile_id)}>
              {p.profile_name}
            </option>
          ))}
        </select>
      </label>

      <div className="mup-actions">
        <button type="button" className="mup-btn secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="mup-btn primary" disabled={!canSubmit}>
          {busy ? 'Saving…' : mode === 'edit' ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}

export default function UserAccountPage() {
  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')

  const [accounts, setAccounts] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [nextId, setNextId] = useState(1)

  const [formMode, setFormMode] = useState('create') // create | edit
  const [selected, setSelected] = useState({})
  const [viewing, setViewing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('create') // create | list | search

  const queryString = useMemo(() => {
    const qs = new URLSearchParams()
    if (tab === 'search' && searchApplied.trim()) qs.set('search', searchApplied.trim())
    return qs.toString()
  }, [searchApplied, tab])

  async function loadProfiles() {
    try {
      const data = await api.listUserProfiles('')
      const list = Array.isArray(data.profiles) ? data.profiles : []
      setProfiles(list)
    } catch {
      // ignore: accounts still usable without profile names
    }
  }

  async function loadAccounts() {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const data = await api.listUserAccounts(tab === 'search' ? searchApplied.trim() : '')
      const list = Array.isArray(data.accounts) ? data.accounts : []
      setAccounts(list)
      const maxId = list.reduce(
        (acc, a) => Math.max(acc, Number(a.account_id) || 0),
        0,
      )
      setNextId(maxId + 1)
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error loading accounts. Is the backend running?')
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  async function refreshNextId() {
    try {
      const data = await api.listUserAccounts('')
      const list = Array.isArray(data.accounts) ? data.accounts : []
      const maxId = list.reduce(
        (acc, a) => Math.max(acc, Number(a.account_id) || 0),
        0,
      )
      setNextId(maxId + 1)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [])

  useEffect(() => {
    loadAccounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString])

  async function createAccount(payload) {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await api.createUserAccount(payload)
      setFormMode('create')
      setSelected({})
      setSuccess('A new account is created successfully.')
      await refreshNextId()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error creating account.')
    } finally {
      setSaving(false)
    }
  }

  async function updateAccount(accountId, payload) {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await api.updateUserAccount(accountId, payload)
      setFormMode('create')
      setSelected({})
      await loadAccounts()
      setTab('list')
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error updating account.')
    } finally {
      setSaving(false)
    }
  }

  async function setSuspended(accountId, suspend) {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await api.suspendUserAccount(accountId, suspend)
      await loadAccounts()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error updating suspension state.')
    } finally {
      setSaving(false)
    }
  }

  const formInitial = formMode === 'edit' ? selected : {}

  return (
    <main className="mup-page mua-page">
      <header className="mup-header">
        <div>
          <h1>Manage User Account</h1>
        </div>
      </header>

      {error ? (
        <div className="mup-alert" role="alert">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mup-alert success" role="status" aria-live="polite">
          {success}
        </div>
      ) : null}

      <nav className="mup-tabs" role="tablist" aria-label="User account tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'create'}
          className={`mup-tab ${tab === 'create' ? 'active' : ''}`}
          onClick={() => {
            setFormMode('create')
            setSelected({})
            setTab('create')
          }}
        >
          Create
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'list'}
          className={`mup-tab ${tab === 'list' ? 'active' : ''}`}
          onClick={() => setTab('list')}
        >
          Show all accounts
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'search'}
          className={`mup-tab ${tab === 'search' ? 'active' : ''}`}
          onClick={() => setTab('search')}
        >
          Search
        </button>
      </nav>

      {tab === 'create' ? (
        <section className="mup-panel" role="tabpanel" aria-label="Create user account">
          <AccountForm
            mode={formMode}
            initial={formInitial}
            nextId={nextId}
            profiles={profiles}
            busy={saving}
            onCancel={() => {
              setFormMode('create')
              setSelected({})
              setTab('list')
            }}
            onSubmit={(payload) => {
              if (formMode === 'edit') return updateAccount(selected.account_id, payload)
              return createAccount(payload)
            }}
          />
        </section>
      ) : null}

      {tab === 'list' ? (
        <section className="mup-panel" role="tabpanel" aria-label="Show all accounts">
          <div className="mup-panel-header">
            <h2>Show Accounts</h2>
          </div>

          <div className="mup-toolbar mup-toolbar-split">
            <p className="mup-muted mup-banner">All the accounts are here!</p>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={loadAccounts}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          <div className="mup-table">
            <div className="mup-row mup-head">
              <div>ID</div>
              <div>Name</div>
              <div>Email</div>
              <div>Profile</div>
              <div>Status</div>
              <div className="mup-actions-col">Actions</div>
            </div>
            {accounts.map((a) => {
              const suspended = Boolean(a.is_suspended)
              return (
                <div key={a.account_id} className="mup-row">
                  <div className="mup-muted">
                    {String(a.account_id).padStart(3, '0')}
                  </div>
                  <div className="mup-name">
                    <div className="mup-strong">{a.name}</div>
                  </div>
                  <div className="mup-muted">{a.email}</div>
                  <div className="mup-muted">{a.profile_name || '-'}</div>
                  <div>
                    <span className={`mup-tag ${suspended ? 'danger' : 'ok'}`}>
                      {suspended ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                  <div className="mup-actions-col">
                    <button type="button" className="mup-linkbtn" onClick={() => setViewing(a)}>
                      View
                    </button>
                    <button
                      type="button"
                      className="mup-linkbtn"
                      onClick={() => {
                        setFormMode('edit')
                        setSelected(a)
                        setTab('create')
                      }}
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      className="mup-linkbtn"
                      disabled={saving}
                      onClick={() => setSuspended(a.account_id, !suspended)}
                    >
                      {suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                  </div>
                </div>
              )
            })}
            {!loading && accounts.length === 0 ? (
              <div className="mup-empty">No accounts found.</div>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === 'search' ? (
        <section className="mup-panel" role="tabpanel" aria-label="Search accounts">
          <div className="mup-panel-header">
            <h2>Search</h2>
          </div>

          <div className="mup-toolbar">
            <label className="mup-search mup-search-compact">
              <span className="mup-label">Search</span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="e.g. John or user@gmail.com or 003"
              />
            </label>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={loadAccounts}
              disabled={loading}
            >
              Refresh
            </button>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={() => {
                if (searchApplied === searchInput) loadAccounts()
                else setSearchApplied(searchInput)
              }}
              disabled={loading}
            >
              Search
            </button>
          </div>

          <div className="mup-table">
            <div className="mup-row mup-head">
              <div>ID</div>
              <div>Name</div>
              <div>Email</div>
              <div>Profile</div>
              <div>Status</div>
              <div className="mup-actions-col">Actions</div>
            </div>
            {accounts.map((a) => {
              const suspended = Boolean(a.is_suspended)
              return (
                <div key={a.account_id} className="mup-row">
                  <div className="mup-muted">
                    {String(a.account_id).padStart(3, '0')}
                  </div>
                  <div className="mup-name">
                    <div className="mup-strong">{a.name}</div>
                  </div>
                  <div className="mup-muted">{a.email}</div>
                  <div className="mup-muted">{a.profile_name || '-'}</div>
                  <div>
                    <span className={`mup-tag ${suspended ? 'danger' : 'ok'}`}>
                      {suspended ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                  <div className="mup-actions-col">
                    <button type="button" className="mup-linkbtn" onClick={() => setViewing(a)}>
                      View
                    </button>
                    <button
                      type="button"
                      className="mup-linkbtn"
                      onClick={() => {
                        setFormMode('edit')
                        setSelected(a)
                        setTab('create')
                      }}
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      className="mup-linkbtn"
                      disabled={saving}
                      onClick={() => setSuspended(a.account_id, !suspended)}
                    >
                      {suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                  </div>
                </div>
              )
            })}
            {!loading && accounts.length === 0 ? (
              <div className="mup-empty">No accounts found.</div>
            ) : null}
          </div>
        </section>
      ) : null}

      {viewing ? (
        <div
          className="mup-modal"
          role="dialog"
          aria-modal="true"
          aria-label="View account"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewing(null)
          }}
        >
          <div className="mup-modal-card">
            <div className="mup-modal-head">
              <h2>View account</h2>
              <button type="button" className="mup-linkbtn" onClick={() => setViewing(null)}>
                Close
              </button>
            </div>

            <div className="mup-modal-grid">
              <div className="mup-modal-item">
                <div className="mup-modal-label">Account ID</div>
                <div className="mup-strong">
                  {String(viewing.account_id).padStart(3, '0')}
                </div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">Name</div>
                <div className="mup-strong">{viewing.name}</div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">Email</div>
                <div className="mup-muted">{viewing.email}</div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">Profile</div>
                <div className="mup-muted">{viewing.profile_name || '-'}</div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">Status</div>
                <div>
                  <span className={`mup-tag ${viewing.is_suspended ? 'danger' : 'ok'}`}>
                    {viewing.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                </div>
              </div>
              <div className="mup-modal-item mup-modal-item-full">
                <div className="mup-modal-label">Password</div>
                <div className="mup-muted">{viewing.password || '-'}</div>
              </div>
            </div>

            <div className="mup-actions">
              <button
                type="button"
                className="mup-btn secondary"
                onClick={() => setViewing(null)}
              >
                Back
              </button>
              <button
                type="button"
                className="mup-btn primary"
                onClick={() => {
                  setFormMode('edit')
                  setSelected(viewing)
                  setViewing(null)
                  setTab('create')
                }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

