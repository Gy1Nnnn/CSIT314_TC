# CSIT314 Online Fundraising System

## Setup (first time)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
cd ../frontend
npm install
```

## Run

From `frontend/`:

```powershell
npm run dev:all
```

Backend → http://127.0.0.1:5000, frontend → http://localhost:5173. Press `Ctrl+C` to stop both.

## Test

### Backend (local)

From project root (same as CI):

```powershell
python -m pytest backend/tests -v
```

Or from `backend/` with venv activated:

```powershell
python -m pytest tests -v
```

### Frontend (local)

From `frontend/`:

```powershell
npm run lint
npm run build
```

### Continuous integration (GitHub Actions)

Workflow: `.github/workflows/ci.yml` (runs on push to `main`, pull requests, and manual **workflow_dispatch**).

| Job | What it runs | Purpose |
|-----|----------------|--------|
| **Backend (pytest)** | `python -m pytest backend/tests -v` | API / entity tests (login, user accounts, profiles, categories, FRA, donee, reports, etc.) |
| **Frontend (ESLint + Vite build)** | `npm ci` → `npm run lint` → `npm run build` | Catch React/JS issues and broken production builds |

**CI test case coverage (high level):** all automated tests under `backend/tests/` (e.g. Stories #6–#10 user accounts, login, logout, reports, categories). Add new tests there; CI fails if any test fails or lint/build errors.

### Continuous deployment (optional)

CI here only **builds and tests**. **CD** (deploy to a host) is separate, for example:

| Target | Typical approach |
|--------|------------------|
| Static frontend | Build artifact from `npm run build` → deploy `frontend/dist/` to Netlify, Vercel, S3, or GitHub Pages |
| Backend | Run Flask on Render, Railway, Azure App Service, or a VM; set env vars; use a persistent volume or managed DB for SQLite or migrate to Postgres |
| Full stack | Docker Compose with Flask + nginx serving `dist/`, or two services in one cloud project |

Add a second workflow (e.g. `.github/workflows/deploy.yml`) that runs **after** CI succeeds on `main`, only if you need automated releases.

### Status badge (optional)

After the repo is on GitHub, add to this README (replace `OWNER` and `REPO`):

```markdown
[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions)
```

