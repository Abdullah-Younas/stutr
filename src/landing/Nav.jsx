import { Link } from 'react-router-dom'

export default function Nav({ home = false }) {
  return (
    <header className="lp-nav">
      <Link to="/" className="lp-logo" aria-label="Stutr home"><b aria-hidden="true">S</b>Stutr</Link>
      <nav className="lp-links" aria-label="Main">
        {home && <a href="#how" className="hide-sm">How it works</a>}
        {home && <a href="#lab" className="hide-sm">Hardware lab</a>}
        <Link to="/pricing">Pricing</Link>
        <Link to="/faq" className="hide-sm">FAQ</Link>
        <Link to="/start" className="pill">Start Building</Link>
      </nav>
    </header>
  )
}
