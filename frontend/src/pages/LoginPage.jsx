import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import '../components/Logo.css'
import { api } from '../api/ApiClient.js'
import './LoginPage.css'

const ROLE_COPY = {
  default: {
    title: 'Sign in',
    sub: 'Choose your profile, then enter your email and password.',
  },
  'user admin': {
    title: 'User Admin Login',
    sub: 'Sign in to manage user accounts and profiles.',
  },
  fundraiser: {
    title: 'Fundraising Rep Login',
    sub: 'Sign in to manage fundraising activities.',
  },
  'platform manager': {
    title: 'Platform Manager Login',
    sub: 'Sign in to access category management and reports.',
  },
  donee: {
    title: 'Donee Login',
    sub: 'Sign in to browse activities and manage favourites.',
  },
}

function messageForProfilesHttpError(status) {
  if (status === 404) {
    return 'Profiles API was not found. Use npm run dev (or npm run preview) instead of opening the HTML file directly, and keep the backend running.'
  }
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return `Could not reach the backend (HTTP ${status}). The Flask API must be running on port 5000. Open a second terminal, cd to the project root (the folder that contains backend and frontend), then run: python -m backend.app Leave that window open and click Try again.`
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

  const selectedProfile = profiles.find(
    (p) => String(p.profile_id) === String(profileId),
  )
  const roleKey = (selectedProfile?.profile_name || '').toLowerCase()
  const copy = ROLE_COPY[roleKey] || ROLE_COPY.default

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
          const s = typeof e?.status === 'number' ? e.status : null
          setProfilesError(
            s != null
              ? messageForProfilesHttpError(s)
              : 'Network error loading profiles. From the project root run: python -m backend.app (port 5000), keep npm run dev running, then click Try again.',
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
        const r = (data.user.profile_name || '').toLowerCase()
        if (r === 'user admin') {
          navigate('/admin', { replace: true })
        } else if (r === 'fundraiser') {
          navigate('/fundraiser', { replace: true })
        } else if (r === 'platform manager') {
          navigate('/platform', { replace: true })
        } else if (r === 'donee') {
          navigate('/donee', { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      }
    } catch (err) {
      setStatus({
        type: 'error',
        text:
          err?.data?.message ||
          err?.message ||
          'Could not reach the server. Is the backend running?',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <Logo size="md" />
        </div>
        <h1>{copy.title}</h1>
        <p className="login-sub">{copy.sub}</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="login-profile">
              User profile
            </label>
            <select
              id="login-profile"
              className="select"
              name="profile_id"
              value={profileId}
              onChange={handleProfileChange}
              disabled={profilesLoading}
              aria-busy={profilesLoading}
            >
              <option value="">Select a profile</option>
              {profiles.map((p) => (
                <option key={p.profile_id} value={String(p.profile_id)}>
                  {p.profile_name}
                </option>
              ))}
            </select>
            <span className="field-hint">
              {profilesLoading
                ? 'Loading profiles…'
                : 'Select your role to continue.'}
            </span>
            {profilesError ? (
              <div className="alert error" role="alert" style={{ marginTop: '0.5rem' }}>
                <div>{profilesError}</div>
                <button
                  type="button"
                  className="btn sm"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => setProfileLoadAttempt((n) => n + 1)}
                >
                  Try again
                </button>
              </div>
            ) : null}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="input"
              type="email"
              name="email"
              autoComplete="email"
              placeholder={
                roleKey === 'user admin'
                  ? 'admin@example.com'
                  : roleKey === 'fundraiser'
                    ? 'fr@example.com'
                    : roleKey === 'platform manager'
                      ? 'manager@example.com'
                      : 'you@example.com'
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!profileSelected}
              required={profileSelected}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="input"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!profileSelected}
              required={profileSelected}
            />
          </div>

          {status ? (
            <div
              className={`alert ${status.type === 'error' ? 'error' : 'success'}`}
              role="status"
            >
              {status.text}
            </div>
          ) : null}

          <button
            type="submit"
            className="btn primary login-submit"
            disabled={submitting || !canSubmit}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
