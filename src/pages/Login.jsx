import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import PageShell from './PageShell'
import { useAuth } from '../lib/auth'

// lucide-react dropped brand icons, so the GitHub mark is drawn here.
const GithubMark = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)

export default function Login() {
  const { user, loading, configured, signIn, continueAsGuest } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  if (!loading && user) return <Navigate to="/app" replace />

  const go = async (provider) => {
    setError(''); setBusy(provider)
    const { error: e } = await signIn(provider)
    if (e) { setError(`Sign-in failed: ${e.message}`); setBusy('') }
  }

  return (
    <PageShell path="/login">
      <h1>Sign in to Stutr</h1>
      <p>Sign in to save your circuits and settings online and open them on any device.</p>
      {!configured ? (
        <p className="notice" role="status">
          Online saving isn’t set up on this copy of Stutr yet (the Supabase keys are missing), so everything is saved in this browser.
          <button type="button" className="btn primary" onClick={() => { continueAsGuest(); navigate('/app') }}>Open the editor</button>
        </p>
      ) : (
        <>
          <div className="actions stack">
            <button type="button" className="btn" disabled={!!busy} onClick={() => go('github')}>
              <GithubMark /> {busy === 'github' ? 'Opening GitHub…' : 'Continue with GitHub'}
            </button>
            <button type="button" className="btn" disabled={!!busy} onClick={() => go('google')}>
              <span className="g" aria-hidden="true">G</span> {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
            </button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <p className="muted">
            <button type="button" className="linklike" onClick={() => { continueAsGuest(); navigate('/app') }}>Try it without an account</button>
            {' '}(your work stays in this browser only).
          </p>
        </>
      )}
      <p className="muted">By continuing you agree to the <Link to="/terms">Terms</Link> and the <Link to="/privacy">Privacy Policy</Link>.</p>
    </PageShell>
  )
}
