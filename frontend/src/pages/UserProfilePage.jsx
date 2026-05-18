/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { api } from '../api/ApiClient.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { useAutoDismiss } from '../hooks/useAutoDismiss.js'
import './UserProfilePage.css'

const VIEWS = { LIST: 'list', CREATE: 'create', UPDATE: 'update', VIEW: 'view' }

const ACCESS_OPTIONS = [
  'Full access',
  'Manage FRA',
  'Partial Access',
  'Manage Platform',
]

function parseAccessControl(value) {
  return new Set(
    String(value || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
}

function ProfileForm({ mode, initial, onCancel, onSubmit, busy }) {
  const [profileName, setProfileName] = useState(initial?.profile_name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [access, setAccess] = useState(parseAccessControl(initial?.access_control))

  const isEdit = mode === 'update'
  const canSubmit = profileName.trim().length > 0 && !busy

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit) return
        onSubmit({
          profile_name: profileName.trim(),
          description: description.trim(),
          access_control: Array.from(access).join(', '),
        })
      }}
    >
      <div className="form-grid">
        <div className="field">
          <label className="field-label" htmlFor="up-name">
            Full Name / Profile Name <span className="req">*</span>
          </label>
          <input
            id="up-name"
            className="input"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="e.g., User Admin"
            required
          />
        </div>

        <div className="field full">
          <label className="field-label" htmlFor="up-desc">Description</label>
          <textarea
            id="up-desc"
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description of this profile…"
            rows={3}
          />
        </div>

        <fieldset className="field full access-control">
          <legend className="field-label">Access control</legend>
          <div className="access-grid">
            {ACCESS_OPTIONS.map((label) => {
              const checked = access.has(label)
              return (
                <label key={label} className={`access-opt ${checked ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setAccess((prev) => {
                        const n = new Set(prev)
                        if (e.target.checked) n.add(label)
                        else n.delete(label)
                        return n
                      })
                    }}
                  />
                  <span>{label}</span>
                </label>
              )
            })}
          </div>
        </fieldset>
      </div>

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={!canSubmit}>
          {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
        </button>
      </div>
    </form>
  )
}

export default function UserProfilePage() {
  const [view, setView] = useState(VIEWS.LIST)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [selected, setSelected] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useAutoDismiss(success, setSuccess)

  async function loadProfiles() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.listUserProfiles(applied)
      setProfiles(Array.isArray(data.profiles) ? data.profiles : [])
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not load profiles.')
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied])

  function clearMessages() { setError(null); setSuccess(null) }

  async function openProfileView(profileId) {
    clearMessages()
    setDetailLoading(true)
    try {
      const data = await api.getUserProfile(profileId)
      setSelected(data.profile)
      setView(VIEWS.VIEW)
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not load profile.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleCreate(payload) {
    setSaving(true)
    clearMessages()
    try {
      await api.createUserProfile(payload)
      setSuccess('Profile created successfully.')
      setView(VIEWS.LIST)
      await loadProfiles()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not create profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(payload) {
    if (!selected) return
    setSaving(true)
    clearMessages()
    try {
      await api.updateUserProfile(selected.profile_id, payload)
      setSuccess('Profile updated successfully.')
      setView(VIEWS.LIST)
      setSelected(null)
      await loadProfiles()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not update profile.')
    } finally {
      setSaving(false)
    }
  }

  async function performSuspend() {
    if (!confirm) return
    setSaving(true)
    clearMessages()
    const target = confirm.profile
    const wantSuspend = confirm.mode === 'suspend'
    try {
      await api.suspendUserProfile(target.profile_id, wantSuspend)
      setSuccess(wantSuspend ? 'Profile suspended.' : 'Profile reinstated.')
      setConfirm(null)
      await loadProfiles()
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
            <h1>Create User Profile</h1>
            <p className="page-sub">Define a role profile and its access control for new accounts.</p>
          </div>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <div className="card">
          <div className="card-section">
            <ProfileForm
              mode="create"
              initial={null}
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
            <h1>Update User Profile</h1>
            <p className="page-sub">Change profile name or access control. Fields are prefilled.</p>
          </div>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <div className="card">
          <div className="card-section">
            <ProfileForm
              mode="update"
              initial={selected}
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
        <button type="button" className="page-back" onClick={() => { setView(VIEWS.LIST); setSelected(null) }}>
          Back to list
        </button>
        <div className="page-header">
          <div>
            <h1>View User Profile</h1>
            <p className="page-sub">Read-only profile details. Update or suspend from here.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn" onClick={() => setView(VIEWS.UPDATE)}>
              Update
            </button>
            <button
              type="button"
              className={`btn ${suspended ? 'primary' : 'danger'}`}
              onClick={() => setConfirm({ mode: suspended ? 'reinstate' : 'suspend', profile: selected })}
            >
              {suspended ? 'Reinstate' : 'Suspend'}
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-section">
            <h2 className="card-title">Profile details</h2>
            <dl className="detail-list" style={{ marginTop: '1rem' }}>
              <dt>Profile ID</dt>
              <dd>{String(selected.profile_id).padStart(3, '0')}</dd>
              <dt>Name</dt>
              <dd>{selected.profile_name}</dd>
              <dt>Access control</dt>
              <dd>{selected.access_control || '—'}</dd>
              <dt>Description</dt>
              <dd>{selected.description || '—'}</dd>
              <dt>Status</dt>
              <dd>
                <span className={`pill ${suspended ? 'danger' : 'ok'}`}>
                  {suspended ? 'Suspended' : 'Active'}
                </span>
              </dd>
            </dl>
          </div>
        </div>
        <ConfirmModal
          open={Boolean(confirm)}
          variant={confirm?.mode === 'suspend' ? 'danger' : 'primary'}
          title={confirm?.mode === 'suspend' ? 'Suspend user profile?' : 'Reinstate user profile?'}
          message={
            confirm?.mode === 'suspend'
              ? 'User will not be able to log in while suspended.'
              : 'This profile will be available for use again.'
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
          <h1>User Profiles</h1>
          <p className="page-sub">
            Search, view, update, and suspend role profiles used by platform accounts.
          </p>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={() => { clearMessages(); setSelected(null); setView(VIEWS.CREATE) }}
        >
          + Create Profile
        </button>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}
      {detailLoading ? <div className="data-empty">Loading profile…</div> : null}

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setApplied(search.trim()) }}
              placeholder="Search by name / status…"
              disabled={detailLoading}
            />
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => setApplied(search.trim())}
            disabled={loading || detailLoading}
          >
            Search
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => { setSearch(''); setApplied('') }}
            disabled={loading || detailLoading}
          >
            Clear
          </button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="profile-id-col">Profile ID</th>
                <th>Name</th>
                <th>Access</th>
                <th>Status</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const suspended = Boolean(p.is_suspended)
                return (
                  <tr key={p.profile_id}>
                    <td className="muted profile-id-col">
                      {p.profile_id != null ? String(p.profile_id).padStart(3, '0') : '—'}
                    </td>
                    <td>{p.profile_name}</td>
                    <td className="muted">{p.access_control || '—'}</td>
                    <td>
                      <span className={`pill ${suspended ? 'danger' : 'ok'}`}>
                        {suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn-link"
                        disabled={detailLoading}
                        onClick={() => { void openProfileView(p.profile_id) }}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => { setSelected(p); setView(VIEWS.UPDATE) }}
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        className={`btn-link ${suspended ? '' : 'danger'}`}
                        onClick={() => setConfirm({ mode: suspended ? 'reinstate' : 'suspend', profile: p })}
                      >
                        {suspended ? 'Reinstate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && profiles.length === 0 ? (
            <div className="data-empty">No profiles found.</div>
          ) : null}
          {loading ? <div className="data-empty">Loading…</div> : null}
        </div>
      </div>

      <ConfirmModal
        open={Boolean(confirm)}
        variant={confirm?.mode === 'suspend' ? 'danger' : 'primary'}
        title={confirm?.mode === 'suspend' ? 'Suspend user profile?' : 'Reinstate user profile?'}
        message={
          confirm?.mode === 'suspend'
            ? 'User will not be able to log in while suspended.'
            : 'This profile will be available for use again.'
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
