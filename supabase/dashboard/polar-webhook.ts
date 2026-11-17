// Paste this whole file into: Dashboard -> Edge Functions -> Deploy a new function -> Via Editor. Name it exactly: polar-webhook. Then turn OFF its JWT verification.
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
// Polar calls this when someone pays, cancels or is refunded. Deploy with --no-verify-jwt (Polar has no Supabase token);
// the signature check below is what proves the message really came from Polar.

const env = (k: string) => Deno.env.get(k)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 })
  const body = await req.text() // the exact raw text, the signature covers it

  const ok = await verifyWebhook(body, {
    id: req.headers.get('webhook-id'), timestamp: req.headers.get('webhook-timestamp'), signature: req.headers.get('webhook-signature'),
  }, env('POLAR_WEBHOOK_SECRET') ?? '')
  if (!ok) return new Response('bad signature', { status: 403 })

  let ev
  try { ev = JSON.parse(body) } catch { return new Response('bad json', { status: 400 }) }
  const patch = entitlementFrom(ev, productMap(env))
  if (!patch) return new Response('ignored', { status: 200 }) // an event we do not care about

  const sb = createClient(env('SUPABASE_URL')!, env('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: cur, error: readErr } = await sb.from('entitlements').select('plan,status,source_ts').eq('user_id', patch.user_id).maybeSingle()
  if (readErr) { console.error(readErr); return new Response('db', { status: 500 }) } // Polar retries on 5xx

  // a lifetime Founder is never downgraded by a subscription event, and a late old event never beats a newer one
  const founderKept = cur?.plan === 'founder' && cur.status === 'active' && patch.plan !== 'founder'
  const stale = cur && cur.plan === patch.plan && Date.parse(cur.source_ts) > Date.parse(patch.source_ts)
  if (founderKept || stale) return new Response('skipped', { status: 200 })

  const { error } = await sb.from('entitlements').upsert({ ...patch, updated_at: new Date().toISOString() })
  if (error) { console.error(error); return new Response('db', { status: 500 }) }
  return new Response('ok', { status: 200 })
})
