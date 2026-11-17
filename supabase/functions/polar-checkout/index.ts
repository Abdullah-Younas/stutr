// Starts a Polar checkout for the signed-in person. Deploy WITH jwt verification (the default).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { PLANS, hasPaid, isStudentEmail, productIdFor, type Plan } from '../_shared/polar.ts'

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
