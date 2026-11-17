// Polar calls this when someone pays, cancels or is refunded. Deploy with --no-verify-jwt (Polar has no Supabase token);
// the signature check below is what proves the message really came from Polar.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { entitlementFrom, productMap, verifyWebhook } from '../_shared/polar.ts'

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
