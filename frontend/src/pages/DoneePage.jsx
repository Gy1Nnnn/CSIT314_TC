/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/ApiClient.js'
import './DoneePage.css'

export default function DoneePage({ user }) {
  const accountId = user?.account_id

  const [tab, setTab] = useState('browse')

  const [browseInput, setBrowseInput] = useState('')
  const [browseApplied, setBrowseApplied] = useState('')
  const [browseList, setBrowseList] = useState([])
  const [browseLoading, setBrowseLoading] = useState(false)

  const [favInput, setFavInput] = useState('')
  const [favApplied, setFavApplied] = useState('')
  const [favList, setFavList] = useState([])
  const [favLoading, setFavLoading] = useState(false)

  const [favoriteIds, setFavoriteIds] = useState(() => new Set())

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
      setFavoriteIds(new Set(list.map((f) => f.activity_id)))
    } catch {
      setFavoriteIds(new Set())
    }
  }, [accountId])

  useEffect(() => { refreshFavoriteIds() }, [refreshFavoriteIds])

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
    return () => { cancelled = true }
  }, [accountId, browseApplied, tab])

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
    return () => { cancelled = true }
  }, [accountId, favApplied, tab])

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
      setFavoriteIds((prev) => new Set([...prev, activityId]))
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
      setFavoriteIds((prev) => {
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

  function fmtDate(iso) {
    if (!iso) return '—'
    try { return new Date(iso + 'T12:00:00').toLocaleDateString() } catch { return iso }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Browse Fundraising Activities</h1>
          <p className="page-sub">
            Search active campaigns, view details, and save the ones you want to support.
          </p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Donee sections">
        <button
          role="tab"
          aria-selected={tab === 'browse'}
          className={tab === 'browse' ? 'active' : ''}
          onClick={() => { setTab('browse'); setSuccess(null) }}
        >
          Search activities
        </button>
        <button
          role="tab"
          aria-selected={tab === 'favorites'}
          className={tab === 'favorites' ? 'active' : ''}
          onClick={() => { setTab('favorites'); setSuccess(null) }}
        >
          My favourites
        </button>
      </div>

      {error ? <div className="alert error" style={{ marginTop: '1rem' }}>{error}</div> : null}
      {success ? <div className="alert success" style={{ marginTop: '1rem' }}>{success}</div> : null}

      <div className="card" style={{ marginTop: '1rem' }}>
        {tab === 'browse' ? (
          <>
            <div className="toolbar">
              <div className="search">
                <input
                  value={browseInput}
                  onChange={(e) => setBrowseInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setBrowseApplied(browseInput.trim()) }}
                  placeholder="Search by name, category, or activity ID…"
                />
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => setBrowseApplied(browseInput.trim())}
                disabled={browseLoading}
              >
                Search
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => { setBrowseInput(''); setBrowseApplied('') }}
                disabled={browseLoading}
              >
                Clear
              </button>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Category</th>
                    <th>Organizer</th>
                    <th>Status</th>
                    <th className="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {browseList.map((a) => (
                    <tr key={a.activity_id}>
                      <td>{a.activity_name}</td>
                      <td className="muted">{a.category_name || '—'}</td>
                      <td className="muted">{a.organizer_name || '—'}</td>
                      <td>
                        <span className="pill ok">{a.status || 'Active'}</span>
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => openDetail(a.activity_id)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn-link"
                          disabled={saving || favoriteIds.has(a.activity_id)}
                          onClick={() => addFavorite(a.activity_id)}
                        >
                          {favoriteIds.has(a.activity_id) ? 'Saved' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!browseLoading && browseList.length === 0 ? (
                <div className="data-empty">
                  No matching activities. Try another search or clear filters.
                </div>
              ) : null}
              {browseLoading ? <div className="data-empty">Loading…</div> : null}
            </div>
          </>
        ) : null}

        {tab === 'favorites' ? (
          <>
            <div className="toolbar">
              <div className="search">
                <input
                  value={favInput}
                  onChange={(e) => setFavInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setFavApplied(favInput.trim()) }}
                  placeholder="Search your favourites…"
                />
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => setFavApplied(favInput.trim())}
                disabled={favLoading}
              >
                Search
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => { setFavInput(''); setFavApplied('') }}
                disabled={favLoading}
              >
                Clear
              </button>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Category</th>
                    <th>Saved</th>
                    <th className="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {favList.map((f) => (
                    <tr key={`${f.favorite_id}-${f.activity_id}`}>
                      <td>{f.activity_name}</td>
                      <td className="muted">{f.category_name || '—'}</td>
                      <td className="muted">
                        {f.created_at ? fmtDate(f.created_at.split(' ')[0]) : '—'}
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => openDetail(f.activity_id)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn-link danger"
                          disabled={saving}
                          onClick={() => removeFavorite(f.activity_id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!favLoading && favList.length === 0 ? (
                <div className="data-empty">
                  No favourites yet. Save activities from the search tab.
                </div>
              ) : null}
              {favLoading ? <div className="data-empty">Loading…</div> : null}
            </div>
          </>
        ) : null}
      </div>

      {detail != null || detailLoading ? (
        <div
          className="modal-root"
          role="presentation"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setDetail(null) }}
        >
          <div
            className="modal-card lg"
            role="dialog"
            aria-modal="true"
            aria-label="Activity details"
          >
            <div className="modal-head">
              <h2>Activity details</h2>
              <button type="button" className="modal-close" onClick={() => setDetail(null)} aria-label="Close">×</button>
            </div>
            {detailLoading ? (
              <p className="modal-body">Loading…</p>
            ) : detail ? (
              <>
                <dl className="detail-list" style={{ marginTop: '0.5rem' }}>
                  <dt>Campaign</dt>
                  <dd>{detail.activity_name}</dd>
                  <dt>Category</dt>
                  <dd>{detail.category_name || '—'}</dd>
                  <dt>Organizer</dt>
                  <dd>{detail.organizer_name || '—'}</dd>
                  <dt>Status</dt>
                  <dd>
                    <span className="pill ok">{detail.status || 'Active'}</span>
                  </dd>
                  <dt>Start</dt>
                  <dd>{fmtDate(detail.start_date)}</dd>
                  <dt>End</dt>
                  <dd>{fmtDate(detail.end_date)}</dd>
                  <dt>Target amount</dt>
                  <dd>
                    {detail.target_amount === 0 || detail.target_amount
                      ? Number(detail.target_amount).toLocaleString()
                      : '—'}
                  </dd>
                  <dt>Description</dt>
                  <dd>{detail.description || '—'}</dd>
                </dl>
                <div className="modal-actions">
                  <button type="button" className="btn" onClick={() => setDetail(null)}>
                    Close
                  </button>
                  {favoriteIds.has(detail.activity_id) ? (
                    <button
                      type="button"
                      className="btn danger"
                      disabled={saving}
                      onClick={() => removeFavorite(detail.activity_id)}
                    >
                      Remove from favourites
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn primary"
                      disabled={saving}
                      onClick={() => addFavorite(detail.activity_id)}
                    >
                      Save to favourites
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
