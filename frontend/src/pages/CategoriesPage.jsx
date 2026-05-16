import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api/ApiClient.js'
import CategoryIcon from '../components/CategoryIcon.jsx'

export default function CategoriesPage({ user }) {
  const location = useLocation()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [donatePick, setDonatePick] = useState(null)
  const [viewActivity, setViewActivity] = useState(null)
  const [viewOpeningId, setViewOpeningId] = useState(null)
  const [supportAmount, setSupportAmount] = useState('')
  const [supportSaving, setSupportSaving] = useState(false)
  const [supportErr, setSupportErr] = useState(null)
  const [supportOk, setSupportOk] = useState(null)

  const selectedCategoryId = useMemo(() => {
    const params = new URLSearchParams(location.search || '')
    const raw = params.get('cat')
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [location.search])

  useEffect(() => {
    const raw = (location.hash || '').replace(/^#/, '')
    if (raw === 'browse') {
      window.requestAnimationFrame(() => {
        document.getElementById(raw)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [location.hash, loading, categories.length])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await api.listCategoriesWithActivities()
        if (cancelled) return
        const list = Array.isArray(data.categories) ? data.categories : []
        setCategories(
          list
            .filter((c) => !c.is_suspended)
            .map((c) => ({
              ...c,
              activities: Array.isArray(c.activities) ? c.activities : [],
            })),
        )
      } catch (e) {
        if (cancelled) return
        setError(
          e?.data?.message ||
            e?.message ||
            'Network error loading categories. Is the backend running?',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedCategory =
    selectedCategoryId == null
      ? null
      : categories.find((x) => x.category_id === selectedCategoryId) || null

  function openDonateModal(activity, categoryName) {
    setSupportAmount('')
    setSupportErr(null)
    setSupportOk(null)
    setSupportSaving(false)
    setDonatePick({ activity, categoryName })
  }

  function closeDonateModal() {
    setDonatePick(null)
    setSupportAmount('')
    setSupportErr(null)
    setSupportOk(null)
    setSupportSaving(false)
  }

  async function refreshCategoriesQuietly() {
    try {
      const data = await api.listCategoriesWithActivities()
      const list = Array.isArray(data.categories) ? data.categories : []
      setCategories(
        list
          .filter((c) => !c.is_suspended)
          .map((c) => ({
            ...c,
            activities: Array.isArray(c.activities) ? c.activities : [],
          })),
      )
    } catch {
      /* ignore refresh errors */
    }
  }

  async function submitDonation() {
    if (!donatePick) return
    const amt = Number(String(supportAmount).replace(/,/g, '').trim())
    if (!Number.isFinite(amt) || amt <= 0) {
      setSupportErr('Enter an amount greater than zero.')
      return
    }
    setSupportSaving(true)
    setSupportErr(null)
    setSupportOk(null)
    try {
      await api.recordDoneeDonation({
        accountId: user?.account_id,
        activityId: donatePick.activity.activity_id,
        amount: amt,
      })
      setSupportOk('Thank you! Your donation has been recorded toward this campaign.')
      setSupportAmount('')
      await refreshCategoriesQuietly()
    } catch (e) {
      setSupportErr(e?.data?.message || e?.message || 'Could not save.')
    } finally {
      setSupportSaving(false)
    }
  }

  async function openActivityDetail(activity, categoryName) {
    const id = activity?.activity_id
    if (id == null) return
    setViewOpeningId(id)
    setError(null)
    try {
      const data = await api.viewPublicActivity(id)
      const full = data?.activity
      if (!full) {
        setError('Could not load activity.')
        return
      }
      setViewActivity({ activity: full, categoryName })
    } catch (e) {
      setError(e?.data?.message || e?.message || 'Could not load activity.')
    } finally {
      setViewOpeningId(null)
    }
  }

  return (
    <main className="home-page">
      {!selectedCategory ? (
        <section
          className="home-browse-categories"
          id="browse"
          aria-labelledby="home-browse-title"
        >
          <div className="home-browse-inner">
            <h1 id="home-browse-title" className="home-browse-heading">
              Browse fundraising categories
            </h1>
            <p className="home-browse-sub">
              Choose a cause to see active campaigns you can explore and support.
            </p>
            {error ? (
              <div className="alert error" role="alert">
                {error}
              </div>
            ) : null}
            {loading ? <p className="home-muted home-browse-loading">Loading categories...</p> : null}
            {!loading && !error ? (
              <div className="home-browse-grid">
                {categories.length === 0 ? (
                  <p className="home-muted">No categories yet. Check back soon.</p>
                ) : (
                  categories.map((c, i) => (
                    <Link
                      key={c.category_id}
                      to={{ pathname: '/categories', search: `?cat=${c.category_id}`, hash: 'browse' }}
                      className="home-browse-tile"
                    >
                      <span className="home-browse-tile-icon" aria-hidden="true">
                        <CategoryIcon name={c.category_name} index={i} />
                      </span>
                      <span className="home-browse-tile-label">{c.category_name}</span>
                    </Link>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {selectedCategory ? (
        <div className="home-body" id="browse">
          {error ? (
            <div className="alert error" role="alert">
              {error}
            </div>
          ) : null}

          {loading ? <p className="home-muted">Loading...</p> : null}

          {!loading ? (
            <div className="home-selected-panel home-cat-panel" id={`cat-${selectedCategory.category_id}`}>
              <div className="home-campaigns-intro home-cat-intro">
                <h1 className="home-campaigns-title">{selectedCategory.category_name}</h1>
                {selectedCategory.description ? (
                  <p className="home-campaigns-sub">{selectedCategory.description}</p>
                ) : (
                  <p className="home-campaigns-sub">
                    Discover active fundraisers in this category. Open a campaign for full details or tap{' '}
                    <strong>Donate</strong> to contribute.
                  </p>
                )}
                <p className="home-cat-browse-all">
                  <Link to={{ pathname: '/categories', hash: 'browse' }}>Browse all categories</Link>
                </p>
              </div>
              {selectedCategory.activities.length === 0 ? (
                <div className="home-cat-empty">
                  <p className="home-muted">No fundraisers in this category yet.</p>
                </div>
              ) : (
                <ul
                  className="home-cat-cards"
                  aria-label={`Fundraisers in ${selectedCategory.category_name}`}
                >
                  {selectedCategory.activities.map((a) => {
                    const initial = (a.activity_name || '?').trim().slice(0, 1).toUpperCase()
                    const goal =
                      a.target_amount === 0 || a.target_amount
                        ? Number(a.target_amount).toLocaleString()
                        : null
                    const raisedNum =
                      a.amount_raised === 0 || a.amount_raised ? Number(a.amount_raised) : 0
                    const targetNum =
                      a.target_amount === 0 || a.target_amount ? Number(a.target_amount) : null
                    const pct =
                      targetNum != null && targetNum > 0 && Number.isFinite(raisedNum)
                        ? Math.min(100, (raisedNum / targetNum) * 100)
                        : 0
                    const desc = (a.description || '').trim()
                    return (
                      <li key={a.activity_id} className="home-cat-tile">
                        <div className="home-cat-tile-inner">
                          <div className="home-cat-tile-media" aria-hidden>
                            <span className="home-cat-tile-initial">{initial}</span>
                          </div>
                          <div className="home-cat-tile-main">
                            <button
                              type="button"
                              className="home-cat-tile-hit"
                              disabled={viewOpeningId === a.activity_id}
                              onClick={() =>
                                openActivityDetail(a, selectedCategory.category_name)
                              }
                            >
                              <h2 className="home-cat-tile-title">{a.activity_name}</h2>
                              {desc ? <p className="home-cat-tile-desc">{desc}</p> : null}
                              {goal != null || raisedNum > 0 ? (
                                <div className="home-cat-tile-goal">
                                  <div className="home-cat-tile-goal-row">
                                    <span className="home-cat-tile-goal-label">Raised</span>
                                    <span className="home-cat-tile-goal-value">
                                      {Number.isFinite(raisedNum) ? raisedNum.toLocaleString() : '0'}
                                    </span>
                                  </div>
                                  {goal != null ? (
                                    <div className="home-cat-tile-goal-row">
                                      <span className="home-cat-tile-goal-label">Goal</span>
                                      <span className="home-cat-tile-goal-value">{goal}</span>
                                    </div>
                                  ) : null}
                                  <div className="home-cat-tile-track" aria-hidden>
                                    <div
                                      className="home-cat-tile-track-fill"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </button>
                          </div>
                          <div className="home-cat-tile-cta">
                            <button
                              type="button"
                              className="btn sm"
                              disabled={viewOpeningId === a.activity_id}
                              onClick={() =>
                                openActivityDetail(a, selectedCategory.category_name)
                              }
                            >
                              {viewOpeningId === a.activity_id ? '...' : 'View'}
                            </button>
                            <button
                              type="button"
                              className="btn primary sm"
                              onClick={() => openDonateModal(a, selectedCategory.category_name)}
                            >
                              Donate
                            </button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {donatePick ? (
        <div
          className="modal-root"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDonateModal()
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-donate-title"
          >
            <div className="modal-head">
              <h2 id="home-donate-title">Donate</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={closeDonateModal}
              >
                x
              </button>
            </div>
            <div className="modal-body home-support-modal">
              <p className="home-support-lead">
                <strong>{donatePick.activity.activity_name}</strong>
                <span className="home-support-meta"> - {donatePick.categoryName}</span>
              </p>
              {supportOk ? (
                <div className="alert success" role="status">
                  {supportOk}
                </div>
              ) : null}
              {supportErr ? (
                <div className="alert error" role="alert">
                  {supportErr}
                </div>
              ) : null}
              {!supportOk ? (
                <div className="home-support-fields">
                  <label className="home-support-field home-support-field--full">
                    <span>Donation amount</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={supportAmount}
                      onChange={(e) => setSupportAmount(e.target.value)}
                      placeholder="e.g. 25"
                      disabled={supportSaving}
                      autoFocus
                      aria-label="Donation amount"
                    />
                  </label>
                </div>
              ) : null}
            </div>
            <div className="modal-actions">
              {supportOk ? (
                <button
                  type="button"
                  className="btn primary"
                  onClick={closeDonateModal}
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={supportSaving}
                    onClick={submitDonation}
                  >
                    {supportSaving ? 'Saving...' : 'Donate'}
                  </button>
                  <button type="button" className="btn" onClick={closeDonateModal}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {viewActivity ? (
        <div
          className="modal-root"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewActivity(null)
          }}
        >
          <div
            className="modal-card lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-view-title"
          >
            <div className="modal-head">
              <h2 id="home-view-title">{viewActivity.activity.activity_name}</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setViewActivity(null)}
              >
                x
              </button>
            </div>
            <dl className="detail-list" style={{ marginTop: '0.5rem' }}>
              <dt>Category</dt>
              <dd>{viewActivity.categoryName}</dd>
              <dt>Status</dt>
              <dd>{viewActivity.activity.status || '-'}</dd>
              <dt>Goal</dt>
              <dd>
                {viewActivity.activity.target_amount === 0 ||
                viewActivity.activity.target_amount
                  ? Number(viewActivity.activity.target_amount).toLocaleString()
                  : '-'}
              </dd>
              <dt>Raised</dt>
              <dd>
                {viewActivity.activity.amount_raised === 0 ||
                viewActivity.activity.amount_raised
                  ? Number(viewActivity.activity.amount_raised).toLocaleString()
                  : '0'}
              </dd>
              <dt>Start</dt>
              <dd>{viewActivity.activity.start_date || '-'}</dd>
              <dt>End</dt>
              <dd>{viewActivity.activity.end_date || '-'}</dd>
              <dt>Description</dt>
              <dd>{viewActivity.activity.description || '-'}</dd>
            </dl>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setViewActivity(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  openDonateModal(viewActivity.activity, viewActivity.categoryName)
                  setViewActivity(null)
                }}
              >
                Donate to this campaign
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
