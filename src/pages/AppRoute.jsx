import { RequireAuth } from '../lib/auth'
import Dashboard from '../Dashboard'

export default function AppRoute() {
  return <RequireAuth><Dashboard /></RequireAuth>
}
