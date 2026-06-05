import { useState, useEffect } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../supabase/client'

export interface UseAuthReturn {
  user:    User | null
  session: Session | null
  loading: boolean
  signIn:  (email: string, password: string) => Promise<{ error: Error | null }>
  signUp:  (email: string, password: string, name?: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword:(password: string) => Promise<{ error: Error | null }>
}

export function useAuth(): UseAuthReturn {
  const [user,    setUser]    = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  async function signUp(email: string, password: string, name?: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: name ? { data: { nombre: name } } : undefined,
    })
    return { error: error as Error | null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function resetPassword(email: string) {
    const redirectTo = (typeof window !== 'undefined' ? window.location.origin : '') + '/reset-password'
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { error: error as Error | null }
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error as Error | null }
  }

  return { user, session, loading, signIn, signUp, signOut, resetPassword, updatePassword }
}

export function useUserRole() {
  const { user, loading } = useAuth()
  const role = user?.user_metadata?.role === 'admin' ? 'admin' : 'user'
  return { role, user, loading, isAdmin: role === 'admin' }
}

export function useRequireAuth(redirectPath = '/') {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined') {
      const redirect = encodeURIComponent(window.location.pathname)
      window.location.href = `${redirectPath}?login=true&redirect=${redirect}`
    }
  }, [user, loading, redirectPath])

  return { user, loading }
}
