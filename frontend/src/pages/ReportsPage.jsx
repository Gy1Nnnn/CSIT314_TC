import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/ApiClient.js'
import './ManagePlatformPage.css'
import './ReportsPage.css'

function localISODate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function localISOYearMonth(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtMoney(n) {
  if (n == null || n === '') return '—'
  const x = Number(n)
  if (!Number.isFinite(x)) return '—'
  return x.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export default function ReportsPage({ user }) {
  const accountId = user?.account_id

  const [period, setPeriod] = useState('daily')
  const [dailyDate, setDailyDate] = useState(() => localISODate())
  const [weekRefDate, setWeekRefDate] = useState(() => localISODate())
  const [monthVal, setMonthVal] = useState(() => localISOYearMonth())

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchReport = useCallback(async () => {
    if (accountId == null) return
    setLoading(true)
    setError(null)
    try {
      const query = { accountId, period }
      if (period === 'monthly') query.month = monthVal
      else query.date = period === 'daily' ? dailyDate : weekRefDate
      const res = await api.getPlatformFundraisingReport(query)
      setData(res)
    } catch (e) {
      setData(null)
      setError(e?.data?.message || e?.message || 'Could not load report.')
    } finally {
      setLoading(false)
    }
  }, [accountId, period, dailyDate, weekRefDate, monthVal])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const rangeLabel =
    data?.range?.start && data?.range?.end
      ? data.range.start === data.range.end
        ? data.range.start
        : `${data.range.start} → ${data.range.end}`
      : ''

  return (
    <main className="page reports-page">
      <div className="page-header">
        <div>
          <h1>Fundraising reports</h1>
          <p className="page-sub">
            Daily, weekly, and monthly views of logged contributions, favourites, and campaign
            activity. Totals use donee donation records and dates stored in the platform database.
          </p>
        </div>
      </div>

      <div className="card reports-card">
        <div className="reports-period-tabs" role="tablist" aria-label="Report period">
          <button
            type="button"
            role="tab"
            aria-selected={period === 'daily'}
            className={period === 'daily' ? 'active' : ''}
            onClick={() => setPeriod('daily')}
          >
            Daily
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={period === 'weekly'}
            className={period === 'weekly' ? 'active' : ''}
            onClick={() => setPeriod('weekly')}
          >
            Weekly
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={period === 'monthly'}
            className={period === 'monthly' ? 'active' : ''}
            onClick={() => setPeriod('monthly')}
          >
            Monthly
          </button>
        </div>

        <div className="reports-toolbar">
          {period === 'daily' ? (
            <label className="reports-field">
              <span>Report day</span>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                aria-label="Report day"
              />
            </label>
          ) : null}
          {period === 'weekly' ? (
            <label className="reports-field">
              <span>Week containing</span>
              <input
                type="date"
                value={weekRefDate}
                onChange={(e) => setWeekRefDate(e.target.value)}
                aria-label="Pick any day in the week to report"
              />
            </label>
          ) : null}
          {period === 'monthly' ? (
            <label className="reports-field">
              <span>Calendar month</span>
              <input
                type="month"
                value={monthVal}
                onChange={(e) => setMonthVal(e.target.value)}
                aria-label="Report month"
              />
            </label>
          ) : null}
          <button type="button" className="btn" onClick={fetchReport} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {error ? (
          <div className="alert error" role="alert">
            {error}
          </div>
        ) : null}

        {data && !loading ? (
          <>
            <p className="reports-range-line">
              <strong>{period === 'daily' ? 'Day' : period === 'weekly' ? 'Week' : 'Month'}:</strong>{' '}
              {rangeLabel}
            </p>

            <div className="reports-kpis">
              <div className="reports-kpi">
                <span className="reports-kpi-label">Contributions (period)</span>
                <span className="reports-kpi-value">{fmtMoney(data.contributions_total)}</span>
                <span className="reports-kpi-sub">{data.contributions_count ?? 0} entries in range</span>
              </div>
              <div className="reports-kpi">
                <span className="reports-kpi-label">Favourites added</span>
                <span className="reports-kpi-value">{data.favorites_added ?? 0}</span>
                <span className="reports-kpi-sub">In this date range</span>
              </div>
              <div className="reports-kpi">
                <span className="reports-kpi-label">Campaigns completed</span>
                <span className="reports-kpi-value">{data.campaigns_completed_in_range ?? 0}</span>
                <span className="reports-kpi-sub">By end date in range</span>
              </div>
              <div className="reports-kpi">
                <span className="reports-kpi-label">Active campaigns (now)</span>
                <span className="reports-kpi-value">{data.active_campaigns ?? 0}</span>
                <span className="reports-kpi-sub">Platform snapshot</span>
              </div>
              <div className="reports-kpi">
                <span className="reports-kpi-label">Total views (all time)</span>
                <span className="reports-kpi-value">
                  {(data.total_views_all_campaigns ?? 0).toLocaleString()}
                </span>
                <span className="reports-kpi-sub">Across public campaign pages</span>
              </div>
            </div>

            <h2 className="reports-section-title">Contributions by category (period)</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.by_category || []).map((row) => (
                    <tr key={String(row.category_id ?? row.category_name)}>
                      <td>{row.category_name || '—'}</td>
                      <td>{fmtMoney(row.contributions_total)}</td>
                      <td>{row.contributions_count ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.by_category?.length ? (
                <div className="data-empty">No contributions in this period.</div>
              ) : null}
            </div>
          </>
        ) : null}

        {!data && !error && loading ? <p className="reports-muted">Loading…</p> : null}
      </div>
    </main>
  )
}
