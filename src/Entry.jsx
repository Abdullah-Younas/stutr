import { Link, useNavigate } from 'react-router-dom'
import { FooterLinks } from './pages/PageShell'
import { usePageMeta } from './lib/meta'
import { Decrypt, Magnet, Squares } from './landing/bits'
import './landing.css'

// The gateway between the landing page and the editor.
function Entry() {
  const navigate = useNavigate()
  usePageMeta('/start')

  return (
    <div className="gate">
      <Squares />
      <main id="main" tabIndex={-1} className="gate-main">
        <Link to="/" className="lp-logo" aria-label="Back to the Stutr home page"><b aria-hidden="true">S</b>Stutr</Link>
        <h1>Where circuits come alive</h1>
        <p className="gate-lede">A code-based Logisim alternative. Write logic, not wires.</p>
        <p className="gate-code mono"><Decrypt text="Y = xor(A, B)" delay={400} /></p>
        <div className="cta-row">
          <Magnet><button type="button" className="cta" onClick={() => navigate('/app')}>Start Building</button></Magnet>
          <Link to="/login" className="ghost-link">Sign in to save your circuits</Link>
        </div>
        <FooterLinks className="entry-links" />
      </main>
    </div>
  )
}

export default Entry
