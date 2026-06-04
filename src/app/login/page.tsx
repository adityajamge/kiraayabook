'use client'

import { useState, useEffect } from 'react'
import { Home, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orgName, setOrgName] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/org')
      .then((r) => r.json())
      .then((d) => {
        setOrgName(d.name ?? null)
        setLogoUrl(d.logo_url ?? null)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) {
      window.location.href = '/dashboard'
    } else {
      setError('Incorrect email or password.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-black rounded-[22px] flex items-center justify-center overflow-hidden mb-4 shadow-lg">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <Home className="w-9 h-9 text-white" />
            )}
          </div>
          {orgName && (
            <p className="text-lg font-bold text-gray-900">{orgName}</p>
          )}
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-center mb-1.5">Sign in to your dashboard</h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          Manage your PG — tenants, rooms and rent.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-gray-100 rounded-xl px-4 py-3.5 text-sm outline-none focus:bg-gray-50 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-100 rounded-xl px-4 py-3.5 pr-12 text-sm outline-none focus:bg-gray-50 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-sm text-gray-400">Forgot password?</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-semibold py-4 rounded-2xl hover:bg-gray-800 disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
