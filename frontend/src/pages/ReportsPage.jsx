import './ReportsPage.css'

export default function ReportsPage() {
  return (
    <main className="page reports-page">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="page-sub">
            Platform reporting will appear here. There is no reporting API wired yet in this
            build.
          </p>
        </div>
      </div>
      <div className="card">
        <p className="reports-placeholder">
          Use <strong>Manage platform</strong> for categories. When backend report endpoints exist,
          charts and exports can be added on this page.
        </p>
      </div>
    </main>
  )
}
