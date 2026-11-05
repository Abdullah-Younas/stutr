import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { configured, supabase } from './supabase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)
const GUEST = 'stutr-guest'

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(configured)
  const [guest, setGuest] = useState(() => sessionStorage.getItem(GUEST) === '1')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const signIn = (provider) => supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/app` } })
  const signOut = async () => {
    await supabase?.auth.signOut()
    sessionStorage.removeItem(GUEST)
    setGuest(false)
    setUser(null)
  }
  const continueAsGuest = () => { sessionStorage.setItem(GUEST, '1'); setGuest(true) }

  return <Ctx.Provider value={{ user, loading, configured, guest, signIn, signOut, continueAsGuest }}>{children}</Ctx.Provider>
}

// Only the routes that need an account (or the sign-in page) load Supabase at all.
export const AuthLayout = () => <AuthProvider><Outlet /></AuthProvider>

export function RequireAuth({ children }) {
  const { user, loading, guest } = useAuth()
  const where = useLocation()
  if (loading) return <p className="center" role="status">Loading…</p>
  if (configured && !user && !guest) return <Navigate to="/login" replace state={{ from: where.pathname }} />
  return children
}
