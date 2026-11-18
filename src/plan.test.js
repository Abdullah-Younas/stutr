import { describe, expect, it } from 'vitest'
import { planSummary } from './lib/plan'

const now = Date.parse('2026-12-01T00:00:00Z')
const row = (o) => ({ plan: 'pro', status: 'active', billing_interval: 'year', current_period_end: '2027-06-01T00:00:00Z', cancel_at_period_end: false, ...o })

describe('plan summary for the profile', () => {
  it('no row means the Free plan, not paid', () => {
    const s = planSummary(null, now)
    expect(s).toMatchObject({ name: 'Free', state: 'free', paid: false })
  })
  it('an active subscription shows the plan, billing period and renewal date', () => {
    const s = planSummary(row(), now)
    expect(s).toMatchObject({ name: 'Pro', state: 'active', paid: true, billing: 'Yearly' })
    expect(s.line).toMatch(/Renews on .*2027/)
    expect(planSummary(row({ plan: 'student', billing_interval: 'month' }), now)).toMatchObject({ name: 'Student', billing: 'Monthly' })
  })
  it('a cancelled plan keeps working until the paid period ends, then ends', () => {
    expect(planSummary(row({ cancel_at_period_end: true }), now)).toMatchObject({ state: 'ending', paid: true })
    expect(planSummary(row({ status: 'canceled' }), now)).toMatchObject({ state: 'ending', paid: true })
    expect(planSummary(row({ status: 'canceled', current_period_end: '2026-11-01T00:00:00Z' }), now)).toMatchObject({ state: 'ended', paid: false })
  })
  it('flags payment problems and ended or refunded plans', () => {
    expect(planSummary(row({ status: 'past_due' }), now)).toMatchObject({ state: 'problem', paid: false })
    expect(planSummary(row({ status: 'revoked' }), now)).toMatchObject({ state: 'ended', paid: false })
  })
  it('Founder is lifetime until refunded', () => {
    const f = { plan: 'founder', status: 'active', billing_interval: 'once', current_period_end: null, cancel_at_period_end: false }
    expect(planSummary(f, now)).toMatchObject({ state: 'lifetime', paid: true, billing: 'One-time payment' })
    expect(planSummary({ ...f, status: 'refunded' }, now)).toMatchObject({ state: 'ended', paid: false })
  })
})
