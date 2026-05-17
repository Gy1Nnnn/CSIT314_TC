# Deploy Courage (Flask + React)

You deploy **two pieces**: the **API** (Python) and the **SPA** (static files). Local dev uses one machine; production usually uses **one URL for the backend** and **one URL for the frontend**.

---

## A. Backend API (Render — free tier friendly)

1. Push your repo to **GitHub** (if it is not there yet).

2. Go to [render.com](https://render.com) → sign up with GitHub → **New +** → **Web Service**.

3. Connect the repo `CSIT314_TC` (or your fork).

4. Configure:

   | Field | Value |
   |--------|--------|
   | **Root Directory** | *(leave empty — repository root)* |
   | **Runtime** | Python 3 |
   | **Build Command** | `pip install -r backend/requirements.txt` |
   | **Start Command** | `gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 120 backend.app:app` |
   | **Instance type** | Free *(ok for coursework)* |

5. **Create Web Service**. Wait for deploy; open the URL Render gives you, e.g.  
   `https://courage-api-xxxx.onrender.com`

6. **Smoke test:** open the Render **Logs** tab — the process should boot without tracebacks. Hit an API route your app exposes (e.g. something under `/api/...`) if you have a public health endpoint.

7. **CORS:** The app uses `flask_cors` with defaults suitable for browser calls from another origin (e.g. GitHub Pages).

8. **SQLite warning:** On free Render, the filesystem is **ephemeral**. Restarts or redeploys can **reset** `backend/app.sqlite`. For a stable demo, redeploy seed data via script or use Render **persistent disk** (paid) / migrate to Postgres later.

---

## B. Frontend (GitHub Pages — already wired in CI)

1. GitHub repo → **Settings** → **Pages** → **Build and deployment** → Source: **GitHub Actions**.

2. **Secrets:** **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

   - Name: `VITE_API_BASE_URL`  
   - Value: your Render API base **only**, e.g. `https://courage-api-xxxx.onrender.com`  
     (no trailing slash, no `/api` suffix.)

3. Push to **`main`**. The workflow **CI & CD** runs tests, builds the SPA with:

   - `VITE_BASE=/YourRepoName/` (for project Pages URL)
   - `VITE_API_BASE_URL` from the secret

4. After **Deploy frontend (GitHub Pages)** succeeds, the site is:

   `https://<your-username>.github.io/<repository-name>/`

5. Open that URL, try **Login**. If requests fail, check:

   - Secret spelled correctly; redeploy by pushing an empty commit or re-run workflow.
   - Browser **Console** / **Network** for blocked requests (mixed content: API must be **https**).

---

## C. Quick local test of “production” front + remote API

From `frontend/`:

```powershell
$env:VITE_API_BASE_URL="https://your-service.onrender.com"
npm run build
npm run preview
```

Open the preview URL and confirm login/API calls hit Render.

---

## D. Files that matter for deployment

| File | Role |
|------|------|
| `Procfile` | Start command for Render/Railway (`gunicorn … backend.app:app`) |
| `backend/requirements.txt` | Includes **gunicorn** |
| `runtime.txt` | Python version hint for some hosts |
| `.github/workflows/ci.yml` | Builds SPA + optional GitHub Pages deploy |
| `frontend/.env.example` | Documents `VITE_API_BASE_URL` and `VITE_BASE` |

---

## E. Alternatives (short)

| Host | Backend | Frontend |
|------|---------|----------|
| **Railway** | Connect repo; use the same start command as the `web` line in `Procfile` | Same GitHub Pages or Railway static |
| **Fly.io** | `fly launch` with Dockerfile (you would add one) | Pages |
| **Azure / AWS** | App Service / Elastic Beanstalk + gunicorn | Static Web Apps / S3 |

---

## F. Checklist before demo

- [ ] Render service **Live** (free tier may cold-start ~30s on first request).
- [ ] `VITE_API_BASE_URL` matches Render URL exactly.
- [ ] GitHub Actions **Deploy frontend** job green on `main`.
- [ ] Log in on the **Pages URL** (not only localhost).

If anything fails, paste the **Render logs** and the **failed GitHub Actions job** log when asking for help.
