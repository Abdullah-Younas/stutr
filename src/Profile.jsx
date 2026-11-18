import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { openPortal } from './lib/billing'
import { planSummary } from './lib/plan'

// Who you are, which plan you are on, and a button to manage billing. Opened from the menu or from your name.
export default function Profile({ user, onSignOut, onSettings }) {
  const [ent, setEnt] = useState(undefined) // undefined = loading, null = no paid plan
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!user || !supabase) return undefined
    let live = true
    supabase.from('entitlements').select('plan,status,billing_interval,current_period_end,cancel_at_period_end').maybeSingle()
      .then(({ data, error }) => { if (!live) return; if (error) setFailed(true); else setEnt(data) })
    return () => { live = false }
  }, [user])

  if (!user) {
    return (
      <div className="profile">
        <p className="empty">You are not signed in. Your work is saved in this browser only. Sign in to keep it online and to see your plan.</p>
        <div className="plan-actions"><Link className="btn primary" to="/login">Sign in</Link><Link className="btn" to="/pricing">See plans</Link></div>
      </div>
    )
  }

  const name = user.user_metadata?.user_name || user.user_metadata?.full_name || user.email
  const plan = planSummary(ent ?? null)
  const manage = async () => {
    setErr(''); setBusy(true)
    try { await openPortal() } catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <div className="profile">
      <div className="profile-id">
        <span className="avatar big" aria-hidden="true">{String(name || '?')[0].toUpperCase()}</span>
        <div><strong>{name}</strong><small>{user.email}</small></div>
      </div>

      <section className={`plan-card plan-${plan.state}`} aria-label="Your plan" aria-busy={ent === undefined && !failed}>
        {ent === undefined && !failed ? <p className="empty">Loading your plan…</p> : failed ? (
          <p className="empty">Your plan could not be loaded right now. Please try again in a moment.</p>
        ) : (
          <>
            <span className="plan-badge">{plan.name}</span>
            <h4>{plan.headline}</h4>
            <p>{plan.line}</p>
            {plan.billing && <p className="plan-meta">Billing: {plan.billing}</p>}
            <div className="plan-actions">
              {ent && <button type="button" className="btn primary" disabled={busy} onClick={manage}>{busy ? 'Opening…' : plan.paid && plan.key !== 'founder' ? 'Manage plan and billing' : 'Billing and invoices'}</button>}
              {(!ent || !plan.paid) && <Link className="btn primary" to="/pricing">{ent ? 'Choose a plan' : 'See plans and upgrade'}</Link>}
              {ent && plan.paid && plan.key !== 'founder' && <Link className="btn" to="/pricing">Compare plans</Link>}
            </div>
            {err && <p className="plan-err" role="alert">{err}</p>}
            {ent && <p className="empty">Billing opens a secure page from our payment provider, Polar. There you can switch between monthly and yearly, cancel, update your card and download invoices. Changes show here within a minute.</p>}
          </>
        )}
      </section>

      <div className="plan-actions">
        <button type="button" className="btn" onClick={onSettings}>Settings and my data</button>
        <button type="button" className="btn ghost" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  )
}
