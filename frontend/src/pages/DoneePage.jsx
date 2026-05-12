/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/ApiClient.js'
import './DoneePage.css'

export default function DoneePage({ user }) {
  const accountId = user?.account_id

  const [tab, setTab] = useState('browse')

  const [browseInput, setBrowseInput] = useState('')
  const [browseApplied, setBrowseApplied] = useState('')
  const [browseReload, setBrowseReload] = useState(0)
  const [browseList, setBrowseList] = useState([])
  const [browseLoading, setBrowseLoading] = useState(false)

  const [favInput, setFavInput] = useState('')
  const [favApplied, setFavApplied] = useState('')
  const [favReload, setFavReload] = useState(0)
  const [favList, setFavList] = useState([])
  const [favLoading, setFavLoading] = useState(false)

  const [favoriteActivityIds, setFavoriteActivityIds] = useState(() => new Set())

  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [saving, setSaving] = useState(false)

  const refreshFavoriteIds = useCallback(async () => {
    if (accountId == null) return
    try {
      const data = await api.listDoneeFavorites(accountId, '')
      const list = Array.isArray(data.favorites) ? data.favorites : []
      setFavoriteActivityIds(new Set(list.map((f) => f.activity_id)))
    } catch {
      setFavoriteActivityIds(new Set())
    }
  }, [accountId])

  useEffect(() => {
    refreshFavoriteIds()
  }, [refreshFavoriteIds])

  useEffect(() => {
    if (accountId == null || tab !== 'browse') return
    let cancelled = false
    async function load() {
      setBrowseLoading(true)
      setError(null)
      try {
        const data = await api.listPublicActivities(browseApplied.trim())
        if (cancelled) return
        setBrowseList(Array.isArray(data.activities) ? data.activities : [])
      } catch (e) {
        if (!cancelled) {
          setBrowseList([])
          setError(e?.data?.message || e?.message || 'Could not load activities.')
        }
      } finally {
        if (!cancelled) setBrowseLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [accountId, browseApplied, browseReload, tab])

  useEffect(() => {
    if (accountId == null || tab !== 'favorites') return
    let cancelled = false
    async function load() {
      setFavLoading(true)
      setError(null)
      try {
        const data = await api.listDoneeFavorites(accountId, favApplied.trim())
        if (cancelled) return
        setFavList(Array.isArray(data.favorites) ? data.favorites : [])
      } catch (e) {
        if (!cancelled) {
          setFavList([])
          setError(e?.data?.message || e?.message || 'Could not load favorites.')
        }
      } finally {
        if (!cancelled) setFavLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [accountId, favApplied, favReload, tab])

  async function openDetail(activityId) {
    setDetail(null)
    setDetailLoading(true)
    setError(null)
    try {
      const data = await api.viewPublicActivity(activityId)
      setDetail(data.activity || null)
    } catch (e) {
      setDetail(null)
      setError(e?.data?.message || e?.message || 'Could not load activity details.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function addFavorite(activityId) {
    if (accountId == null) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await api.addDoneeFavorite(accountId, activityId)
      setSuccess('Saved to your favorites.')
      setFavoriteActivityIds((prev) => new Set([...prev, activityId]))
      if (tab === 'favorites') {
        const data = await api.listDoneeFavorites(accountId, favApplied.trim())
        setFavList(Array.isArray(data.favorites) ? data.favorites : [])
      }
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not save favorite.')
    } finally {
      setSaving(false)
    }
  }

  async function removeFavorite(activityId) {
    if (accountId == null) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await api.removeDoneeFavorite(accountId, activityId)
      setSuccess('Removed from favorites.')
      setFavoriteActivityIds((prev) => {
        const n = new Set(prev)
        n.delete(activityId)
        return n
      })
      setFavList((list) => list.filter((f) => f.activity_id !== activityId))
      if (detail?.activity_id === activityId) setDetail(null)
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not remove favorite.')
    } finally {
      setSaving(false)
    }
  }

  function formatDate(iso) {
    if (!iso) return '—'
    try {
      return new Date(iso + 'T12:00:00').toLocaleDateString()
    } catch {
      return iso
    }
  }

  return (
    <main className="mup-page donee-page">
      <header className="mup-header">
        <div>
          <h1>Donee</h1>
          <p className="mup-sub">
            Search fundraising activities, view details, and save campaigns to your favorites.
          </p>
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

      <nav className="mup-tabs" role="tablist" aria-label="Donee sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'browse'}
          className={`mup-tab ${tab === 'browse' ? 'active' : ''}`}
          onClick={() => {
            setTab('browse')
            setSuccess(null)
          }}
        >
          Search activities
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'favorites'}
          className={`mup-tab ${tab === 'favorites' ? 'active' : ''}`}
          onClick={() => {
            setTab('favorites')
            setSuccess(null)
          }}
        >
          My favorites
        </button>
      </nav>

      {tab === 'browse' ? (
        <section className="mup-panel" role="tabpanel" aria-label="Search fundraising activities">
          <div className="mup-panel-header">
            <h2>Available activities</h2>
          </div>
          <div className="donee-toolbar">
            <label className="mup-search mup-search-compact">
              <span className="mup-label">Search</span>
              <input
                value={browseInput}
                onChange={(e) => setBrowseInput(e.target.value)}
                placeholder="Name, category, or activity ID"
              />
            </label>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={() => {
                setBrowseApplied(browseInput.trim())
                setBrowseReload((n) => n + 1)
              }}
              disabled={browseLoading}
            >
              Search
            </button>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={() => {
                setBrowseInput('')
                setBrowseApplied('')
                setBrowseReload((n) => n + 1)
              }}
              disabled={browseLoading}
            >
              Clear
            </button>
          </div>

          <div className="donee-table">
            <div className="donee-row donee-head" aria-hidden="true">
              <div>ID</div>
              <div>Activity</div>
              <div>Category</div>
              <div>Organizer</div>
              <div className="donee-actions">Actions</div>
            </div>
            {browseLoading ? (
              <p className="mup-muted" style={{ padding: '1rem 0.4rem' }}>
                Loading…
              </p>
            ) : null}
            {!browseLoading &&
              browseList.map((a) => (
                <div key={a.activity_id} className="donee-row">
                  <div className="mup-muted">{String(a.activity_id).padStart(3, '0')}</div>
                  <div className="mup-strong">{a.activity_name}</div>
                  <div className="mup-muted">{a.category_name || '—'}</div>
                  <div className="mup-muted">{a.organizer_name || '—'}</div>
                  <div className="donee-actions">
                    <button
                      type="button"
                      className="mup-linkbtn"
                      onClick={() => openDetail(a.activity_id)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="mup-linkbtn"
                      disabled={saving || favoriteActivityIds.has(a.activity_id)}
                      onClick={() => addFavorite(a.activity_id)}
                    >
                      {favoriteActivityIds.has(a.activity_id) ? 'Saved' : 'Save'}
                    </button>
                  </div>
                </div>
              ))}
            {!browseLoading && browseList.length === 0 ? (
              <p className="mup-muted" style={{ padding: '1rem 0.4rem' }}>
                No matching activities. Try another search or clear filters.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === 'favorites' ? (
        <section className="mup-panel" role="tabpanel" aria-label="My favorite activities">
          <div className="mup-panel-header">
            <h2>Favorites</h2>
          </div>
          <div className="donee-toolbar">
            <label className="mup-search mup-search-compact">
              <span className="mup-label">Search favorites</span>
              <input
                value={favInput}
                onChange={(e) => setFavInput(e.target.value)}
                placeholder="Name, category, or activity ID"
              />
            </label>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={() => {
                setFavApplied(favInput.trim())
                setFavReload((n) => n + 1)
              }}
              disabled={favLoading}
            >
              Search
            </button>
            <button
              type="button"
              className="mup-btn secondary"
              onClick={() => {
                setFavInput('')
                setFavApplied('')
                setFavReload((n) => n + 1)
              }}
              disabled={favLoading}
            >
              Clear
            </button>
          </div>

          <div className="donee-table">
            <div className="donee-row donee-head" aria-hidden="true">
              <div>ID</div>
              <div>Activity</div>
              <div>Category</div>
              <div>Saved</div>
              <div className="donee-actions">Actions</div>
            </div>
            {favLoading ? (
              <p className="mup-muted" style={{ padding: '1rem 0.4rem' }}>
                Loading…
              </p>
            ) : null}
            {!favLoading &&
              favList.map((f) => (
                <div key={`${f.favorite_id}-${f.activity_id}`} className="donee-row">
                  <div className="mup-muted">{String(f.activity_id).padStart(3, '0')}</div>
                  <div className="mup-strong">{f.activity_name}</div>
                  <div className="mup-muted">{f.category_name || '—'}</div>
                  <div className="mup-muted">
                    {f.created_at ? formatDate(f.created_at.split(' ')[0]) : '—'}
                  </div>
                  <div className="donee-actions">
                    <button type="button" className="mup-linkbtn" onClick={() => openDetail(f.activity_id)}>
                      View
                    </button>
                    <button
                      type="button"
                      className="mup-linkbtn"
                      disabled={saving}
                      onClick={() => removeFavorite(f.activity_id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            {!favLoading && favList.length === 0 ? (
              <p className="mup-muted" style={{ padding: '1rem 0.4rem' }}>
                No favorites yet. Save activities from the Search tab.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {detail != null || detailLoading ? (
        <div
          className="mup-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Activity details"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetail(null)
          }}
        >
          <div className="mup-modal-card">
            <div className="mup-modal-head">
              <h2>Activity details</h2>
              <button type="button" className="mup-linkbtn" onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
            {detailLoading ? (
              <p className="mup-muted">Loading…</p>
            ) : detail ? (
              <>
                <div className="mup-modal-grid">
                  <div className="mup-modal-item">
                    <div className="mup-modal-label">Activity ID</div>
                    <div className="mup-strong">{String(detail.activity_id).padStart(3, '0')}</div>
                  </div>
                  <div className="mup-modal-item">
                    <div className="mup-modal-label">Name</div>
                    <div className="mup-strong">{detail.activity_name}</div>
                  </div>
                  <div className="mup-modal-item">
                    <div className="mup-modal-label">Category</div>
                    <div className="mup-muted">{detail.category_name || '—'}</div>
                  </div>
                  <div className="mup-modal-item">
                    <div className="mup-modal-label">Organizer</div>
                    <div className="mup-muted">{detail.organizer_name || '—'}</div>
                  </div>
                  <div className="mup-modal-item">
                    <div className="mup-modal-label">Status</div>
                    <div className="mup-muted">{detail.status || '—'}</div>
                  </div>
                  <div className="mup-modal-item mup-modal-item-full">
                    <div className="mup-modal-label">Description</div>
                    <div className="mup-muted">{detail.description || '—'}</div>
                  </div>
                  <div className="mup-modal-item">
                    <div className="mup-modal-label">Start</div>
                    <div className="mup-muted">{detail.start_date || '—'}</div>
                  </div>
                  <div className="mup-modal-item">
                    <div className="mup-modal-label">End</div>
                    <div className="mup-muted">{detail.end_date || '—'}</div>
                  </div>
                  <div className="mup-modal-item">
                    <div className="mup-modal-label">Target amount</div>
                    <div className="mup-muted">
                      {detail.target_amount === 0 || detail.target_amount
                        ? Number(detail.target_amount).toLocaleString()
                        : '—'}
                    </div>
                  </div>
                </div>
                <div className="mup-actions">
                  <button type="button" className="mup-btn secondary" onClick={() => setDetail(null)}>
                    Back
                  </button>
                  {favoriteActivityIds.has(detail.activity_id) ? (
                    <button
                      type="button"
                      className="mup-btn secondary"
                      disabled={saving}
                      onClick={() => removeFavorite(detail.activity_id)}
                    >
                      Remove from favorites
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mup-btn primary"
                      disabled={saving}
                      onClick={() => addFavorite(detail.activity_id)}
                    >
                      Save to favorites
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  )
}
