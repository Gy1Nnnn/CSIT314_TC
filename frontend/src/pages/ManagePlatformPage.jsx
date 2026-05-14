/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { api } from '../api/ApiClient.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
import './ManagePlatformPage.css'

const VIEWS = { LIST: 'list', CREATE: 'create', UPDATE: 'update', VIEW: 'view' }

function CategoryForm({ mode, initial, onCancel, onSubmit, busy }) {
  const [name, setName] = useState(initial?.category_name || '')
  const [description, setDescription] = useState(initial?.description || '')

  const isEdit = mode === 'update'
  const canSubmit = name.trim().length > 0 && !busy

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit) return
        onSubmit({
          category_name: name.trim(),
          description: description.trim(),
        })
      }}
    >
      <div className="form-grid">
        <div className="field">
          <label className="field-label" htmlFor="cat-name">
            Name <span className="req">*</span>
          </label>
          <input
            id="cat-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Food Relief"
            required
          />
        </div>

        <div className="field full">
          <label className="field-label" htmlFor="cat-desc">Description</label>
          <textarea
            id="cat-desc"
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description…"
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

export default function ManagePlatformPage() {
  const [view, setView] = useState(VIEWS.LIST)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [selected, setSelected] = useState(null)
  const [confirm, setConfirm] = useState(null) // { mode: 'hardDelete', category }

  async function loadCategories() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.listCategories(applied)
      setCategories(Array.isArray(data.categories) ? data.categories : [])
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not load categories.')
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied])

  function clearMessages() { setError(null); setSuccess(null) }

  async function handleCreate(payload) {
    setSaving(true)
    clearMessages()
    try {
      await api.createCategory(payload)
      setSuccess('Category created successfully.')
      setView(VIEWS.LIST)
      await loadCategories()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not create category.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(payload) {
    if (!selected) return
    setSaving(true)
    clearMessages()
    try {
      await api.updateCategory(selected.category_id, payload)
      setSuccess('Category updated successfully.')
      setView(VIEWS.LIST)
      setSelected(null)
      await loadCategories()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not update category.')
    } finally {
      setSaving(false)
    }
  }

  async function performConfirm() {
    if (!confirm || confirm.mode !== 'hardDelete') return
    setSaving(true)
    clearMessages()
    const target = confirm.category
    try {
      await api.deleteCategory(target.category_id)
      setSuccess('Category deleted.')
      setConfirm(null)
      if (view === VIEWS.VIEW) {
        setView(VIEWS.LIST)
        setSelected(null)
      }
      await loadCategories()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not delete category.')
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
            <h1>Create FRA Category</h1>
            <p className="page-sub">Add a new category.</p>
          </div>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <div className="card">
          <div className="card-section">
            <CategoryForm
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
            <h1>Update FRA Category</h1>
            <p className="page-sub">Update category information (prefilled).</p>
          </div>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <div className="card">
          <div className="card-section">
            <CategoryForm
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
            <h1>View FRA Category</h1>
            <p className="page-sub">Monitor category data.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={() => setView(VIEWS.UPDATE)}>
              Edit
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => setConfirm({ mode: 'hardDelete', category: selected })}
            >
              Delete permanently
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-section">
            <h2 className="card-title">Category details</h2>
            <dl className="detail-list" style={{ marginTop: '1rem' }}>
              <dt>Category ID</dt>
              <dd>{String(selected.category_id).padStart(3, '0')}</dd>
              <dt>Name</dt>
              <dd>{selected.category_name}</dd>
              <dt>Description</dt>
              <dd>{selected.description || '—'}</dd>
              <dt>Status</dt>
              <dd>
                <span className={`pill ${suspended ? 'danger' : 'ok'}`}>
                  {suspended ? 'Hidden' : 'Active'}
                </span>
              </dd>
            </dl>
          </div>
        </div>
        <ConfirmModal
          open={Boolean(confirm)}
          variant="danger"
          title="Permanently delete category?"
          message="Removes the row only if no fundraising activities use this category. Otherwise you will see an error."
          confirmLabel="Delete permanently"
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
          <h1>FRA Categories</h1>
          <p className="page-sub">Browse categories and open one to view, update, or delete.</p>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={() => { clearMessages(); setSelected(null); setView(VIEWS.CREATE) }}
        >
          + Create Category
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
              onKeyDown={(e) => { if (e.key === 'Enter') setApplied(search.trim()) }}
              placeholder="Search by name / description…"
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
                <th className="category-id-col">Category ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const suspended = Boolean(c.is_suspended)
                return (
                  <tr key={c.category_id}>
                    <td className="muted category-id-col">
                      {c.category_id != null ? String(c.category_id).padStart(3, '0') : '—'}
                    </td>
                    <td>{c.category_name}</td>
                    <td className="muted">{c.description ? c.description.slice(0, 60) + (c.description.length > 60 ? '…' : '') : '—'}</td>
                    <td>
                      <span className={`pill ${suspended ? 'danger' : 'ok'}`}>
                        {suspended ? 'Hidden' : 'Active'}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => { setSelected(c); setView(VIEWS.VIEW) }}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => { setSelected(c); setView(VIEWS.UPDATE) }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-link danger"
                        onClick={() => setConfirm({ mode: 'hardDelete', category: c })}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && categories.length === 0 ? (
            <div className="data-empty">No categories found.</div>
          ) : null}
          {loading ? <div className="data-empty">Loading…</div> : null}
        </div>
      </div>

      <ConfirmModal
        open={Boolean(confirm)}
        variant="danger"
        title="Permanently delete category?"
        message="Removes the row only if no fundraising activities use this category. Otherwise you will see an error."
        confirmLabel="Delete permanently"
        busy={saving}
        onCancel={() => setConfirm(null)}
        onConfirm={performConfirm}
      />
    </main>
  )
}
