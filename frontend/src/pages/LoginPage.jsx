import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/ApiClient.js'
import './LoginPage.css'

function messageForProfilesHttpError(status) {
  if (status === 404) {
    return 'Profiles API was not found. Use npm run dev (or npm run preview) instead of opening the HTML file directly, and keep the backend running.'
  }
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return `Could not reach the backend (HTTP ${status}). Open a second terminal, run: cd backend then python app.py — then click Try again.`
  }
  return `Could not load profiles (HTTP ${status}).`
}

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [profilesError, setProfilesError] = useState(null)
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profileLoadAttempt, setProfileLoadAttempt] = useState(0)
  const [profileId, setProfileId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const profileSelected = Boolean(profileId)
  const canSubmit =
    profileSelected && email.trim().length > 0 && password.length > 0

  useEffect(() => {
    let cancelled = false
    async function loadProfiles() {
      setProfilesError(null)
      setProfilesLoading(true)
      try {
        const data = await api.getProfiles()
        if (cancelled) return
        setProfiles(Array.isArray(data.profiles) ? data.profiles : [])
      } catch (e) {
        if (!cancelled) {
          const status = typeof e?.status === 'number' ? e.status : null
          setProfilesError(
            status != null
              ? messageForProfilesHttpError(status)
              : 'Network error loading profiles. Start the backend: cd backend → python app.py — then click Try again.',
          )
          setProfiles([])
        }
      } finally {
        if (!cancelled) setProfilesLoading(false)
      }
    }
    loadProfiles()
    return () => {
      cancelled = true
    }
  }, [profileLoadAttempt])

  function handleProfileChange(e) {
    const value = e.target.value
    setProfileId(value)
    setStatus(null)
    if (!value) {
      setEmail('')
      setPassword('')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!profileSelected) return
    setStatus(null)
    setSubmitting(true)
    try {
      const data = await api.login({
          profile_id: Number(profileId),
          email,
          password,
      })
      setStatus({ type: 'success', text: data.message || 'Logged in.' })
      if (data.user) {
        onLogin?.(data.user)
        const role = (data.user.profile_name || '').toLowerCase()
        if (role === 'user admin') {
          navigate('/admin', { replace: true })
        } else if (role === 'fundraiser') {
          navigate('/fundraiser', { replace: true })
        } else if (role === 'platform management') {
          navigate('/platform', { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      }
    } catch (e) {
      setStatus({
        type: 'error',
        text: e?.data?.message || e?.message || 'Could not reach the server. Is the backend running?',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Log in</h1>
        <p className="login-lead">
          Choose your profile, then enter your email and password.
        </p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field-label">User profile</span>
            <select
              name="profile_id"
              value={profileId}
              onChange={handleProfileChange}
              disabled={profilesLoading}
              aria-busy={profilesLoading}
              aria-describedby="profile-hint"
            >
              <option value="">Select a profile</option>
              {profiles.map((p) => (
                <option key={p.profile_id} value={String(p.profile_id)}>
                  {p.profile_name}
                </option>
              ))}
            </select>
            <span id="profile-hint" className="field-hint">
              {profilesLoading
                ? 'Loading profiles…'
                : 'Select a profile before entering your sign-in details.'}
            </span>
            {profilesError ? (
              <span className="profiles-error-block" role="alert">
                <span className="field-error">{profilesError}</span>
                <button
                  type="button"
                  className="btn-retry"
                  onClick={() => setProfileLoadAttempt((n) => n + 1)}
                >
                  Try again
                </button>
              </span>
            ) : null}
          </label>

          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!profileSelected}
              required={profileSelected}
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!profileSelected}
              required={profileSelected}
            />
          </label>

          {status ? (
            <p
              className={`login-feedback ${status.type === 'error' ? 'is-error' : 'is-success'}`}
              role="status"
            >
              {status.text}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn-submit"
            disabled={submitting || !canSubmit}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-footer">
          <Link to="/">Back to home</Link>
        </p>
      </div>
    </main>
  )
}
