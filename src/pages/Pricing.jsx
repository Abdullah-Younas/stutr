import { Link } from 'react-router-dom'
import { FooterLinks } from './PageShell'
import { usePageMeta } from '../lib/meta'
import Nav from '../landing/Nav'
import '../landing.css'

// Template only: names, prices and features are placeholders until pricing is decided.
const TIERS = [
  { name: 'Free', price: '$0', blurb: 'Placeholder: what a first-time builder gets.', features: ['Feature to be decided', 'Feature to be decided', 'Feature to be decided'] },
  { name: 'Plus', price: '$--', blurb: 'Placeholder: for people who build often.', features: ['Everything in Free', 'Feature to be decided', 'Feature to be decided', 'Feature to be decided'], featured: true },
  { name: 'Classroom', price: '$--', blurb: 'Placeholder: for teachers and whole classes.', features: ['Everything in Plus', 'Feature to be decided', 'Feature to be decided'] },
]

export default function Pricing() {
  usePageMeta('/pricing')
  return (
    <div className="lp pricing">
      <Nav />
      <main id="main" tabIndex={-1} className="pr-main">
        <h1>Pricing is on the way</h1>
        <p className="pr-lede">These plans are placeholders. Final plans and prices will be posted here.</p>
        <div className="tiers">
          {TIERS.map((t) => (
            <section key={t.name} className={`tier${t.featured ? ' featured' : ''}`} aria-label={`${t.name} plan`}>
              <h2>{t.name}</h2>
              <p className="price">{t.price}</p>
              <p>{t.blurb}</p>
              <ul>{t.features.map((f, i) => <li key={i}>{f}</li>)}</ul>
              <button type="button" className="tier-btn" disabled>Coming soon</button>
            </section>
          ))}
        </div>
        <p><Link to="/start" className="ghost-link">Start building for free in the meantime</Link></p>
      </main>
      <footer className="lp-foot">
        <span className="mono">Stutr, code to circuit</span>
        <FooterLinks className="entry-links" />
      </footer>
    </div>
  )
}
