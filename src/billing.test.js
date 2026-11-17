import { describe, expect, it } from 'vitest'
import { entitlementFrom, hasPaid, isStudentEmail, productIdFor, productMap, verifyWebhook } from '../supabase/functions/_shared/polar'

const env = { POLAR_PRODUCT_PRO_MONTH: 'p_pm', POLAR_PRODUCT_PRO_YEAR: 'p_py', POLAR_PRODUCT_STUDENT_YEAR: 'p_sy', POLAR_PRODUCT_FOUNDER: 'p_f' }
const get = (k) => env[k]
const map = productMap(get)
const sub = (type, over = {}) => ({ type, data: { id: 'sub1', product_id: 'p_py', status: 'active', customer_id: 'c1', customer: { external_id: 'u1' }, current_period_end: '2027-01-01T00:00:00Z', modified_at: '2026-11-17T10:00:00Z', ...over } })

describe('billing helpers', () => {
  it('maps plans to Polar product ids and back', () => {
    expect(productIdFor(get, 'pro_year')).toBe('p_py')
    expect(map.p_sy).toEqual({ plan: 'student', interval: 'year' })
    expect(map.p_f).toEqual({ plan: 'founder', interval: 'once' })
  })
  it('accepts school emails only for Student', () => {
    for (const ok of ['a@mit.edu', 'a@cs.mit.edu', 'a@nust.edu.pk', 'a@ox.ac.uk']) expect(isStudentEmail(ok)).toBe(true)
    for (const no of ['a@gmail.com', 'a@edu.com', 'a@education.org', '', null]) expect(isStudentEmail(no)).toBe(false)
  })
  it('turns subscription events into a stored plan', () => {
    const a = entitlementFrom(sub('subscription.active'), map)
    expect(a).toMatchObject({ user_id: 'u1', plan: 'pro', status: 'active', billing_interval: 'year', polar_subscription_id: 'sub1' })
    expect(entitlementFrom(sub('subscription.revoked'), map).status).toBe('revoked')
    expect(entitlementFrom(sub('subscription.canceled', { cancel_at_period_end: true }), map)).toMatchObject({ status: 'active', cancel_at_period_end: true })
    expect(entitlementFrom(sub('subscription.active', { customer: {}, metadata: { user_id: 'u2' } }), map).user_id).toBe('u2')
  })
  it('lifetime Founder comes from a paid order and ends on refund', () => {
    const order = (type) => ({ type, data: { id: 'o1', product_id: 'p_f', customer: { external_id: 'u9' }, created_at: '2026-11-17T10:00:00Z' } })
    expect(entitlementFrom(order('order.paid'), map)).toMatchObject({ plan: 'founder', status: 'active', billing_interval: 'once' })
    expect(entitlementFrom(order('order.refunded'), map).status).toBe('refunded')
  })
  it('ignores events it cannot attribute', () => {
    expect(entitlementFrom(sub('subscription.active', { product_id: 'other' }), map)).toBeNull()
    expect(entitlementFrom(sub('subscription.active', { customer: {} }), map)).toBeNull()
    expect(entitlementFrom({ type: 'order.paid', data: { product_id: 'p_py', customer: { external_id: 'u1' } } }, map)).toBeNull()
  })
  it('paid access lasts through the period a cancelled plan already paid for', () => {
    const now = Date.parse('2026-12-01T00:00:00Z')
    expect(hasPaid({ status: 'active' }, now)).toBe(true)
    expect(hasPaid({ status: 'canceled', current_period_end: '2027-01-01T00:00:00Z' }, now)).toBe(true)
    expect(hasPaid({ status: 'canceled', current_period_end: '2026-11-01T00:00:00Z' }, now)).toBe(false)
    for (const s of ['revoked', 'refunded', 'past_due']) expect(hasPaid({ status: s }, now)).toBe(false)
    expect(hasPaid(null)).toBe(false)
  })
})

describe('webhook signature', () => {
  const secret = 'polar_whs_test_secret'
  const sign = async (id, ts, body) => {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`)))
    return 'v1,' + btoa(String.fromCharCode(...sig))
  }
  const now = Date.parse('2026-11-17T10:00:00Z'), ts = String(now / 1000), body = '{"type":"order.paid"}'
  it('accepts a correct signature, including among several', async () => {
    const s = await sign('m1', ts, body)
    expect(await verifyWebhook(body, { id: 'm1', timestamp: ts, signature: s }, secret, now)).toBe(true)
    expect(await verifyWebhook(body, { id: 'm1', timestamp: ts, signature: `v1,AAAA ${s}` }, secret, now)).toBe(true)
  })
  it('rejects tampering, a wrong secret, old messages and missing headers', async () => {
    const s = await sign('m1', ts, body)
    expect(await verifyWebhook(body + ' ', { id: 'm1', timestamp: ts, signature: s }, secret, now)).toBe(false)
    expect(await verifyWebhook(body, { id: 'm2', timestamp: ts, signature: s }, secret, now)).toBe(false)
    expect(await verifyWebhook(body, { id: 'm1', timestamp: ts, signature: s }, 'other', now)).toBe(false)
    expect(await verifyWebhook(body, { id: 'm1', timestamp: ts, signature: s }, secret, now + 3600_000)).toBe(false)
    expect(await verifyWebhook(body, { id: 'm1', timestamp: ts, signature: null }, secret, now)).toBe(false)
  })
})
