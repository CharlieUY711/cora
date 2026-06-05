'use client'

import React, { useState } from 'react'
import { useAuthT, type Locale } from '../i18n'

// ── Shared input/button styles helpers ───────────────────────
function getStyles(isDark: boolean) {
  return {
    title:     isDark ? { fontSize: '20px', fontWeight: '600', color: '#ffffff', margin: '0 0 4px' } : { fontSize: '22px', fontWeight: '700', color: '#0D2B55', margin: '0 0 4px' },
    subtitle:  isDark ? { fontSize: '13px', color: '#8fa3bf', margin: 0 } : { fontSize: '14px', color: '#4a6080', margin: 0 },
    label:     isDark ? { fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#4a6080' } : { fontSize: '12px', fontWeight: '500', color: '#4a6080' },
    input:     isDark
      ? { width: '100%', padding: '12px 14px', backgroundColor: '#1e2d42', border: '1px solid #1e3354', borderRadius: '8px', fontSize: '14px', color: '#ffffff', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }
      : { width: '100%', padding: '12px 14px', backgroundColor: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#0D2B55', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' },
    submitBtn: isDark
      ? { width: '100%', padding: '13px', marginTop: '4px', backgroundColor: '#1b5ac4', border: '1px solid #1b5ac4', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: '#ffffff', cursor: 'pointer', fontFamily: 'inherit' }
      : { width: '100%', padding: '14px', marginTop: '4px', backgroundColor: '#1b5ac4', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', color: '#ffffff', cursor: 'pointer', fontFamily: 'inherit' },
    linkBtn:   isDark
      ? { background: 'none', border: 'none', cursor: 'pointer', color: '#c9993a', fontSize: '13px', fontFamily: 'inherit', padding: 0 }
      : { background: 'none', border: 'none', cursor: 'pointer', color: '#1D9E75', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', padding: 0 },
    errorBox:  isDark
      ? { padding: '12px 14px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '13px', color: '#fca5a5' }
      : { padding: '12px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#dc2626' },
    successBox:isDark
      ? { padding: '12px 14px', backgroundColor: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', fontSize: '13px', color: '#86efac' }
      : { padding: '12px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '13px', color: '#16a34a' },
  }
}

// ═══════════════════════════════════════════════════════════════
// ForgotPasswordForm
// ═══════════════════════════════════════════════════════════════
export interface ForgotPasswordFormProps {
  aesthetic?: 'dark' | 'light'
  locale?: Locale
  onSubmit: (email: string) => Promise<void>
  onBack?: () => void
  loading?: boolean
  error?: string | null
  success?: string | null
}

export function ForgotPasswordForm({
  aesthetic = 'dark', locale = 'es',
  onSubmit, onBack, loading = false, error = null, success = null,
}: ForgotPasswordFormProps) {
  const tr = useAuthT(locale)
  const [email, setEmail] = useState('')
  const isDark = aesthetic === 'dark'
  const s = getStyles(isDark)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit(email)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={s.title}>{tr('forgot_title')}</h1>
        <p style={s.subtitle}>{tr('forgot_subtitle')}</p>
      </div>
      {error   && <div style={s.errorBox}>{error}</div>}
      {success && <div style={s.successBox}>{success}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={s.label}>{tr('forgot_email')}</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="nombre@core.lat" style={s.input} />
      </div>
      <button type="submit" disabled={loading} style={s.submitBtn}>
        {loading ? tr('forgot_loading') : tr('forgot_btn')}
      </button>
      {onBack && (
        <p style={{ textAlign: 'center', fontSize: '13px', color: isDark ? '#8fa3bf' : '#4a6080' }}>
          <button type="button" onClick={onBack} style={s.linkBtn}>← {tr('forgot_back')}</button>
        </p>
      )}
    </form>
  )
}

// ═══════════════════════════════════════════════════════════════
// ResetPasswordForm
// ═══════════════════════════════════════════════════════════════
export interface ResetPasswordFormProps {
  aesthetic?: 'dark' | 'light'
  locale?: Locale
  onSubmit: (password: string) => Promise<void>
  loading?: boolean
  error?: string | null
  success?: string | null
}

export function ResetPasswordForm({
  aesthetic = 'dark', locale = 'es',
  onSubmit, loading = false, error = null, success = null,
}: ResetPasswordFormProps) {
  const tr = useAuthT(locale)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const isDark = aesthetic === 'dark'
  const s = getStyles(isDark)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (password !== confirm) { setLocalError(tr('reset_err_match')); return }
    if (password.length < 6)  { setLocalError(tr('reset_err_short')); return }
    await onSubmit(password)
  }

  const displayError = localError ?? error
  const eyeBtn = { position: 'absolute' as const, right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#4a6080' : '#94a3b8', display: 'flex', alignItems: 'center' }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={s.title}>{tr('reset_title')}</h1>
        <p style={s.subtitle}>{tr('reset_subtitle')}</p>
      </div>
      {displayError && <div style={s.errorBox}>{displayError}</div>}
      {success      && <div style={s.successBox}>{success}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={s.label}>{tr('reset_password')}</label>
        <div style={{ position: 'relative' }}>
          <input type={showPass ? 'text' : 'password'} required value={password}
            onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            style={{ ...s.input, paddingRight: '44px' }} />
          <button type="button" onClick={() => setShowPass(v => !v)} style={eyeBtn}>
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
        <label style={s.label}>{tr('reset_confirm')}</label>
        <input type={showPass ? 'text' : 'password'} required value={confirm}
          onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={s.input} />
      </div>
      <button type="submit" disabled={loading} style={s.submitBtn}>
        {loading ? tr('reset_loading') : tr('reset_btn')}
      </button>
    </form>
  )
}

// ═══════════════════════════════════════════════════════════════
// VerifyEmailScreen
// ═══════════════════════════════════════════════════════════════
export interface VerifyEmailScreenProps {
  aesthetic?: 'dark' | 'light'
  locale?: Locale
  email: string
  onResend: () => Promise<void>
  onBack?: () => void
  loading?: boolean
  resendSuccess?: string | null
}

export function VerifyEmailScreen({
  aesthetic = 'dark', locale = 'es',
  email, onResend, onBack, loading = false, resendSuccess = null,
}: VerifyEmailScreenProps) {
  const tr = useAuthT(locale)
  const isDark = aesthetic === 'dark'
  const s = getStyles(isDark)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
      {/* Email icon */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: isDark ? 'rgba(27,90,196,0.15)' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#7db8f7' : '#1b5ac4'} strokeWidth="1.5">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
      </div>
      <div>
        <h1 style={s.title}>{tr('verify_title')}</h1>
        <p style={{ ...s.subtitle, marginTop: '8px' }}>
          {tr('verify_subtitle')} <strong style={{ color: isDark ? '#ffffff' : '#0D2B55' }}>{email}</strong>
        </p>
      </div>
      {resendSuccess && <div style={s.successBox}>{resendSuccess}</div>}
      <button onClick={onResend} disabled={loading} style={s.submitBtn}>
        {loading ? tr('verify_resend_loading') : tr('verify_resend')}
      </button>
      {onBack && (
        <button type="button" onClick={onBack} style={s.linkBtn}>
          ← {tr('verify_back_login')}
        </button>
      )}
    </div>
  )
}
