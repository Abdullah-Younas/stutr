// Gives a signed-in customer a link to Polar's billing page (change plan, cancel, card, invoices).
// Deploy WITH jwt verification (the default). The access token needs the "customer_sessions:write" scope.
import { createClient } from 'npm:@supabase/supabase-js@2'

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

  const site = (env('SITE_URL') ?? '').replace(/\/$/, '')
  if (!site || !env('POLAR_ACCESS_TOKEN')) return reply(500, { error: 'not_configured' })

  const api = env('POLAR_SERVER') === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh'
  const res = await fetch(`${api}/v1/customer-sessions/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('POLAR_ACCESS_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ external_customer_id: user.id, return_url: `${site}/app` }), // the same id we gave Polar at checkout
  })
  const out = await res.json().catch(() => ({}))
  if (res.status === 404 || res.status === 422) return reply(404, { error: 'no_customer' }) // never paid, so Polar has no customer for them
  if (!res.ok || !out.customer_portal_url) { console.error('Polar portal failed', res.status, JSON.stringify(out)); return reply(502, { error: 'polar' }) }
  return reply(200, { url: out.customer_portal_url })
})
