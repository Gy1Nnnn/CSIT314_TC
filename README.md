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

## Demo accounts

Use the bundled `backend/app.sqlite` (created on first run if missing). On the login page, **select the profile role first**, then enter email and password.

| Role | Email | Password |
|------|-------|----------|
| User Admin | `admin@gmail.com` | `qwertyui` |
| Fundraiser | `fundraiser@gmail.com` | `qwertyui` |
| Platform Manager | `abc@gmail.com` | `qwertyui` |
| Donee | `donee@gmail.com` | `qwertyui |

Bulk-seeded accounts (from `backend/`: `python -m scripts.seed_demo_data`) use password `password123`, e.g. `fundraiser01@gmail.com`, `donee01@gmail.com`, `pm01@gmail.com`.

**Live site:** https://gy1nnnn.github.io/CSIT314_TC/ — requires a deployed API and `VITE_API_BASE_URL` in GitHub Actions secrets.

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

### Continuous integration & deployment (GitHub Actions)

Workflow: `.github/workflows/ci.yml` (**CI & CD**).

| Job | When | What it does |
|-----|------|----------------|
| **Backend (pytest)** | Every push / PR | `pytest backend/tests` |
| **Frontend (lint + build)** | Every push / PR | `npm run lint` and `npm run build` with `VITE_BASE=/repo-name/` (matches GitHub Pages) |
| **Deploy frontend (GitHub Pages)** | Push to **`main` only** | Uploads `frontend/dist` to GitHub Pages (static site) |

**CI test case coverage:** all tests under `backend/tests/`; frontend must lint and build.

#### CD: GitHub Pages (frontend only)

1. In the GitHub repo: **Settings → Pages → Build and deployment → Source:** **GitHub Actions**.
2. **Deploy the Flask API elsewhere** (Render, Railway, VM, …). The live site cannot use the Vite dev proxy, so the browser must call your API **origin** directly.
3. In **Settings → Secrets and variables → Actions**, add repository secret **`VITE_API_BASE_URL`**  
   Example value: `https://your-service.onrender.com` (no trailing slash).  
   If this secret is missing, the SPA still builds but `fetch` defaults to the Pages host (`/api` will 404 until you set the secret and redeploy).
4. After a successful run on `main`, the site is at  
   `https://<user>.github.io/<repo>/` (project site).  
   `VITE_BASE` is set automatically from the repo name in CI.

See `frontend/.env.example` for local production-style testing.

#### Backend CD (not in GitHub Actions)

Host `backend/` with your provider (gunicorn + Flask via `Procfile`, SQLite path or Postgres). Enable **CORS** for your Pages origin (this project already uses `flask_cors`). For coursework, running the API on your laptop during demo is fine; Pages can still point at **`ngrok`** or similar if you expose port 5000.

### Status badge (optional)

Replace `OWNER` and `REPO`:

```markdown
[![CI & CD](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions)
```



