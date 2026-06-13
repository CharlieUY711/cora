/**
 * AuthProvider.tsx
 * Maneja la sesión de Supabase Auth para el dashboard admin.
 *
 * - Si no hay sesión → muestra pantalla de login
 * - Si hay sesión → renderiza children (el dashboard)
 * - Expone useAuth() para acceder al usuario y cerrar sesión
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';
import type { User } from '@supabase/supabase-js';

const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

// ── Contexto ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user:    User | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user:    null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ── Login Screen ──────────────────────────────────────────────────────────────

function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);

    const { error: sbError } = await supabase.auth.signInWithPassword({ email, password });

    if (sbError) {
      setError('Email o contraseña incorrectos');
    }
    setLoading(false);
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F4F5F7',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '40px 36px',
        width: '360px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.10)',
        border: '1px solid #E5E7EB',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            backgroundColor: 'var(--shell-primary, #6366F1)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', fontWeight: '800', color: '#fff', marginBottom: '12px',
          }}>
            C
          </div>
          <p style={{ margin: 0, fontWeight: '700', fontSize: '1.1rem', color: '#111' }}>
            Charlie Platform
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#9CA3AF' }}>
            Ingresá a tu cuenta de administrador
          </p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{
              padding: '11px 14px', borderRadius: '9px',
              border: '1.5px solid #E5E7EB', fontSize: '0.88rem',
              outline: 'none', color: '#111',
            }}
          />

          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', padding: '11px 40px 11px 14px',
                borderRadius: '9px', border: '1.5px solid #E5E7EB',
                fontSize: '0.88rem', outline: 'none', color: '#111',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => setShowPass(p => !p)}
              style={{
                position: 'absolute', right: '12px', top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', color: '#9CA3AF',
                fontSize: '0.75rem',
              }}
            >
              {showPass ? '🙈' : '👁'}
            </button>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5',
              fontSize: '0.8rem', color: '#991B1B', fontWeight: '600',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email || !password}
            style={{
              padding: '12px', borderRadius: '10px', border: 'none',
              backgroundColor: 'var(--shell-primary, #6366F1)',
              color: '#fff', fontSize: '0.92rem', fontWeight: '700',
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              opacity: loading || !email || !password ? 0.6 : 1,
              marginTop: '4px',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión activa al montar
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Escuchar cambios de sesión (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Mientras verifica la sesión
  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', backgroundColor: '#F4F5F7',
        fontFamily: 'system-ui, sans-serif', color: '#9CA3AF', fontSize: 14,
      }}>
        Verificando sesión...
      </div>
    );
  }

  // Sin sesión → login
  if (!user) return <LoginScreen />;

  // Con sesión → dashboard
  return (
    <AuthContext.Provider value={{ user, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
