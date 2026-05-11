/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/ApiClient.js'
import './FundraiserPage.css'

function ActivityForm({
  mode,
  initial,
  nextId,
  categories,
  onCancel,
  onSubmit,
  busy,
}) {
  const [activityName, setActivityName] = useState(initial.activity_name || '')
  const [categoryId, setCategoryId] = useState(
    initial.category_id ? String(initial.category_id) : '',
  )
  const [description, setDescription] = useState(initial.description || '')
  const [startDate, setStartDate] = useState(initial.start_date || '')
  const [endDate, setEndDate] = useState(initial.end_date || '')
  const [targetAmount, setTargetAmount] = useState(
    initial.target_amount === 0 || initial.target_amount ? String(initial.target_amount) : '',
  )
  const [status, setStatus] = useState(initial.status || 'active')

  useEffect(() => {
    setActivityName(initial.activity_name || '')
    setCategoryId(initial.category_id ? String(initial.category_id) : '')
    setDescription(initial.description || '')
    setStartDate(initial.start_date || '')
    setEndDate(initial.end_date || '')
    setTargetAmount(
      initial.target_amount === 0 || initial.target_amount ? String(initial.target_amount) : '',
    )
    setStatus(initial.status || 'active')
  }, [initial])

  const canSubmit =
    activityName.trim().length > 0 &&
    String(categoryId || '').trim().length > 0 &&
    status.trim().length > 0 &&
    !busy
  const displayId =
    mode === 'edit'
      ? String(initial.activity_id || '').padStart(3, '0')
      : String(nextId || '').padStart(3, '0')

  return (
    <form
      className="mup-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit) return
        onSubmit({
          activity_name: activityName.trim(),
          category_id: Number(categoryId),
          description: description.trim(),
          start_date: startDate || null,
          end_date: endDate || null,
          target_amount: targetAmount.trim() ? Number(targetAmount) : null,
          status,
        })
      }}
    >
      <div className="mup-form-header">
        <h2>{mode === 'edit' ? 'Update activity' : 'Create activity'}</h2>
        {mode === 'edit' ? (
          <span className="mup-pill">Editing #{initial.activity_id}</span>
        ) : null}
      </div>

      <label className="mup-field">
        <span className="mup-label">Activity ID (Auto)</span>
        <input value={displayId} readOnly aria-readonly="true" />
      </label>

      <label className="mup-field">
        <span className="mup-label">Activity name *</span>
        <input
          value={activityName}
          onChange={(e) => setActivityName(e.target.value)}
          placeholder="e.g. Donation Drive"
          required
        />
      </label>

      <label className="mup-field">
        <span className="mup-label">Category *</span>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        >
          <option value="" disabled>
            Select a category
          </option>
          {categories.map((c) => (
            <option key={c.category_id} value={String(c.category_id)}>
              {c.category_name}
            </option>
          ))}
        </select>
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

      <label className="mup-field">
        <span className="mup-label">Start date</span>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </label>

      <label className="mup-field">
        <span className="mup-label">End date</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </label>

      <label className="mup-field">
        <span className="mup-label">Target amount</span>
        <input
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          placeholder="e.g. 5000"
          inputMode="decimal"
        />
      </label>

      <label className="mup-field">
        <span className="mup-label">Status *</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} required>
          <option value="active">active</option>
          <option value="expired">expired</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
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

export default function FundraiserPage({ user }) {
  const accountId = user?.account_id

  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')

  const [activities, setActivities] = useState([])
  const [categories, setCategories] = useState([])
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
    if (accountId != null) qs.set('account_id', String(accountId))
    if (tab === 'search' && searchApplied.trim()) qs.set('search', searchApplied.trim())
    return qs.toString()
  }, [accountId, searchApplied, tab])

  async function loadActivities() {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const data = await api.listActivities({
        accountId,
        search: tab === 'search' ? searchApplied.trim() : '',
      })
      const list = Array.isArray(data.activities) ? data.activities : []
      setActivities(list)
      const maxId = list.reduce(
        (acc, a) => Math.max(acc, Number(a.activity_id) || 0),
        0,
      )
      setNextId(maxId + 1)
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error loading activities. Is the backend running?')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  async function loadCategories() {
    try {
      const data = await api.listCategories('')
      const list = Array.isArray(data.categories) ? data.categories : []
      setCategories(list)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (accountId == null) return
    loadCategories()
    loadActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString])

  async function createActivity(payload) {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await api.createActivity({ ...payload, account_id: accountId })
      setFormMode('create')
      setSelected({})
      setSuccess('A new fundraising activity is created successfully.')
      await loadActivities()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error creating activity.')
    } finally {
      setSaving(false)
    }
  }

  async function updateActivity(activityId, payload) {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await api.updateActivity(activityId, { ...payload, account_id: accountId })
      setFormMode('create')
      setSelected({})
      await loadActivities()
      setTab('list')
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error updating activity.')
    } finally {
      setSaving(false)
    }
  }

  async function setSuspended(activityId, suspend) {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await api.suspendActivity(activityId, { account_id: accountId, suspend })
      await loadActivities()
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
          <h1>Fundraiser</h1>
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

      <nav className="mup-tabs" role="tablist" aria-label="Fundraising activity tabs">
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
          Show all activities
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
        <section className="mup-panel" role="tabpanel" aria-label="Create fundraising activity">
          <ActivityForm
            mode={formMode}
            initial={formInitial}
            nextId={nextId}
            categories={categories}
            busy={saving}
            onCancel={() => {
              setFormMode('create')
              setSelected({})
              setTab('list')
            }}
            onSubmit={(payload) => {
              if (formMode === 'edit') return updateActivity(selected.activity_id, payload)
              return createActivity(payload)
            }}
          />
        </section>
      ) : null}

      {tab === 'list' ? (
        <section className="mup-panel" role="tabpanel" aria-label="Show all activities">
          <div className="mup-panel-header">
            <h2>Show Activities</h2>
          </div>

          <div className="mup-toolbar mup-toolbar-split">
            <p className="mup-muted mup-banner">All the activities are here!</p>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={loadActivities}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          <div className="mup-table">
            <div className="mup-row mup-head">
              <div>ID</div>
              <div>Activity</div>
              <div>Category</div>
              <div>Status</div>
              <div>Suspension</div>
              <div className="mup-actions-col">Actions</div>
            </div>
            {activities.map((a) => {
              const suspended = Boolean(a.is_suspended)
              return (
                <div key={a.activity_id} className="mup-row">
                  <div className="mup-muted">
                    {String(a.activity_id).padStart(3, '0')}
                  </div>
                  <div className="mup-name">
                    <div className="mup-strong">{a.activity_name}</div>
                  </div>
                  <div className="mup-muted">{a.category_name || '-'}</div>
                  <div className="mup-muted">{a.status || '-'}</div>
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
                      onClick={() => setSuspended(a.activity_id, !suspended)}
                    >
                      {suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                  </div>
                </div>
              )
            })}
            {!loading && activities.length === 0 ? (
              <div className="mup-empty">No activities found.</div>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === 'search' ? (
        <section className="mup-panel" role="tabpanel" aria-label="Search activities">
          <div className="mup-panel-header">
            <h2>Search</h2>
          </div>

          <div className="mup-toolbar">
            <label className="mup-search mup-search-compact">
              <span className="mup-label">Search</span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="e.g. Donation or 003"
              />
            </label>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={loadActivities}
              disabled={loading}
            >
              Refresh
            </button>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={() => {
                if (searchApplied === searchInput) loadActivities()
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
              <div>Activity</div>
              <div>Category</div>
              <div>Status</div>
              <div>Suspension</div>
              <div className="mup-actions-col">Actions</div>
            </div>
            {activities.map((a) => {
              const suspended = Boolean(a.is_suspended)
              return (
                <div key={a.activity_id} className="mup-row">
                  <div className="mup-muted">
                    {String(a.activity_id).padStart(3, '0')}
                  </div>
                  <div className="mup-name">
                    <div className="mup-strong">{a.activity_name}</div>
                  </div>
                  <div className="mup-muted">{a.category_name || '-'}</div>
                  <div className="mup-muted">{a.status || '-'}</div>
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
                      onClick={() => setSuspended(a.activity_id, !suspended)}
                    >
                      {suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                  </div>
                </div>
              )
            })}
            {!loading && activities.length === 0 ? (
              <div className="mup-empty">No activities found.</div>
            ) : null}
          </div>
        </section>
      ) : null}

      {viewing ? (
        <div
          className="mup-modal"
          role="dialog"
          aria-modal="true"
          aria-label="View activity"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewing(null)
          }}
        >
          <div className="mup-modal-card">
            <div className="mup-modal-head">
              <h2>View activity</h2>
              <button type="button" className="mup-linkbtn" onClick={() => setViewing(null)}>
                Close
              </button>
            </div>

            <div className="mup-modal-grid">
              <div className="mup-modal-item">
                <div className="mup-modal-label">Activity ID</div>
                <div className="mup-strong">
                  {String(viewing.activity_id).padStart(3, '0')}
                </div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">Activity name</div>
                <div className="mup-strong">{viewing.activity_name}</div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">Category</div>
                <div className="mup-muted">{viewing.category_name || '-'}</div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">Status</div>
                <div className="mup-muted">{viewing.status || '-'}</div>
              </div>
              <div className="mup-modal-item mup-modal-item-full">
                <div className="mup-modal-label">Description</div>
                <div className="mup-muted">{viewing.description || '-'}</div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">Start date</div>
                <div className="mup-muted">{viewing.start_date || '-'}</div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">End date</div>
                <div className="mup-muted">{viewing.end_date || '-'}</div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">Target amount</div>
                <div className="mup-muted">
                  {viewing.target_amount === 0 || viewing.target_amount
                    ? String(viewing.target_amount)
                    : '-'}
                </div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">Status</div>
                <div>
                  <span className={`mup-tag ${viewing.is_suspended ? 'danger' : 'ok'}`}>
                    {viewing.is_suspended ? 'Suspended' : 'Active'}
                  </span>
                </div>
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

