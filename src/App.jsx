import { lazy, Suspense, useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import CookieBanner from './components/CookieBanner'

// Everything loads on demand, so the first visit stays small and fast.
const Landing = lazy(() => import('./Landing'))
const Entry = lazy(() => import('./Entry'))
const Pricing = lazy(() => import('./pages/Pricing'))
const AuthLayout = lazy(() => import('./lib/auth').then((m) => ({ default: m.AuthLayout })))
const Login = lazy(() => import('./pages/Login'))
const AppRoute = lazy(() => import('./pages/AppRoute'))
const Faq = lazy(() => import('./pages/Faq'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const NotFound = lazy(() => import('./pages/NotFound'))

// New page: scroll to the top and move keyboard/screen-reader focus to the content.
function RouteChange() {
  const { pathname } = useLocation()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    window.scrollTo(0, 0)
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <RouteChange />
      <Suspense fallback={<p className="center" role="status">Loading…</p>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/start" element={<Entry />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/app" element={<AppRoute />} />
          </Route>
          <Route path="/faq" element={<Faq />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <CookieBanner />
    </>
  )
}
