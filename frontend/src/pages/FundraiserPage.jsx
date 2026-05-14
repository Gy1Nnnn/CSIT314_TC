/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { api } from '../api/ApiClient.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
import './FundraiserPage.css'

const VIEWS = { LIST: 'list', CREATE: 'create', UPDATE: 'update', VIEW: 'view' }

const STATUSES = ['active', 'completed', 'suspended']

function ActivityForm({ mode, initial, categories, onCancel, onSubmit, busy }) {
  const [name, setName] = useState(initial?.activity_name || '')
  const [categoryId, setCategoryId] = useState(initial?.category_id ? String(initial.category_id) : '')
  const [description, setDescription] = useState(initial?.description || '')
  const [startDate, setStartDate] = useState(initial?.start_date || '')
  const [endDate, setEndDate] = useState(initial?.end_date || '')
  const [target, setTarget] = useState(
    initial?.target_amount === 0 || initial?.target_amount
      ? String(initial.target_amount)
      : '',
  )
  const [status, setStatus] = useState(initial?.status || 'active')

  const isEdit = mode === 'update'
  const canSubmit =
    name.trim().length > 0 &&
    String(categoryId || '').trim().length > 0 &&
    status.trim().length > 0 &&
    !busy

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit) return
        onSubmit({
          activity_name: name.trim(),
          category_id: Number(categoryId),
          description: description.trim(),
          start_date: startDate || null,
          end_date: endDate || null,
          target_amount: target.trim() ? Number(target) : null,
          status,
        })
      }}
    >
      <div className="form-grid">
        <div className="field">
          <label className="field-label" htmlFor="act-name">
            Campaign Name <span className="req">*</span>
          </label>
          <input
            id="act-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Winter Appeal"
            required
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="act-status">Status</label>
          <select
            id="act-status"
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="act-category">
            Category <span className="req">*</span>
          </label>
          <select
            id="act-category"
            className="select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="" disabled>Select a category</option>
            {categories.map((c) => (
              <option key={c.category_id} value={String(c.category_id)}>
                {c.category_name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="act-target">Target amount</label>
          <input
            id="act-target"
            className="input"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g., 5000"
            inputMode="decimal"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="act-start">Start Date</label>
          <input
            id="act-start"
            className="input"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="act-end">End Date</label>
          <input
            id="act-end"
            className="input"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="field full">
          <label className="field-label" htmlFor="act-desc">Description</label>
          <textarea
            id="act-desc"
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details about your campaign…"
            rows={4}
          />
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

export default function FundraiserPage({ user }) {
  const accountId = user?.account_id

  const [view, setView] = useState(VIEWS.LIST)
  const [activities, setActivities] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [selected, setSelected] = useState(null)
  const [confirm, setConfirm] = useState(null) // {mode:'delete'|'restore', activity}

  const [histActivities, setHistActivities] = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [histError, setHistError] = useState(null)
  const [histSearchInp, setHistSearchInp] = useState('')
  const [histCatInp, setHistCatInp] = useState('')
  const [histFromInp, setHistFromInp] = useState('')
  const [histToInp, setHistToInp] = useState('')
  const [histApplied, setHistApplied] = useState({
    search: '',
    categoryId: '',
    dateFrom: '',
    dateTo: '',
  })
  const [listSection, setListSection] = useState('campaigns')

  async function loadCategories() {
    try {
      const data = await api.listCategories('')
      setCategories(Array.isArray(data.categories) ? data.categories : [])
    } catch {
    }
  }

  async function loadActivities() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.listActivities({ accountId, search: applied })
      setActivities(Array.isArray(data.activities) ? data.activities : [])
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not load activities.')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  async function loadHistory() {
    if (accountId == null) return
    setHistLoading(true)
    setHistError(null)
    try {
      const data = await api.listCompletedActivityHistory({
        accountId,
        search: histApplied.search || undefined,
        categoryId: histApplied.categoryId || undefined,
        dateFrom: histApplied.dateFrom || undefined,
        dateTo: histApplied.dateTo || undefined,
      })
      setHistActivities(Array.isArray(data.activities) ? data.activities : [])
    } catch (e) {
      setHistError(e?.data?.message || e?.message || 'Could not load completed history.')
      setHistActivities([])
    } finally {
      setHistLoading(false)
    }
  }

  useEffect(() => {
    if (accountId == null) return
    loadCategories()
  }, [accountId])

  useEffect(() => {
    if (accountId == null) return
    loadActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, accountId])

  useEffect(() => {
    if (accountId == null) return
    if (listSection !== 'history') return
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, histApplied, listSection])

  function clearMessages() { setError(null); setSuccess(null) }

  async function handleCreate(payload) {
    setSaving(true)
    clearMessages()
    try {
      await api.createActivity({ ...payload, account_id: accountId })
      setSuccess('Activity created successfully.')
      setView(VIEWS.LIST)
      setListSection('campaigns')
      await loadActivities()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not create activity.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(payload) {
    if (!selected) return
    setSaving(true)
    clearMessages()
    try {
      await api.updateActivity(selected.activity_id, { ...payload, account_id: accountId })
      setSuccess('Activity updated successfully.')
      setView(VIEWS.LIST)
      setSelected(null)
      setListSection('campaigns')
      await loadActivities()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not update activity.')
    } finally {
      setSaving(false)
    }
  }

  async function performConfirm() {
    if (!confirm) return
    setSaving(true)
    clearMessages()
    const target = confirm.activity
    const wantSuspend = confirm.mode === 'delete'
    try {
      await api.suspendActivity(target.activity_id, { account_id: accountId, suspend: wantSuspend })
      setSuccess(wantSuspend ? 'Activity deleted.' : 'Activity restored.')
      setConfirm(null)
      if (view === VIEWS.VIEW) { setView(VIEWS.LIST); setSelected(null) }
      await loadActivities()
      if (listSection === 'history') await loadHistory()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not update activity.')
    } finally {
      setSaving(false)
    }
  }

  function fmtDate(value) {
    if (!value) return '—'
    try {
      return new Date(value + 'T12:00:00').toLocaleDateString()
    } catch {
      return value
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
            <h1>Create Fundraising Activity</h1>
            <p className="page-sub">Start a new campaign.</p>
          </div>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <div className="card">
          <div className="card-section">
            <ActivityForm
              mode="create"
              initial={null}
              categories={categories}
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
            <h1>Update Fundraising Activity</h1>
            <p className="page-sub">Update campaign information (prefilled).</p>
          </div>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <div className="card">
          <div className="card-section">
            <ActivityForm
              mode="update"
              initial={selected}
              categories={categories}
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
            <h1>View Fundraising Activity</h1>
            <p className="page-sub">Monitor campaign information.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn" onClick={() => setView(VIEWS.UPDATE)}>
              Edit
            </button>
            <button
              type="button"
              className={`btn ${suspended ? 'primary' : 'danger'}`}
              onClick={() => setConfirm({ mode: suspended ? 'restore' : 'delete', activity: selected })}
            >
              {suspended ? 'Restore' : 'Delete'}
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-section">
            <h2 className="card-title">Activity details</h2>
            <dl className="detail-list" style={{ marginTop: '1rem' }}>
              <dt>Campaign ID</dt>
              <dd>{String(selected.activity_id).padStart(3, '0')}</dd>
              <dt>Campaign</dt>
              <dd>{selected.activity_name}</dd>
              <dt>Category</dt>
              <dd>{selected.category_name || '—'}</dd>
              <dt>Status</dt>
              <dd>
                <span className={`pill ${suspended ? 'danger' : 'ok'}`}>
                  {suspended ? 'Deleted' : selected.status || 'Active'}
                </span>
              </dd>
              <dt>Views</dt>
              <dd>{Number(selected.view_count ?? 0).toLocaleString()}</dd>
              <dt>Favorites</dt>
              <dd>{Number(selected.favorite_count ?? 0).toLocaleString()}</dd>
              <dt>Start</dt>
              <dd>{fmtDate(selected.start_date)}</dd>
              <dt>End</dt>
              <dd>{fmtDate(selected.end_date)}</dd>
              <dt>Target amount</dt>
              <dd>
                {selected.target_amount === 0 || selected.target_amount
                  ? Number(selected.target_amount).toLocaleString()
                  : '—'}
              </dd>
              <dt>Description</dt>
              <dd>{selected.description || '—'}</dd>
            </dl>
          </div>
        </div>
        <ConfirmModal
          open={Boolean(confirm)}
          variant={confirm?.mode === 'delete' ? 'danger' : 'primary'}
          title={confirm?.mode === 'delete' ? 'Delete activity?' : 'Restore activity?'}
          message={
            confirm?.mode === 'delete'
              ? 'This action cannot be undone.'
              : 'The activity will be visible to donors again.'
          }
          confirmLabel={confirm?.mode === 'delete' ? 'Delete' : 'Restore'}
          busy={saving}
          onCancel={() => setConfirm(null)}
          onConfirm={performConfirm}
        />
      </main>
    )
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          {listSection === 'campaigns' ? (
            <>
              <h1>Fundraising Activities</h1>
              <p className="page-sub">Browse activities and open one to view, edit, or delete.</p>
            </>
          ) : (
            <>
              <h1>Completed campaigns (history)</h1>
              <p className="page-sub">
                Filter by category (service area), campaign end date range, or name — then search
                to review past completed activities.
              </p>
            </>
          )}
        </div>
        <div className="page-header-actions">
          {listSection === 'campaigns' ? (
            <>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  clearMessages()
                  setSelected(null)
                  setView(VIEWS.CREATE)
                }}
              >
                + New Activity
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setListSection('history')}
              >
                History
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn" onClick={() => setListSection('campaigns')}>
                ← All activities
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  clearMessages()
                  setSelected(null)
                  setView(VIEWS.CREATE)
                }}
              >
                + New Activity
              </button>
            </>
          )}
        </div>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      {listSection === 'campaigns' ? (
      <div className="card">
        <div className="toolbar">
          <div className="search">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setApplied(search.trim()) }}
              placeholder="Search by name / status / category…"
            />
          </div>
          <button type="button" className="btn" onClick={() => setApplied(search.trim())} disabled={loading}>
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
                <th className="num">ID</th>
                <th>Campaign</th>
                <th>Category</th>
                <th>Status</th>
                <th className="num">Views</th>
                <th className="num">Favorites</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => {
                const suspended = Boolean(a.is_suspended)
                return (
                  <tr key={a.activity_id}>
                    <td className="muted num">{String(a.activity_id).padStart(3, '0')}</td>
                    <td>{a.activity_name}</td>
                    <td className="muted">{a.category_name || '—'}</td>
                    <td>
                      <span className={`pill ${suspended ? 'danger' : 'ok'}`}>
                        {suspended ? 'Deleted' : a.status || 'Active'}
                      </span>
                    </td>
                    <td className="muted num">{Number(a.view_count ?? 0).toLocaleString()}</td>
                    <td className="muted num">{Number(a.favorite_count ?? 0).toLocaleString()}</td>
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
                        onClick={() => setConfirm({ mode: suspended ? 'restore' : 'delete', activity: a })}
                      >
                        {suspended ? 'Restore' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && activities.length === 0 ? (
            <div className="data-empty">No activities yet. Create your first campaign.</div>
          ) : null}
          {loading ? <div className="data-empty">Loading…</div> : null}
        </div>
      </div>
      ) : null}

      {listSection === 'history' ? (
      <div className="card fra-history-card">
        {histError ? <div className="alert error fra-history-alert">{histError}</div> : null}
        <div className="toolbar fra-history-toolbar">
          <div className="field fra-history-field">
            <label className="field-label" htmlFor="hist-cat">
              Category
            </label>
            <select
              id="hist-cat"
              className="select"
              value={histCatInp}
              onChange={(e) => setHistCatInp(e.target.value)}
            >
              <option value="">All categories</option>
              {categories
                .filter((c) => !c.is_suspended)
                .map((c) => (
                  <option key={c.category_id} value={String(c.category_id)}>
                    {c.category_name}
                  </option>
                ))}
            </select>
          </div>
          <div className="field fra-history-field">
            <label className="field-label" htmlFor="hist-from">
              End date from
            </label>
            <input
              id="hist-from"
              className="input"
              type="date"
              value={histFromInp}
              onChange={(e) => setHistFromInp(e.target.value)}
            />
          </div>
          <div className="field fra-history-field">
            <label className="field-label" htmlFor="hist-to">
              End date to
            </label>
            <input
              id="hist-to"
              className="input"
              type="date"
              value={histToInp}
              onChange={(e) => setHistToInp(e.target.value)}
            />
          </div>
          <div className="search fra-history-search">
            <input
              value={histSearchInp}
              onChange={(e) => setHistSearchInp(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setHistApplied({
                    search: histSearchInp.trim(),
                    categoryId: histCatInp,
                    dateFrom: histFromInp,
                    dateTo: histToInp,
                  })
                }
              }}
              placeholder="Campaign name or ID…"
            />
          </div>
          <button
            type="button"
            className="btn primary"
            disabled={histLoading}
            onClick={() =>
              setHistApplied({
                search: histSearchInp.trim(),
                categoryId: histCatInp,
                dateFrom: histFromInp,
                dateTo: histToInp,
              })
            }
          >
            Search history
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={histLoading}
            onClick={() => {
              setHistSearchInp('')
              setHistCatInp('')
              setHistFromInp('')
              setHistToInp('')
              setHistApplied({ search: '', categoryId: '', dateFrom: '', dateTo: '' })
            }}
          >
            Clear filters
          </button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="num">ID</th>
                <th>Campaign</th>
                <th>Category</th>
                <th>End</th>
                <th className="num">Views</th>
                <th className="num">Favorites</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {histActivities.map((a) => {
                const suspended = Boolean(a.is_suspended)
                return (
                  <tr key={`hist-${a.activity_id}`}>
                    <td className="muted num">{String(a.activity_id).padStart(3, '0')}</td>
                    <td>{a.activity_name}</td>
                    <td className="muted">{a.category_name || '—'}</td>
                    <td className="muted">{fmtDate(a.end_date)}</td>
                    <td className="muted num">{Number(a.view_count ?? 0).toLocaleString()}</td>
                    <td className="muted num">{Number(a.favorite_count ?? 0).toLocaleString()}</td>
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
                        onClick={() => setConfirm({ mode: suspended ? 'restore' : 'delete', activity: a })}
                      >
                        {suspended ? 'Restore' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!histLoading && histActivities.length === 0 ? (
            <div className="data-empty">No completed campaigns match these filters.</div>
          ) : null}
          {histLoading ? <div className="data-empty">Loading history…</div> : null}
        </div>
      </div>
      ) : null}

      <ConfirmModal
        open={Boolean(confirm)}
        variant={confirm?.mode === 'delete' ? 'danger' : 'primary'}
        title={confirm?.mode === 'delete' ? 'Delete activity?' : 'Restore activity?'}
        message={
          confirm?.mode === 'delete'
            ? 'This action cannot be undone.'
            : 'The activity will be visible to donors again.'
        }
        confirmLabel={confirm?.mode === 'delete' ? 'Delete' : 'Restore'}
        busy={saving}
        onCancel={() => setConfirm(null)}
        onConfirm={performConfirm}
      />
    </main>
  )
}
