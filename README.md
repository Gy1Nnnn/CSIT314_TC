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

From `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest -v
```
