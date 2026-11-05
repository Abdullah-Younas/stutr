import { Link } from 'react-router-dom'
import PageShell from './PageShell'

export default function NotFound() {
  return (
    <PageShell path="/404">
      <h1>404 - this page doesn’t exist</h1>
      <p>The link may be old or mistyped. Try one of these instead:</p>
      <p className="actions">
        <Link className="btn primary" to="/">Go home</Link>
        <Link className="btn" to="/app">Open the editor</Link>
        <Link className="btn" to="/faq">Read the FAQ</Link>
      </p>
    </PageShell>
  )
}
