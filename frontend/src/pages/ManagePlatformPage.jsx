/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/ApiClient.js'
import './ManagePlatformPage.css'

function CategoryForm({ mode, initial, nextId, onCancel, onSubmit, busy }) {
  const [categoryName, setCategoryName] = useState(initial.category_name || '')
  const [description, setDescription] = useState(initial.description || '')

  useEffect(() => {
    setCategoryName(initial.category_name || '')
    setDescription(initial.description || '')
  }, [initial])

  const canSubmit = categoryName.trim().length > 0 && !busy
  const displayId =
    mode === 'edit'
      ? String(initial.category_id || '').padStart(3, '0')
      : String(nextId || '').padStart(3, '0')

  return (
    <form
      className="mup-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit) return
        onSubmit({
          category_name: categoryName.trim(),
          description: description.trim(),
        })
      }}
    >
      <div className="mup-form-header">
        <h2>{mode === 'edit' ? 'Update category' : 'Create category'}</h2>
        {mode === 'edit' ? (
          <span className="mup-pill">Editing #{initial.category_id}</span>
        ) : null}
      </div>

      <label className="mup-field">
        <span className="mup-label">Category ID (Auto)</span>
        <input value={displayId} readOnly aria-readonly="true" />
      </label>

      <label className="mup-field">
        <span className="mup-label">Category name *</span>
        <input
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="e.g. Medical"
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

export default function ManagePlatformPage() {
  const [searchInput, setSearchInput] = useState('')
  const [searchApplied, setSearchApplied] = useState('')

  const [categories, setCategories] = useState([])
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

  async function loadCategories() {
    setError(null)
    setLoading(true)
    try {
      const data = await api.listCategories(tab === 'search' ? searchApplied.trim() : '')
      const list = Array.isArray(data.categories) ? data.categories : []
      setCategories(list)
      const maxId = list.reduce(
        (acc, c) => Math.max(acc, Number(c.category_id) || 0),
        0,
      )
      setNextId(maxId + 1)
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error loading categories. Is the backend running?')
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString])

  async function createCategory(payload) {
    setSaving(true)
    setError(null)
    try {
      await api.createCategory(payload)
      setFormMode('create')
      setSelected({})
      await loadCategories()
      setTab('list')
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error creating category.')
    } finally {
      setSaving(false)
    }
  }

  async function updateCategory(categoryId, payload) {
    setSaving(true)
    setError(null)
    try {
      await api.updateCategory(categoryId, payload)
      setFormMode('create')
      setSelected({})
      await loadCategories()
      setTab('list')
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error updating category.')
    } finally {
      setSaving(false)
    }
  }

  async function setSuspended(categoryId, suspend) {
    setSaving(true)
    setError(null)
    try {
      await api.suspendCategory(categoryId, suspend)
      await loadCategories()
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Network error updating suspension state.')
    } finally {
      setSaving(false)
    }
  }

  const formInitial = formMode === 'edit' ? selected : {}

  return (
    <main className="mup-page mpp-page">
      <header className="mup-header">
        <div>
          <h1>Manage Platform</h1>
          <p className="mup-sub">Create, view, update, suspend, and search FRA categories.</p>
        </div>
      </header>

      {error ? (
        <div className="mup-alert" role="alert">
          {error}
        </div>
      ) : null}

      <nav className="mup-tabs" role="tablist" aria-label="Category tabs">
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
          Show all categories
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
          className="mup-panel mpp-create-panel"
          role="tabpanel"
          aria-label="Create category"
        >
          <CategoryForm
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
              if (formMode === 'edit') return updateCategory(selected.category_id, payload)
              return createCategory(payload)
            }}
          />
        </section>
      ) : null}

      {tab === 'list' ? (
        <section className="mup-panel" role="tabpanel" aria-label="Show all categories">
          <div className="mup-panel-header">
            <h2>Show Categories</h2>
          </div>

          <div className="mup-toolbar mup-toolbar-split">
            <p className="mup-muted mup-banner">All the categories are here!</p>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={loadCategories}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          <div className="mup-table mpp-table">
            <div className="mup-row mup-head">
              <div>ID</div>
              <div>Name</div>
              <div>Status</div>
              <div className="mup-actions-col">Actions</div>
            </div>
            {categories.map((c) => {
              const suspended = Boolean(c.is_suspended)
              return (
                <div key={c.category_id} className="mup-row">
                  <div className="mup-muted mpp-col-id">
                    {String(c.category_id).padStart(3, '0')}
                  </div>
                  <div className="mup-name mpp-col-name">
                    <div className="mup-strong">{c.category_name}</div>
                  </div>
                  <div className="mpp-col-status">
                    <span className={`mup-tag ${suspended ? 'danger' : 'ok'}`}>
                      {suspended ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                  <div className="mup-actions-col mpp-col-actions">
                    <button type="button" className="mup-linkbtn" onClick={() => setViewing(c)}>
                      View
                    </button>
                    <button
                      type="button"
                      className="mup-linkbtn"
                      onClick={() => {
                        setFormMode('edit')
                        setSelected(c)
                        setTab('create')
                      }}
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      className="mup-linkbtn"
                      disabled={saving}
                      onClick={() => setSuspended(c.category_id, !suspended)}
                    >
                      {suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                  </div>
                </div>
              )
            })}
            {!loading && categories.length === 0 ? (
              <div className="mup-empty">No categories found.</div>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === 'search' ? (
        <section className="mup-panel" role="tabpanel" aria-label="Search categories">
          <div className="mup-panel-header">
            <h2>Search</h2>
          </div>

          <div className="mup-toolbar">
            <label className="mup-search mup-search-compact">
              <span className="mup-label">Search</span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="e.g. Medical or 003"
              />
            </label>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={loadCategories}
              disabled={loading}
            >
              Refresh
            </button>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={() => {
                if (searchApplied === searchInput) loadCategories()
                else setSearchApplied(searchInput)
              }}
              disabled={loading}
            >
              Search
            </button>
          </div>

          <div className="mup-table mpp-table">
            <div className="mup-row mup-head">
              <div>ID</div>
              <div>Name</div>
              <div>Status</div>
              <div className="mup-actions-col">Actions</div>
            </div>
            {categories.map((c) => {
              const suspended = Boolean(c.is_suspended)
              return (
                <div key={c.category_id} className="mup-row">
                  <div className="mup-muted mpp-col-id">
                    {String(c.category_id).padStart(3, '0')}
                  </div>
                  <div className="mup-name mpp-col-name">
                    <div className="mup-strong">{c.category_name}</div>
                  </div>
                  <div className="mpp-col-status">
                    <span className={`mup-tag ${suspended ? 'danger' : 'ok'}`}>
                      {suspended ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                  <div className="mup-actions-col mpp-col-actions">
                    <button type="button" className="mup-linkbtn" onClick={() => setViewing(c)}>
                      View
                    </button>
                    <button
                      type="button"
                      className="mup-linkbtn"
                      onClick={() => {
                        setFormMode('edit')
                        setSelected(c)
                        setTab('create')
                      }}
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      className="mup-linkbtn"
                      disabled={saving}
                      onClick={() => setSuspended(c.category_id, !suspended)}
                    >
                      {suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                  </div>
                </div>
              )
            })}
            {!loading && categories.length === 0 ? (
              <div className="mup-empty">No categories found.</div>
            ) : null}
          </div>
        </section>
      ) : null}

      {viewing ? (
        <div
          className="mup-modal"
          role="dialog"
          aria-modal="true"
          aria-label="View category"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewing(null)
          }}
        >
          <div className="mup-modal-card">
            <div className="mup-modal-head">
              <h2>View category</h2>
              <button type="button" className="mup-linkbtn" onClick={() => setViewing(null)}>
                Close
              </button>
            </div>

            <div className="mup-modal-grid">
              <div className="mup-modal-item">
                <div className="mup-modal-label">Category ID</div>
                <div className="mup-strong">
                  {String(viewing.category_id).padStart(3, '0')}
                </div>
              </div>
              <div className="mup-modal-item">
                <div className="mup-modal-label">Category name</div>
                <div className="mup-strong">{viewing.category_name}</div>
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

