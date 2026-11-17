// Paste this whole file into: Dashboard -> Edge Functions -> Deploy a new function -> Via Editor. Name it exactly: polar-checkout
import { createClient } from 'npm:@supabase/supabase-js@2'

// ---- shared helpers (bundled so this file works alone in the Supabase dashboard editor) ----
// Pure helpers shared by the two functions (and unit-tested in src/billing.test.js). No Deno-only APIs in here.

export type Plan = 'pro_month' | 'pro_year' | 'student_month' | 'student_year' | 'founder'
export const PLANS: Plan[] = ['pro_month', 'pro_year', 'student_month', 'student_year', 'founder']
export type Info = { plan: 'pro' | 'student' | 'founder'; interval: 'month' | 'year' | 'once' }
type Env = (key: string) => string | undefined

const ENV_KEYS: Record<Plan, string> = {
  pro_month: 'POLAR_PRODUCT_PRO_MONTH',
  pro_year: 'POLAR_PRODUCT_PRO_YEAR',
  student_month: 'POLAR_PRODUCT_STUDENT_MONTH',
  student_year: 'POLAR_PRODUCT_STUDENT_YEAR',
  founder: 'POLAR_PRODUCT_FOUNDER',
}
const INFO: Record<Plan, Info> = {
  pro_month: { plan: 'pro', interval: 'month' },
  pro_year: { plan: 'pro', interval: 'year' },
  student_month: { plan: 'student', interval: 'month' },
  student_year: { plan: 'student', interval: 'year' },
  founder: { plan: 'founder', interval: 'once' },
}

export const productIdFor = (env: Env, plan: Plan) => env(ENV_KEYS[plan])
// Polar product id -> what it means
export const productMap = (env: Env): Record<string, Info> => {
  const out: Record<string, Info> = {}
  for (const p of PLANS) { const id = env(ENV_KEYS[p]); if (id) out[id] = INFO[p] }
  return out
}

// .edu, .edu.pk, .ac.uk, .ac.in ... The Student plan is for those addresses only.
export const isStudentEmail = (email?: string | null) => !!email && /@[^@\s]+\.(edu|edu\.[a-z]{2}|ac\.[a-z]{2})$/i.test(email)

export type Patch = {
  user_id: string; plan: string; status: string; billing_interval: string
  polar_customer_id: string | null; polar_subscription_id: string | null
  current_period_end: string | null; cancel_at_period_end: boolean; source_ts: string
}

// Turns one Polar webhook event into the row we store, or null if it is not about one of our plans.
export function entitlementFrom(ev: { type: string; data: any }, map: Record<string, Info>): Patch | null {
  const d = ev.data ?? {}
  const userId = d.customer?.external_id ?? d.metadata?.user_id ?? null
  const info = map[d.product_id ?? d.product?.id]
  if (!userId || !info) return null
  const ts = d.modified_at ?? d.created_at ?? new Date().toISOString()
  const base = { user_id: String(userId), plan: info.plan, billing_interval: info.interval, source_ts: ts, polar_customer_id: d.customer_id ?? d.customer?.id ?? null }

  if (info.interval !== 'once' && ev.type.startsWith('subscription.')) {
    return {
      ...base,
      status: ev.type === 'subscription.revoked' ? 'revoked' : String(d.status ?? 'active'),
      polar_subscription_id: d.id ?? null,
      current_period_end: d.current_period_end ?? null,
      cancel_at_period_end: !!d.cancel_at_period_end,
    }
  }
  if (info.plan === 'founder' && (ev.type === 'order.paid' || ev.type === 'order.refunded')) {
    return { ...base, status: ev.type === 'order.paid' ? 'active' : 'refunded', polar_subscription_id: null, current_period_end: null, cancel_at_period_end: false }
  }
  return null
}

// Does this row currently give paid access? A cancelled plan keeps working until the period they paid for ends.
export const hasPaid = (e: { status: string; current_period_end?: string | null } | null | undefined, now = Date.now()) =>
  !!e && (e.status === 'active' || e.status === 'trialing' || (e.status === 'canceled' && !!e.current_period_end && Date.parse(e.current_period_end) > now))

// Standard Webhooks signature: HMAC-SHA256 over "id.timestamp.body", sent as "v1,<base64>" (several may be listed).
export async function verifyWebhook(body: string, h: { id?: string | null; timestamp?: string | null; signature?: string | null }, secret: string, now = Date.now()) {
  const ts = Number(h.timestamp)
  if (!h.id || !h.signature || !secret || !Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false
  const enc = new TextEncoder()
  const keys: Uint8Array[] = [enc.encode(secret)] // Polar's secret is used as the raw text
  if (secret.startsWith('whsec_')) { try { keys.push(Uint8Array.from(atob(secret.slice(6)), (c) => c.charCodeAt(0))) } catch { /* not base64 */ } }
  const data = enc.encode(`${h.id}.${h.timestamp}.${body}`)
  for (const raw of keys) {
    const key = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    for (const part of h.signature.split(' ')) {
      const [v, b64] = part.split(',')
      if (v !== 'v1' || !b64) continue
      let sig: Uint8Array
      try { sig = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) } catch { continue }
      if (await crypto.subtle.verify('HMAC', key, sig, data)) return true
    }
  }
  return false
}

// ---- the function ----
// Starts a Polar checkout for the signed-in person. Deploy WITH jwt verification (the default).

const cors = {
  'Access-Control-Allow-Origin': '*', // safe: calls are authorised by the bearer token, not cookies
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const env = (k: string) => Deno.env.get(k)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'method' })

  const sb = createClient(env('SUPABASE_URL')!, env('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return reply(401, { error: 'signin' })

  const { plan } = await req.json().catch(() => ({}))
  if (!PLANS.includes(plan)) return reply(400, { error: 'plan' })
  if ((plan as Plan).startsWith('student') && !isStudentEmail(user.email)) return reply(403, { error: 'student_email' })

  const { data: current } = await sb.from('entitlements').select('status,current_period_end').maybeSingle() // RLS: only this person's row
  if (hasPaid(current)) return reply(409, { error: 'already_paid' })

  const product = productIdFor(env, plan as Plan)
  const site = (env('SITE_URL') ?? '').replace(/\/$/, '')
  if (!product || !site || !env('POLAR_ACCESS_TOKEN')) return reply(500, { error: 'not_configured' })

  const api = env('POLAR_SERVER') === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh'
  const res = await fetch(`${api}/v1/checkouts/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('POLAR_ACCESS_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      products: [product],
      external_customer_id: user.id,
      customer_email: user.email,
      success_url: `${site}/pricing?thanks=1`,
      return_url: `${site}/pricing`,
      metadata: { user_id: user.id, plan },
    }),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok || !out.url) { console.error('Polar checkout failed', res.status, JSON.stringify(out)); return reply(502, { error: 'polar' }) }
  return reply(200, { url: out.url })
})
