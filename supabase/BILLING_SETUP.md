# Turning on payments (Polar + Supabase)

Do this in **Polar Sandbox first** (sandbox.polar.sh): a separate test account with fake money. Repeat the same steps on the real Polar when it works.

## 1. In Polar
1. Make sure the 5 products exist and note each **Product ID** (open the product, copy the ID).
2. **Settings -> Developers -> New access token** (Organization Access Token). Allow checkouts (write). Copy it once.
3. **Settings -> Webhooks -> Add endpoint**
   - URL: `https://<your-project-ref>.supabase.co/functions/v1/polar-webhook`
   - Format: raw
   - Events: `subscription.created`, `subscription.active`, `subscription.updated`, `subscription.canceled`, `subscription.uncanceled`, `subscription.revoked`, `order.paid`, `order.refunded`
   - Copy the **webhook secret**.

## 2. In Supabase
1. **SQL Editor** -> paste `supabase/billing.sql` -> Run.
2. **Authentication -> URL Configuration -> Redirect URLs**: add `https://YOUR-DOMAIN/pricing` (and your localhost one if you test locally). Without it, sign-in cannot return to the pricing page.

## 3. Deploy the two functions (from the project folder)
```
npx supabase login
npx supabase link --project-ref <your-project-ref>

npx supabase secrets set \
  POLAR_SERVER=sandbox \
  POLAR_ACCESS_TOKEN=polar_oat_... \
  POLAR_WEBHOOK_SECRET=... \
  SITE_URL=https://YOUR-DOMAIN \
  POLAR_PRODUCT_PRO_MONTH=... \
  POLAR_PRODUCT_PRO_YEAR=... \
  POLAR_PRODUCT_STUDENT_MONTH=... \
  POLAR_PRODUCT_STUDENT_YEAR=... \
  POLAR_PRODUCT_FOUNDER=...

npx supabase functions deploy polar-checkout
npx supabase functions deploy polar-webhook --no-verify-jwt
```
`--no-verify-jwt` is needed only for the webhook (Polar has no Supabase login). It is safe because the function checks Polar's signature.
The access token and webhook secret live ONLY in Supabase secrets. Never put them in `.env` or give them a `VITE_` name: those end up in the browser.

## 4. Turn the buttons on
In Vercel -> Settings -> Environment Variables add `VITE_BILLING_ON` = `1`, then redeploy.

## 5. Test
1. Open /pricing, sign in, click **Get Pro**.
2. Pay with the test card `4242 4242 4242 4242`, any future date, any 3 digits.
3. You land on /pricing?thanks=1. In Supabase **Table Editor -> entitlements** a row should appear within seconds.
4. If not: Polar -> Webhooks -> your endpoint -> Deliveries shows what was sent and what we answered (403 = wrong secret, 500 = database problem). Supabase -> Edge Functions -> Logs shows errors.
5. Student plans need a sign-in whose email ends in .edu, .edu.xx or .ac.xx.

## Going live
Repeat with the real Polar: new access token, new webhook + secret, new product IDs. Then run
`npx supabase secrets set POLAR_SERVER=production POLAR_ACCESS_TOKEN=... POLAR_WEBHOOK_SECRET=... POLAR_PRODUCT_...=...`
and redeploy nothing else (secrets apply on the next call).

---

## No terminal? Do step 3 in the Supabase dashboard instead
(Use this if `npx supabase` hangs while downloading.)

1. **Secrets:** Dashboard -> Edge Functions -> **Secrets** -> add one by one (name, then value):
   `POLAR_SERVER` (sandbox), `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `SITE_URL`,
   `POLAR_PRODUCT_PRO_MONTH`, `POLAR_PRODUCT_PRO_YEAR`, `POLAR_PRODUCT_STUDENT_MONTH`, `POLAR_PRODUCT_STUDENT_YEAR`, `POLAR_PRODUCT_FOUNDER`.
   (`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` already exist automatically. Do not add them.)
2. **Function 1:** Edge Functions -> **Deploy a new function -> Via Editor**. Name: `polar-checkout`. Delete the sample code, paste ALL of `supabase/dashboard/polar-checkout.ts`, Deploy.
3. **Function 2:** same, name `polar-webhook`, paste `supabase/dashboard/polar-webhook.ts`, Deploy. Then open the function's settings and turn **JWT verification OFF** (Polar has no Supabase login; the signature check protects it).
4. The webhook URL for Polar is `https://bybfxmyknppcdfpzagmd.supabase.co/functions/v1/polar-webhook`.
