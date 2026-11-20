import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FooterLinks } from './PageShell'
import { usePageMeta } from '../lib/meta'
import Nav from '../landing/Nav'
import '../landing.css'

// LAUNCH PRICING: the struck-through "regular" prices are what these plans will cost after launch. Only show them
// if you really will raise prices (set LAUNCH_END to the date). A "was" price the product never charged is illegal in many places.
// Checkout buttons stay "Coming soon" until you set VITE_BILLING_ON=1 (after the Polar setup in supabase/BILLING_SETUP.md).
const BILLING_ON = import.meta.env.VITE_BILLING_ON === '1'
const LAUNCH_END = '' // e.g. 'Dec 31'. Leave empty until you pick a date
// Change prices here. Ranges from the plan were pinned to one number each: Pro $8/mo or $69/yr, Student about half of that,
// Classroom a flat yearly fee, Founder a one-time payment.
const TIERS = [
  {
    name: 'Free', who: 'Students, hobbyists, anyone trying it out', price: '$0', unit: 'forever',
    features: ['Every part, with the code editor and canvas always in sync', 'Save up to 5 projects, in your browser or your account', 'Sign in to open your work on any device', 'LED screens up to 64 by 64', 'Example circuits, including a 4-bit CPU'],
    cta: { label: 'Start free', to: '/start' },
  },
  {
    name: 'Pro', who: 'Serious individual builders', month: '$8', year: '$69', regMonth: '$12', regYear: '$99', plans: { month: 'pro_month', year: 'pro_year' }, buy: 'Get Pro', featured: true, badge: 'Most popular',
    features: ['Everything in Free', 'Unlimited saved projects', 'Subcircuits: use your own circuits as parts', 'LED screens up to 2048 by 2048', 'Version history for every project', 'Export as PNG, netlist and Verilog', 'Extra color themes', 'Early access to Hardware Lab when it launches'],
  },
  {
    name: 'Student', who: 'Students with a .edu address', month: '$4', year: '$39', regMonth: '$6', regYear: '$59', plans: { month: 'student_month', year: 'student_year' }, buy: 'Get Student', tag: 'About 50% off Pro',
    features: ['Everything in Pro', 'Verified with your .edu email'],
  },
  {
    name: 'Classroom', who: 'Teachers, schools and universities', price: '$149', reg: '$229', unit: 'per year for up to 30 students', tag: '$299 for up to 50 students (regular $449)', wide: true,
    features: ['Everything in Pro for every student', 'Assignment tools', 'Student sharing and progress', 'Class management', 'Bulk accounts'],
  },
  {
    name: 'Founder', who: 'Early supporters', price: '$99', unit: 'one-time payment', tag: 'Early launch offer', wide: true, plan: 'founder', buy: 'Become a Founder',
    features: ['Pro, forever', 'Early access to Hardware Lab when it launches', 'Helps fund the launch'],
  },
]

export default function Pricing() {
  usePageMeta('/pricing')
  const [yearly, setYearly] = useState(true)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const navigate = useNavigate()
  const thanks = new URLSearchParams(useLocation().search).get('thanks') === '1'

  const buy = async (plan) => {
    setErr(''); setBusy(plan)
    try {
      const { startCheckout } = await import('../lib/billing')
      if ((await startCheckout(plan)) === 'login') navigate('/login')
      else return // the browser is leaving for Polar
    } catch (e) { setErr(e.message) }
    setBusy('')
  }
  // someone chose a plan, signed in, and came back here: carry on to checkout
  useEffect(() => {
    const plan = BILLING_ON && sessionStorage.getItem('stutr-buy')
    if (plan) buy(plan) // eslint-disable-line react-hooks/exhaustive-deps
  }, [])
  const card = (t) => (
    <section key={t.name} className={`tier${t.featured ? ' featured' : ''}${t.wide ? ' wide' : ''}`} aria-label={`${t.name} plan`}>
      {t.badge && <span className="tier-badge">{t.badge}</span>}
      <div className="tier-head">
        <h2>{t.name}</h2>
        <p className="who">{t.who}</p>
        {(t.reg ?? (yearly ? t.regYear : t.regMonth)) && (
          <p className="was"><span className="sr">Regular price </span><s>{t.reg ?? (yearly ? t.regYear : t.regMonth)}</s><span className="launch">Launch price</span></p>
        )}
        <p className="price">{t.price ?? (yearly ? t.year : t.month)}</p>
        <p className="unit">{t.unit ?? (yearly ? 'per year' : 'per month')}</p>
        {t.tag && <p className="tier-tag">{t.tag}</p>}
      </div>
      <ul>{t.features.map((f) => <li key={f}>{f}</li>)}</ul>
      {t.cta
        ? <Link to={t.cta.to} className="tier-btn go">{t.cta.label}</Link>
        : BILLING_ON && (t.plan || t.plans)
          ? <button type="button" className="tier-btn go" disabled={!!busy} onClick={() => buy(t.plan ?? t.plans[yearly ? 'year' : 'month'])}>{busy ? 'Opening checkout…' : t.buy}</button>
          : <button type="button" className="tier-btn" disabled>Coming soon</button>}
    </section>
  )
  return (
    <div className="lp pricing">
      <Nav />
      <main id="main" tabIndex={-1} className="pr-main">
        <h1>Simple pricing</h1>
        <p className="pr-lede">Free is enough to learn and build real circuits. Pay when you want cloud sync, no limits, or a classroom.</p>
        {thanks && <p className="pr-thanks" role="status">Thank you! Your payment went through. Your plan switches on within a minute. A receipt is on its way to your email.</p>}
        {err && <p className="pr-err" role="alert">{err}</p>}
        <div className="bill" role="group" aria-label="Billing period">
          <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>Monthly</button>
          <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>Yearly</button>
        </div>
        <div className="tiers">{TIERS.filter((t) => !t.wide).map(card)}</div>
        <div className="tiers-wide">{TIERS.filter((t) => t.wide).map(card)}</div>
        <p className="pr-note">Launch prices are lower than the regular prices shown crossed out{LAUNCH_END ? ` and end ${LAUNCH_END}` : ', and the regular prices will apply after launch'}. </p>
        {BILLING_ON && <p className="pr-note">Payments are handled by Polar, our merchant of record, which also collects any sales tax or VAT.</p>}
        <p><Link to="/start" className="ghost-link">Start building for free in the meantime</Link></p>
      </main>
      <footer className="lp-foot">
        <span className="mono">Stutr, code to circuit</span>
        <FooterLinks className="entry-links" />
      </footer>
    </div>
  )
}
