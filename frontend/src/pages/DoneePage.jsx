/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/ApiClient.js'
import './DoneePage.css'

export default function DoneePage({ user }) {
  const accountId = user?.account_id

  const [tab, setTab] = useState('browse')

  const [categories, setCategories] = useState([])

  const [histCat, setHistCat] = useState('')
  const [histFrom, setHistFrom] = useState('')
  const [histTo, setHistTo] = useState('')
  const [histSearch, setHistSearch] = useState('')
  const [histApplied, setHistApplied] = useState({
    cat: '',
    from: '',
    to: '',
    search: '',
  })
  const [histList, setHistList] = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [historyDetail, setHistoryDetail] = useState(null)

  const [donationAmount, setDonationAmount] = useState('')
  const [donationSaving, setDonationSaving] = useState(false)

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
    if (accountId == null) return
    let cancelled = false
    async function loadCats() {
      try {
        const data = await api.listCategories('')
        if (cancelled) return
        const list = Array.isArray(data.categories) ? data.categories : []
        setCategories(list.filter((c) => !c.is_suspended))
      } catch {
        if (!cancelled) setCategories([])
      }
    }
    loadCats()
    return () => { cancelled = true }
  }, [accountId])

  useEffect(() => {
    if (accountId == null || tab !== 'history') return
    let cancelled = false
    async function load() {
      setHistLoading(true)
      setError(null)
      try {
        const data = await api.listDoneeDonations({
          accountId,
          categoryId: histApplied.cat ? Number(histApplied.cat) : undefined,
          dateFrom: histApplied.from || undefined,
          dateTo: histApplied.to || undefined,
          activityIdOrCategoryName: histApplied.search || undefined,
        })
        if (cancelled) return
        setHistList(Array.isArray(data.donations) ? data.donations : [])
      } catch (e) {
        if (!cancelled) {
          setHistList([])
          setError(e?.data?.message || e?.message || 'Could not load donation history.')
        }
      } finally {
        if (!cancelled) setHistLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [accountId, tab, histApplied])

  useEffect(() => {
    if (detail == null) {
      setDonationAmount('')
    }
  }, [detail])

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

  async function openHistoryDetail(donationId) {
    if (accountId == null) return
    setHistoryDetail(null)
    setSaving(true)
    setError(null)
    try {
      const data = await api.viewDoneeDonation(accountId, donationId)
      setHistoryDetail(data.donation || null)
    } catch (e) {
      setHistoryDetail(null)
      setError(e?.data?.message || e?.message || 'Could not load donation details.')
    } finally {
      setSaving(false)
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

  function fmtDonatedAt(s) {
    if (!s) return '—'
    const part = String(s).split(/[T ]/)[0]
    return fmtDate(part)
  }

  function fmtMoney(n) {
    if (n == null || n === '') return '—'
    const x = Number(n)
    if (!Number.isFinite(x)) return '—'
    return x.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  function applyHistFilters() {
    setHistApplied({
      cat: histCat,
      from: histFrom,
      to: histTo,
      search: histSearch.trim(),
    })
  }

  function clearHistFilters() {
    setHistCat('')
    setHistFrom('')
    setHistTo('')
    setHistSearch('')
    setHistApplied({ cat: '', from: '', to: '', search: '' })
  }

  async function recordDonation() {
    if (accountId == null || detail == null) return
    const amt = Number(String(donationAmount).replace(/,/g, '').trim())
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    setDonationSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await api.recordDoneeDonation({
        accountId,
        activityId: detail.activity_id,
        amount: amt,
      })
      setSuccess('Saved to your donation history.')
      setDonationAmount('')
      if (tab === 'history') {
        setHistApplied((h) => ({ ...h }))
      }
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not save contribution.')
    } finally {
      setDonationSaving(false)
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Discover causes & track contributions</h1>
          <p className="page-sub">
            Search active campaigns, save favourites, and log contributions you make outside
            Courage. Use the history tab to filter past gifts by category and date.
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
        <button
          role="tab"
          aria-selected={tab === 'history'}
          className={tab === 'history' ? 'active' : ''}
          onClick={() => { setTab('history'); setSuccess(null) }}
        >
          Donation history
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
                    <th className="activity-id-col">Activity ID</th>
                    <th>Activity</th>
                    <th>Category</th>
                    <th>Fundraiser</th>
                    <th>Status</th>
                    <th className="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {browseList.map((a) => (
                    <tr key={a.activity_id}>
                      <td className="muted activity-id-col">
                        {a.activity_id != null ? String(a.activity_id).padStart(3, '0') : '—'}
                      </td>
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
                    <th className="activity-id-col">Activity ID</th>
                    <th>Activity</th>
                    <th>Category</th>
                    <th>Saved</th>
                    <th className="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {favList.map((f) => (
                    <tr key={`${f.favorite_id}-${f.activity_id}`}>
                      <td className="muted activity-id-col">
                        {f.activity_id != null ? String(f.activity_id).padStart(3, '0') : '—'}
                      </td>
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

        {tab === 'history' ? (
          <>
            <p className="donee-hint">
              See everything you have logged. Filter by campaign category and the date of the
              contribution. To add a row, open any activity (here or from the categories page) and use{' '}
              <strong>Log a contribution</strong>.
            </p>
            <div className="toolbar donee-history-toolbar">
              <label className="donee-filter">
                <span className="donee-filter-label">Category</span>
                <select
                  value={histCat}
                  onChange={(e) => setHistCat(e.target.value)}
                  aria-label="Filter by category"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={String(c.category_id)}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="donee-filter">
                <span className="donee-filter-label">From</span>
                <input
                  type="date"
                  value={histFrom}
                  onChange={(e) => setHistFrom(e.target.value)}
                  aria-label="Contributions on or after"
                />
              </label>
              <label className="donee-filter">
                <span className="donee-filter-label">To</span>
                <input
                  type="date"
                  value={histTo}
                  onChange={(e) => setHistTo(e.target.value)}
                  aria-label="Contributions on or before"
                />
              </label>
              <div className="search donee-history-search">
                <input
                  value={histSearch}
                  onChange={(e) => setHistSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyHistFilters() }}
                  placeholder="Search by activity or category…"
                  aria-label="Search contributions"
                />
              </div>
              <button
                type="button"
                className="btn"
                onClick={applyHistFilters}
                disabled={histLoading}
              >
                Apply filters
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={clearHistFilters}
                disabled={histLoading}
              >
                Clear
              </button>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="activity-id-col">Activity ID</th>
                    <th>Amount (logged)</th>
                    <th>Activity</th>
                    <th>Category</th>
                    <th>Fundraiser</th>
                    <th className="actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {histList.map((d) => (
                    <tr key={d.donation_id}>
                      <td className="muted">{fmtDonatedAt(d.donated_at)}</td>
                      <td className="muted activity-id-col">
                        {d.activity_id != null ? String(d.activity_id).padStart(3, '0') : '—'}
                      </td>
                      <td>{fmtMoney(d.amount)}</td>
                      <td>{d.activity_name}</td>
                      <td className="muted">{d.category_name || '—'}</td>
                      <td className="muted">{d.organizer_name || '—'}</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn-link"
                          disabled={saving}
                          onClick={() => { void openHistoryDetail(d.donation_id) }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!histLoading && histList.length === 0 ? (
                <div className="data-empty">
                  No contributions match these filters. Add one from an activity&apos;s detail view,
                  try the categories page <strong>Donate</strong> flow, or widen category or dates.
                </div>
              ) : null}
              {histLoading ? <div className="data-empty">Loading…</div> : null}
            </div>
          </>
        ) : null}
      </div>

      {historyDetail ? (
        <div
          className="modal-root"
          role="presentation"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setHistoryDetail(null) }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Donation history details"
          >
            <div className="modal-head">
              <h2>Donation history details</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setHistoryDetail(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <dl className="detail-list" style={{ marginTop: '0.5rem' }}>
              <dt>Donation ID</dt>
              <dd>{historyDetail.donation_id}</dd>
              <dt>Date</dt>
              <dd>{fmtDonatedAt(historyDetail.donated_at)}</dd>
              <dt>Amount</dt>
              <dd>{fmtMoney(historyDetail.amount)}</dd>
              <dt>Activity ID</dt>
              <dd>
                {historyDetail.activity_id != null
                  ? String(historyDetail.activity_id).padStart(3, '0')
                  : '—'}
              </dd>
              <dt>Activity</dt>
              <dd>{historyDetail.activity_name || '—'}</dd>
              <dt>Category</dt>
              <dd>{historyDetail.category_name || '—'}</dd>
              <dt>Fundraiser</dt>
              <dd>{historyDetail.organizer_name || '—'}</dd>
            </dl>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setHistoryDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                  <dt>Fundraiser</dt>
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
                  <dt>Raised</dt>
                  <dd>
                    {detail.amount_raised === 0 || detail.amount_raised
                      ? Number(detail.amount_raised).toLocaleString()
                      : '0'}
                  </dd>
                  <dt>Description</dt>
                  <dd>{detail.description || '—'}</dd>
                </dl>
                <div className="donee-donation-box">
                  <div className="donee-donation-row">
                    <label className="donee-filter">
                      <span className="donee-filter-label">Amount</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                        placeholder="e.g. 50"
                        aria-label="Amount"
                      />
                    </label>
                    <button
                      type="button"
                      className="btn primary"
                      disabled={donationSaving || saving}
                      onClick={recordDonation}
                    >
                      {donationSaving ? 'Donating…' : 'Donate'}
                    </button>
                  </div>
                </div>
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
