'use client'

import React, { useState } from 'react'
import { useAuthT, type Locale } from '../i18n'

export interface LoginFormProps {
  aesthetic?: 'dark' | 'light'
  locale?: Locale
  onSubmit: (email: string, password: string) => Promise<void>
  onForgotPassword?: () => void
  onRegister?: () => void
  loading?: boolean
  error?: string | null
}

export function LoginForm({
  aesthetic = 'dark',
  locale = 'es',
  onSubmit,
  onForgotPassword,
  onRegister,
  loading = false,
  error = null,
}: LoginFormProps) {
  const tr = useAuthT(locale)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const isDark = aesthetic === 'dark'
  const s = isDark ? darkS : lightS

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit(email, password)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <div style={s.header}>
        <h1 style={s.title}>{tr('login_title')}</h1>
        <p style={s.subtitle}>{tr('login_subtitle')}</p>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {/* Email */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={s.label}>{tr('login_email')}</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="nombre@core.lat"
          style={s.input}
        />
      </div>

      {/* Password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={s.label}>{tr('login_password')}</label>
          {onForgotPassword && (
            <button type="button" onClick={onForgotPassword} style={s.linkBtn}>
              {tr('login_forgot')}
            </button>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type={showPass ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ ...s.input, paddingRight: '44px' }}
          />
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            aria-label={showPass ? tr('hide_password') : tr('show_password')}
            style={s.eyeBtn}
          >
            {showPass ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Submit */}
      <button type="submit" disabled={loading} style={s.submitBtn}>
        {loading ? tr('login_loading') : tr('login_btn')}
      </button>

      {/* Register link */}
      {onRegister && (
        <p style={{ textAlign: 'center', fontSize: '13px', ...{ color: isDark ? '#8fa3bf' : '#4a6080' } }}>
          {tr('login_no_account')}{' '}
          <button type="button" onClick={onRegister} style={s.linkBtn}>
            {tr('login_register_link')}
          </button>
        </p>
      )}
    </form>
  )
}

// ── Dark styles ───────────────────────────────────────────────
const darkS = {
  header:    { marginBottom: '8px' },
  title:     { fontSize: '20px', fontWeight: '600', color: '#ffffff', margin: '0 0 4px', letterSpacing: '-0.01em' },
  subtitle:  { fontSize: '13px', color: '#8fa3bf', margin: 0 },
  label:     { fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#4a6080' },
  input:     {
    width: '100%', padding: '12px 14px', backgroundColor: '#1e2d42',
    border: '1px solid #1e3354', borderRadius: '8px', fontSize: '14px',
    color: '#ffffff', outline: 'none', boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  eyeBtn:    { position: 'absolute' as const, right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4a6080', display: 'flex', alignItems: 'center' },
  submitBtn: {
    width: '100%', padding: '13px', marginTop: '4px',
    backgroundColor: '#1b5ac4', border: '1px solid #1b5ac4',
    borderRadius: '8px', fontSize: '14px', fontWeight: '600',
    color: '#ffffff', cursor: 'pointer', transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  linkBtn:   { background: 'none', border: 'none', cursor: 'pointer', color: '#c9993a', fontSize: '13px', fontFamily: 'inherit', padding: 0 },
  errorBox:  { padding: '12px 14px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '13px', color: '#fca5a5' },
}

// ── Light styles ──────────────────────────────────────────────
const lightS = {
  header:    { marginBottom: '8px' },
  title:     { fontSize: '22px', fontWeight: '700', color: '#0D2B55', margin: '0 0 4px', letterSpacing: '-0.01em' },
  subtitle:  { fontSize: '14px', color: '#4a6080', margin: 0 },
  label:     { fontSize: '12px', fontWeight: '500', color: '#4a6080' },
  input:     {
    width: '100%', padding: '12px 14px', backgroundColor: '#ffffff',
    border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px',
    color: '#0D2B55', outline: 'none', boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  },
  eyeBtn:    { position: 'absolute' as const, right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' },
  submitBtn: {
    width: '100%', padding: '14px', marginTop: '4px',
    backgroundColor: '#1b5ac4', border: 'none',
    borderRadius: '8px', fontSize: '15px', fontWeight: '700',
    color: '#ffffff', cursor: 'pointer', transition: 'all 0.2s',
    fontFamily: 'inherit',
  },
  linkBtn:   { background: 'none', border: 'none', cursor: 'pointer', color: '#1D9E75', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', padding: 0 },
  errorBox:  { padding: '12px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#dc2626' },
}
