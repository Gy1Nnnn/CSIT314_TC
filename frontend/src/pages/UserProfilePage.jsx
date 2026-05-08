/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/ApiClient.js'
import './UserProfilePage.css'

const ACCESS_OPTIONS = [
  {
    label: 'Full access',
  },
  {
    label: 'Manage FRA',
  },
  {
    label: 'Partial Access',
  },
  {
    label: 'Manage Platform',
  },
]

function parseAccessControl(value) {
  const raw = String(value || '')
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
}

function ProfileForm({ mode, initial, nextId, onCancel, onSubmit, busy }) {
  const [profileName, setProfileName] = useState(initial.profile_name || '')
  const [description, setDescription] = useState(initial.description || '')
  const [accessSelected, setAccessSelected] = useState(
    parseAccessControl(initial.access_control),
  )

  useEffect(() => {
    setProfileName(initial.profile_name || '')
    setDescription(initial.description || '')
    setAccessSelected(parseAccessControl(initial.access_control))
  }, [initial])

  const canSubmit = profileName.trim().length > 0 && !busy
  const displayId =
    mode === 'edit'
      ? String(initial.profile_id || '').padStart(3, '0')
      : String(nextId || '').padStart(3, '0')

  return (
    <form
      className="mup-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit) return
        onSubmit({
          profile_name: profileName.trim(),
          description: description.trim(),
          access_control: Array.from(accessSelected).join(', '),
        })
      }}
    >
      <div className="mup-form-header">
        <h2>{mode === 'edit' ? 'Update profile' : 'Create profile'}</h2>
        {mode === 'edit' ? (
          <span className="mup-pill">Editing #{initial.profile_id}</span>
        ) : null}
      </div>

      <label className="mup-field">
        <span className="mup-label">Profile ID (Auto)</span>
        <input value={displayId} readOnly aria-readonly="true" />
      </label>

      <label className="mup-field">
        <span className="mup-label">Profile name *</span>
        <input
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          placeholder="e.g. User Admin"
          required
        />
      </label>

      <label className="mup-field">
        <span className="mup-label">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description"
          rows={3}
        />
      </label>

      <fieldset className="mup-fieldset">
        <legend className="mup-label">Access control</legend>
        <div className="mup-checkgrid">
          {ACCESS_OPTIONS.map(({ label }) => {
            const checked = accessSelected.has(label)
            return (
              <label key={label} className={`mup-ac ${checked ? 'checked' : ''}`}>
                <span className="mup-ac-left">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setAccessSelected((prev) => {
                        const next = new Set(prev)
                        if (e.target.checked) next.add(label)
                        else next.delete(label)
                        return next
                      })
                    }}
                  />
                </span>
                <span className="mup-ac-body">
                  <span className="mup-ac-title">{label}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

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

export default function UserProfilePage() {
  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')

  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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
    setError(null)
    setLoading(true)
    try {
      const data = await api.listUserProfiles(tab === 'search' ? searchApplied.trim() : '')
      const list = Array.isArray(data.profiles) ? data.profiles : []
      setProfiles(list)
      const maxId = list.reduce(
        (acc, p) => Math.max(acc, Number(p.profile_id) || 0),
        0,
      )
      setNextId(maxId + 1)
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error loading profiles. Is the backend running?')
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString])

  async function createProfile(payload) {
    setSaving(true)
    setError(null)
    try {
      await api.createUserProfile(payload)
      setFormMode('create')
      setSelected({})
      await loadProfiles()
      setTab('list')
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error creating profile.')
    } finally {
      setSaving(false)
    }
  }

  async function updateProfile(profileId, payload) {
    setSaving(true)
    setError(null)
    try {
      await api.updateUserProfile(profileId, payload)
      setFormMode('create')
      setSelected({})
      await loadProfiles()
      setTab('list')
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error updating profile.')
    } finally {
      setSaving(false)
    }
  }

  async function setSuspended(profileId, suspend) {
    setSaving(true)
    setError(null)
    try {
      await api.suspendUserProfile(profileId, suspend)
      await loadProfiles()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error updating suspension state.')
    } finally {
      setSaving(false)
    }
  }

  const formInitial = formMode === 'edit' ? selected : {}

  return (
    <main className="mup-page">
      <header className="mup-header">
        <div>
          <h1>Manage User Profile</h1>
          <p className="mup-sub">
            Create, view, update, suspend, and search profiles.
          </p>
        </div>
      </header>

      {error ? (
        <div className="mup-alert" role="alert">
          {error}
        </div>
      ) : null}

      <nav className="mup-tabs" role="tablist" aria-label="User profile tabs">
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
          Show all profiles
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
        <section
          className="mup-panel mup-create-panel"
          role="tabpanel"
          aria-label="Create user profile"
        >
          <ProfileForm
            mode={formMode}
            initial={formInitial}
            nextId={nextId}
            busy={saving}
            onCancel={() => {
              setFormMode('create')
              setSelected({})
              setTab('list')
            }}
            onSubmit={(payload) => {
              if (formMode === 'edit') return updateProfile(selected.profile_id, payload)
              return createProfile(payload)
            }}
          />
        </section>
      ) : null}

      {tab === 'list' ? (
        <section className="mup-panel" role="tabpanel" aria-label="Show all profiles">
          <div className="mup-panel-header">
            <h2>Show Profiles</h2>
          </div>

          <div className="mup-toolbar mup-toolbar-split">
            <p className="mup-muted mup-banner">All the profiles are here!</p>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={loadProfiles}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          <div className="mup-table">
            <div className="mup-row mup-head">
              <div>ID</div>
              <div>Name</div>
              <div>Access</div>
              <div>Status</div>
              <div className="mup-actions-col">Actions</div>
            </div>
            {profiles.map((p) => {
              const suspended = Boolean(p.is_suspended)
              return (
                <div key={p.profile_id} className="mup-row">
                  <div className="mup-muted">
                    {String(p.profile_id).padStart(3, '0')}
                  </div>
                  <div className="mup-name">
                    <div className="mup-strong">{p.profile_name}</div>
                  </div>
                  <div className="mup-muted">{p.access_control || '-'}</div>
                  <div>
                    <span className={`mup-tag ${suspended ? 'danger' : 'ok'}`}>
                      {suspended ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                  <div className="mup-actions-col">
                    <button
                      type="button"
                      className="mup-linkbtn"
                      onClick={() => setViewing(p)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="mup-linkbtn"
                      onClick={() => {
                        setFormMode('edit')
                        setSelected(p)
                        setTab('create')
                      }}
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      className="mup-linkbtn"
                      disabled={saving}
                      onClick={() => setSuspended(p.profile_id, !suspended)}
                    >
                      {suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                  </div>
                </div>
              )
            })}
            {!loading && profiles.length === 0 ? (
              <div className="mup-empty">No profiles found.</div>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === 'search' ? (
        <section className="mup-panel" role="tabpanel" aria-label="Search profiles">
          <div className="mup-panel-header">
            <h2>Search</h2>
          </div>

          <div className="mup-toolbar">
            <label className="mup-search mup-search-compact">
              <span className="mup-label">Search</span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="e.g. User Admin or 003"
              />
            </label>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={loadProfiles}
              disabled={loading}
            >
              Refresh
            </button>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={() => {
                if (searchApplied === searchInput) loadProfiles()
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
              <div>Access</div>
              <div>Status</div>
              <div className="mup-actions-col">Actions</div>
            </div>
            {profiles.map((p) => {
              const suspended = Boolean(p.is_suspended)
              return (
                <div key={p.profile_id} className="mup-row">
                  <div className="mup-muted">
                    {String(p.profile_id).padStart(3, '0')}
                  </div>
                  <div className="mup-name">
                    <div className="mup-strong">{p.profile_name}</div>
                  </div>
                  <div className="mup-muted">{p.access_control || '-'}</div>
                  <div>
                    <span className={`mup-tag ${suspended ? 'danger' : 'ok'}`}>
                      {suspended ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                  <div className="mup-actions-col">
                    <button
                      type="button"
                      className="mup-linkbtn"
                      onClick={() => setViewing(p)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="mup-linkbtn"
                      onClick={() => {
                        setFormMode('edit')
                        setSelected(p)
                        setTab('create')
                      }}
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      className="mup-linkbtn"
                      disabled={saving}
                      onClick={() => setSuspended(p.profile_id, !suspended)}
                    >
                      {suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                  </div>
                </div>
              )
            })}
            {!loading && profiles.length === 0 ? (
              <div className="mup-empty">No profiles found.</div>
            ) : null}
          </div>
        </section>
      ) : null}

      {viewing ? (
        <div
          className="mup-modal"
          role="dialog"
          aria-modal="true"
          aria-label="View profile"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewing(null)
          }}
        >
          <div className="mup-modal-card">
            <div className="mup-modal-head">
              <h2>View profile</h2>
              <button
                type="button"
                className="mup-linkbtn"
                onClick={() => setViewing(null)}
              >
                Close
              </button>
            </div>

            <div className="mup-modal-grid">
              <div className="mup-modal-item">
                <div className="mup-modal-label">Profile ID</div>
                <div className="mup-strong">
                  {String(viewing.profile_id).padStart(3, '0')}
                </div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">Profile name</div>
                <div className="mup-strong">{viewing.profile_name}</div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">Access control</div>
                <div className="mup-muted">{viewing.access_control || '-'}</div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">Status</div>
                <div>
                  <span
                    className={`mup-tag ${viewing.is_suspended ? 'danger' : 'ok'}`}
                  >
                    {viewing.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                </div>
              </div>
              <div className="mup-modal-item mup-modal-item-full">
                <div className="mup-modal-label">Description</div>
                <div className="mup-muted">{viewing.description || '-'}</div>
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

