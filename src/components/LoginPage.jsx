import { LockKeyhole, UserRound } from 'lucide-react'
import { useState } from 'react'

const USERS = [
  { username: 'admin', password: 'admin123', role: 'admin', label: 'Admin' },
  { username: 'user', password: 'user123', role: 'user', label: 'User' },
]

export default function LoginPage({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    const account = USERS.find((user) => (
      user.username === credentials.username.trim()
      && user.password === credentials.password
    ))

    if (!account) {
      setError('Username atau password tidak sesuai.')
      return
    }

    onLogin({
      username: account.username,
      role: account.role,
      label: account.label,
    })
  }

  return (
    <main className="min-h-screen bg-[#04111d] bg-[radial-gradient(circle_at_top_left,rgba(24,160,178,0.28),transparent_34%),linear-gradient(145deg,#04111d_0%,#063348_48%,#04111d_100%)] px-4 py-6 text-white">
      <section className="mx-auto flex min-h-[90vh] w-full max-w-[430px] flex-col justify-center">
        <form
          className="rounded-[28px] border border-white/15 bg-white/[0.08] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl"
          onSubmit={submit}
        >
          <p className="text-sm uppercase tracking-[0.28em] text-cyan-100/70">Login</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">KALTIM PARADOX</h1>
          <p className="mt-1 text-sm text-white/65">Masuk sebagai Admin atau User.</p>

          <label className="mt-6 block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/70">
              <UserRound className="h-3.5 w-3.5" />
              Username
            </span>
            <input
              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/50 focus:bg-white/15"
              value={credentials.username}
              onChange={(event) => setCredentials((current) => ({ ...current, username: event.target.value }))}
              placeholder="admin / user"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/70">
              <LockKeyhole className="h-3.5 w-3.5" />
              Password
            </span>
            <input
              className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/50 focus:bg-white/15"
              type="password"
              value={credentials.password}
              onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
              placeholder="Password"
            />
          </label>

          {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}

          <button
            className="mt-6 w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-[#041827] shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-50"
            type="submit"
          >
            Masuk
          </button>
        </form>
      </section>
    </main>
  )
}
