import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { getMyRestaurante } from '@/lib/api'
import type { AuthUser, Restaurante, Perfil, AppSession } from '@/types'

type SessionStatus = 'loading' | 'unauthenticated' | 'no-restaurante' | 'ready' | 'error'

interface AuthContextValue {
  session: AppSession | null
  status: SessionStatus
  loading: boolean
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null, status: 'loading', loading: true, refreshSession: async () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]   = useState<AppSession | null>(null)
  const [status, setStatus]     = useState<SessionStatus>('loading')
  const [loading, setLoading]   = useState(true)

  async function loadSession() {
    setLoading(true)
    try {
      const { data } = await supabase.auth.getSession()

      // Not logged in
      if (!data.session) {
        setSession(null)
        setStatus('unauthenticated')
        setLoading(false)
        return
      }

      const user: AuthUser = data.session.user

      // Try to load restaurante from backend
      let restaurante: Restaurante | null = null
      let perfil: Perfil | null = null
      let backendReachable = false

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await getMyRestaurante()
          restaurante     = res.restaurante ?? null
          perfil          = res.perfil ?? null
          backendReachable = true
          break
        } catch (err: any) {
          const httpStatus = err.response?.status
          // 403 = authenticated but no restaurante yet → go to setup
          if (httpStatus === 403) { backendReachable = true; break }
          // Any other HTTP error (400, 500…) → stop, don't retry
          if (httpStatus) { backendReachable = true; break }
          // No HTTP response = backend unreachable → retry with delay
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 1000 * attempt))
          }
        }
      }

      setSession({ user, restaurante, perfil })

      if (!backendReachable) {
        // Backend is down — don't redirect, show error
        setStatus('error')
      } else if (!restaurante) {
        setStatus('no-restaurante')
      } else {
        setStatus('ready')
      }

    } catch (e) {
      console.error('loadSession critical error:', e)
      setSession(null)
      setStatus('unauthenticated')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') loadSession()
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setStatus('unauthenticated')
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, status, loading, refreshSession: loadSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
