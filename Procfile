# Repo root. Used by Render, Railway, Heroku-style hosts.
# SQLite: use 1 worker to avoid file locks on backend/app.sqlite
web: gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 120 backend.app:app
