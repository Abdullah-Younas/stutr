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

---

## Profile page: "Manage plan and billing" (third function)
The Profile and plan panel in the app shows each person's plan and a button that opens Polar's billing page (change plan, cancel, update card, invoices). It needs one more function and one more permission:

1. **Polar access token:** open it (Settings -> Developers) and also allow **`customer_sessions:write`**. If the token was made without it, create a new one with both permissions and update the `POLAR_ACCESS_TOKEN` secret.
2. **Deploy the function:** Edge Functions -> Deploy a new function -> Via Editor, name `polar-portal`, paste all of `supabase/dashboard/polar-portal.ts`. Leave JWT verification ON (unlike the webhook). With the CLI: `npx supabase functions deploy polar-portal`.
3. **Test:** sign in as someone who has paid, open the menu -> Profile & plan. You should see the plan and renewal date, and **Manage plan and billing** should open Polar.
4. If the Polar page does not offer "Change plan", check your Polar organization's subscription settings. A person who never paid has no billing account yet, so the button is hidden for them.

---

## Pro features: what to switch on
1. **Version history:** run `supabase/versions.sql` once in the SQL Editor. Without it everything still works, but cloud history stays empty (browser-only users are not affected).
2. **Limits start only when `VITE_BILLING_ON=1`.** Until then everything is unlocked, so nobody is stuck behind a paywall before payments work. With it on, the Free plan gets: 5 saved projects, LED screens up to 64 by 64, Midnight theme only, no version history, no PNG/netlist/Verilog export, and no placing your own circuits as parts. Opening and running anything you already made always works.
3. **Where the limits are set:** `src/lib/gate.js` (`FREE_PROJECTS`, `FREE_SCREEN`, and which themes are paid).
4. **Good to know:** these limits are enforced in the app, not in the database, so someone technical could get around them. That is fine to start with. If it ever matters, the project limit can be enforced in Supabase too.
