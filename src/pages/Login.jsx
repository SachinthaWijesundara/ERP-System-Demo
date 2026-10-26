import { useState } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'

// The sign-in screen. Accounts are made by the admin in User settings; there
// is no way to sign up from here.
export default function Login() {
  const auth = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }
    setBusy(true)
    const problem = await auth.login(username, password)
    setBusy(false)
    if (problem) setError(problem)
  }

  return (
    <div className="login">
      <div className="login-panel">
        <div className="login-brand">
          <div className="brand-mark">IH</div>
          <div>
            <strong>Immense Home</strong>
            <span>Interior studio · Matara · Nugegoda</span>
          </div>
        </div>

        <h1>Sign in</h1>
        <p className="login-lede">Use the account your admin set up for you.</p>

        <form onSubmit={submit} noValidate>
          <label className="field">
            <span className="field-label">Username</span>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError('')
              }}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <div className="password-field">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShow(!show)}
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
              </button>
            </div>
          </label>

          {error && (
            <div className="form-alert login-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            <LogIn size={16} strokeWidth={1.75} />
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-foot">Forgot your password? Ask the admin to reset it in User settings.</p>
      </div>
    </div>
  )
}
