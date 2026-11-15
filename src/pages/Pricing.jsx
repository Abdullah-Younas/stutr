import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FooterLinks } from './PageShell'
import { usePageMeta } from '../lib/meta'
import Nav from '../landing/Nav'
import '../landing.css'

// Change prices here. Ranges from the plan were pinned to one number each: Pro $8/mo or $69/yr, Student about half of that,
// Classroom a flat yearly fee, Founder a one-time payment.
const TIERS = [
  {
    name: 'Free', who: 'Students, hobbyists, anyone trying it out', price: '$0', unit: 'forever',
    features: ['Core gates, inputs and outputs', 'Basic circuits, enough for simple to medium builds', 'Code and visual editor kept in sync', 'Saved in your browser', 'A limited number of projects'],
    cta: { label: 'Start free', to: '/start' },
  },
  {
    name: 'Pro', who: 'Serious individual builders', month: '$8', year: '$69', featured: true,
    features: ['Everything in Free', 'Cloud save and multi-device sync', 'Unlimited projects and complexity', 'Advanced components and subcircuits', 'Export: PNG, netlist, and HDL later', 'History and versioning', 'Early access to Hardware Lab', 'Themes'],
  },
  {
    name: 'Student', who: 'Students with a .edu address', month: '$4', year: '$39', tag: 'About 50% off Pro',
    features: ['Everything in Pro', 'Verified with your .edu email'],
  },
  {
    name: 'Classroom', who: 'Teachers, schools and universities', price: '$149', unit: 'per year, up to 30 students', tag: '$299 per year for up to 50',
    features: ['Everything in Pro for every student', 'Assignment tools', 'Student sharing and progress', 'Class management', 'Bulk accounts'],
  },
  {
    name: 'Founder', who: 'Early supporters', price: '$99', unit: 'one time', tag: 'Early launch offer',
    features: ['Pro, forever', 'Early access to Hardware Lab', 'Helps fund the launch'],
  },
]

export default function Pricing() {
  usePageMeta('/pricing')
  const [yearly, setYearly] = useState(true)
  return (
    <div className="lp pricing">
      <Nav />
      <main id="main" tabIndex={-1} className="pr-main">
        <h1>Simple pricing</h1>
        <p className="pr-lede">Free is enough to learn and build real circuits. Pay when you want cloud sync, no limits, or a classroom.</p>
        <div className="bill" role="group" aria-label="Billing period">
          <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>Monthly</button>
          <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>Yearly</button>
        </div>
        <div className="tiers">
          {TIERS.map((t) => (
            <section key={t.name} className={`tier${t.featured ? ' featured' : ''}`} aria-label={`${t.name} plan`}>
              <h2>{t.name}</h2>
              <p className="who">{t.who}</p>
              <p className="price">{t.price ?? (yearly ? t.year : t.month)}<span className="unit"> {t.unit ?? (yearly ? 'per year' : 'per month')}</span></p>
              {t.tag && <p className="tier-tag">{t.tag}</p>}
              <ul>{t.features.map((f) => <li key={f}>{f}</li>)}</ul>
              {t.cta
                ? <Link to={t.cta.to} className="tier-btn go">{t.cta.label}</Link>
                : <button type="button" className="tier-btn" disabled>Coming soon</button>}
            </section>
          ))}
        </div>
        <p className="pr-note">Paid plans are not open yet. Cloud sync, history, subcircuits, class tools and Hardware Lab are still being built, so what is listed for them is the plan, not what ships today.</p>
        <p><Link to="/start" className="ghost-link">Start building for free in the meantime</Link></p>
      </main>
      <footer className="lp-foot">
        <span className="mono">Stutr, code to circuit</span>
        <FooterLinks className="entry-links" />
      </footer>
    </div>
  )
}
