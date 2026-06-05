'use client'

import React, { useState } from 'react'
import { useAuthT, type Locale } from '../i18n'

export interface RegisterFormProps {
  aesthetic?: 'dark' | 'light'
  locale?: Locale
  onSubmit: (email: string, password: string, name: string) => Promise<void>
  onLogin?: () => void
  loading?: boolean
  error?: string | null
  success?: string | null
}

export function RegisterForm({
  aesthetic = 'dark',
  locale = 'es',
  onSubmit,
  onLogin,
  loading = false,
  error = null,
  success = null,
}: RegisterFormProps) {
  const tr = useAuthT(locale)
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const isDark = aesthetic === 'dark'
  const s = isDark ? darkS : lightS

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (password !== confirm) { setLocalError(tr('register_err_match')); return }
    if (password.length < 6)  { setLocalError(tr('register_err_short')); return }
    await onSubmit(email, password, name)
  }

  const displayError = localError ?? error

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      <div style={s.header}>
        <h1 style={s.title}>{tr('register_title')}</h1>
        <p style={s.subtitle}>{tr('register_subtitle')}</p>
      </div>

      {displayError && <div style={s.errorBox}>{displayError}</div>}
      {success      && <div style={s.successBox}>{success}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={s.label}>{tr('register_name')}</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Juan García" style={s.input} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={s.label}>{tr('register_email')}</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="nombre@core.lat" style={s.input} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={s.label}>{tr('register_password')}</label>
        <div style={{ position: 'relative' }}>
          <input type={showPass ? 'text' : 'password'} required value={password}
            onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            style={{ ...s.input, paddingRight: '44px' }} />
          <button type="button" onClick={() => setShowPass(v => !v)} style={s.eyeBtn}
            aria-label={showPass ? tr('hide_password') : tr('show_password')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {showPass
                ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
              }
            </svg>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={s.label}>{tr('register_confirm')}</label>
        <input type={showPass ? 'text' : 'password'} required value={confirm}
          onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={s.input} />
      </div>

      <button type="submit" disabled={loading} style={s.submitBtn}>
        {loading ? tr('register_loading') : tr('register_btn')}
      </button>

      {onLogin && (
        <p style={{ textAlign: 'center', fontSize: '13px', color: isDark ? '#8fa3bf' : '#4a6080' }}>
          {tr('register_has_account')}{' '}
          <button type="button" onClick={onLogin} style={s.linkBtn}>
            {tr('register_login_link')}
          </button>
        </p>
      )}
    </form>
  )
}

const darkS = {
  header:     { marginBottom: '4px' },
  title:      { fontSize: '20px', fontWeight: '600', color: '#ffffff', margin: '0 0 4px' },
  subtitle:   { fontSize: '13px', color: '#8fa3bf', margin: 0 },
  label:      { fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#4a6080' },
  input:      { width: '100%', padding: '12px 14px', backgroundColor: '#1e2d42', border: '1px solid #1e3354', borderRadius: '8px', fontSize: '14px', color: '#ffffff', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' },
  eyeBtn:     { position: 'absolute' as const, right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4a6080', display: 'flex', alignItems: 'center' },
  submitBtn:  { width: '100%', padding: '13px', marginTop: '4px', backgroundColor: '#1b5ac4', border: '1px solid #1b5ac4', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: '#ffffff', cursor: 'pointer', fontFamily: 'inherit' },
  linkBtn:    { background: 'none', border: 'none', cursor: 'pointer', color: '#c9993a', fontSize: '13px', fontFamily: 'inherit', padding: 0 },
  errorBox:   { padding: '12px 14px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '13px', color: '#fca5a5' },
  successBox: { padding: '12px 14px', backgroundColor: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', fontSize: '13px', color: '#86efac' },
}

const lightS = {
  header:     { marginBottom: '4px' },
  title:      { fontSize: '22px', fontWeight: '700', color: '#0D2B55', margin: '0 0 4px' },
  subtitle:   { fontSize: '14px', color: '#4a6080', margin: 0 },
  label:      { fontSize: '12px', fontWeight: '500', color: '#4a6080' },
  input:      { width: '100%', padding: '12px 14px', backgroundColor: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#0D2B55', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' },
  eyeBtn:     { position: 'absolute' as const, right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' },
  submitBtn:  { width: '100%', padding: '14px', marginTop: '4px', backgroundColor: '#1b5ac4', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', color: '#ffffff', cursor: 'pointer', fontFamily: 'inherit' },
  linkBtn:    { background: 'none', border: 'none', cursor: 'pointer', color: '#1D9E75', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', padding: 0 },
  errorBox:   { padding: '12px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#dc2626' },
  successBox: { padding: '12px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '13px', color: '#16a34a' },
}
