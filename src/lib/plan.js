// Turns the stored entitlement row (or no row) into what the Profile panel shows. Pure, so it is easy to test.
import { hasPaid } from '../../supabase/functions/_shared/polar'

const NAMES = { pro: 'Pro', student: 'Student', founder: 'Founder' }
const date = (iso) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

export function planSummary(ent, now = Date.now()) {
  if (!ent) return { key: 'free', name: 'Free', state: 'free', headline: 'Free plan', line: 'Everything in the core editor is yours to use. Paid plans add more as they arrive.', paid: false, billing: '' }
  const name = NAMES[ent.plan] || 'Paid'
  const end = ent.current_period_end ? Date.parse(ent.current_period_end) : null
  const billing = ent.plan === 'founder' ? 'One-time payment' : ent.billing_interval === 'year' ? 'Yearly' : ent.billing_interval === 'month' ? 'Monthly' : ''
  const base = { key: ent.plan, name, billing, paid: hasPaid(ent, now) }
  const s = String(ent.status)

  if (ent.plan === 'founder') {
    return s === 'active'
      ? { ...base, state: 'lifetime', headline: 'Founder: Pro for life', line: 'Lifetime access. There is nothing to renew.' }
      : { ...base, state: 'ended', headline: 'Founder plan ended', line: 'This purchase was refunded, so the plan is no longer active.' }
  }
  if (s === 'past_due' || s === 'unpaid') {
    return { ...base, state: 'problem', headline: `${name} plan: payment problem`, line: 'Your last payment did not go through. Update your card in Manage billing to keep your plan.' }
  }
  if (base.paid && (ent.cancel_at_period_end || s === 'canceled')) {
    return { ...base, state: 'ending', headline: `${name} plan, ending`, line: end ? `You cancelled. Your plan stays active until ${date(end)}.` : 'You cancelled. Your plan stays active until the end of the period you paid for.' }
  }
  if (base.paid) {
    return { ...base, state: 'active', headline: `${name} plan`, line: end ? `Active. Renews on ${date(end)}.` : 'Active.' }
  }
  return { ...base, state: 'ended', headline: `${name} plan ended`, line: 'This plan is no longer active. You can pick a plan again at any time.' }
}
