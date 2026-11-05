import { Link } from 'react-router-dom'
import { FOOTER_LINKS } from '../routes'
import { openConsent } from '../lib/consent'
import { usePageMeta } from '../lib/meta'

export function FooterLinks({ className }) {
  return (
    <nav className={className} aria-label="Footer">
      {FOOTER_LINKS.map(([name, path]) => <Link key={path} to={path}>{name}</Link>)}
      <button type="button" onClick={openConsent}>Cookie settings</button>
    </nav>
  )
}

export default function PageShell({ path, children, narrow = true }) {
  usePageMeta(path)
  return (
    <div className="site">
      <header className="site-head">
        <Link to="/" className="site-logo"><span aria-hidden="true">S</span> Stutr</Link>
        <nav aria-label="Main">
          <Link to="/faq">FAQ</Link>
          <Link to="/app" className="cta-sm">Start building</Link>
        </nav>
      </header>
      <main id="main" tabIndex={-1} className={`site-main${narrow ? ' narrow' : ''}`}>{children}</main>
      <footer className="site-foot">
        <FooterLinks />
        <p>© {new Date().getFullYear()} Stutr · Code to Circuit</p>
      </footer>
    </div>
  )
}
