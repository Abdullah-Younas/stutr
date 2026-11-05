# Stutr v1.0 - site, accounts, cloud saving

## 1. Copy the files into your project
Overwrite: `index.html`, `src/main.jsx`, `src/App.jsx`, `src/Entry.jsx`, `src/Dashboard.jsx`, `src/dashboard.css`.
Add everything else (`src/lib`, `src/pages`, `src/components`, `src/engine.js`, `src/examples.js`, `src/routes.js`, `src/site.js`,
`src/site.css`, tests, `public/*`, `scripts/seo.mjs`, `supabase/schema.sql`, `vercel.json`, `vitest.config.js`, `.env.example`).
Keep your own `src/index.css` and `src/assets/bg.jpg`. If you had custom code in `main.jsx` or `App.jsx`, merge it.

## 2. Install and add two scripts
```bash
npm i react-router-dom @supabase/supabase-js
npm i -D vitest jsdom @testing-library/react
```
In `package.json` -> `"scripts"` add:
```json
"prebuild": "node scripts/seo.mjs",
"test": "vitest run"
```

## 3. Supabase (database + sign-in)
1. supabase.com -> New project. Copy the **Project URL** and the **anon public key** (Project settings -> API).
2. SQL Editor -> paste `supabase/schema.sql` -> Run. This creates `projects` and `user_settings` with row-level security.
3. Authentication -> Providers -> **GitHub**: create an OAuth app at github.com/settings/developers.
   Callback URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`. Paste the client ID and secret into Supabase.
4. Authentication -> Providers -> **Google**: Google Cloud Console -> APIs & Services -> Credentials -> OAuth client ID (Web).
   Use the same callback URL. Paste the client ID and secret into Supabase.
5. Authentication -> URL Configuration: Site URL = your live domain. Redirect URLs: `http://localhost:5173/app` and `https://your-domain.com/app`.

## 4. Environment
Copy `.env.example` to `.env` and fill it in. `VITE_SITE_URL` and `VITE_CONTACT_EMAIL` are required for a production build
(the build stops with a message if they are missing). Leave the Supabase keys empty to run in local-only mode.
Set the same variables in your host (Vercel/Netlify -> Environment variables).

## 5. Run, test, ship
```bash
npm run dev      # http://localhost:5173
npm test         # engine, pages, editor behaviour, links, settings
npm run build    # also writes public/sitemap.xml and public/robots.txt for your domain
```
Deploy to Vercel (`vercel.json` included) or Netlify (`public/_redirects` included). Both need the single-page-app fallback so
`/privacy` or `/faq` work when opened directly.

## Before you announce it
- Read `Privacy.jsx` and `Terms.jsx` and have them reviewed for your country. They are starter text, not legal advice.
- Check the share card: paste your URL into a card validator (for example opengraph.xyz) after deploying.
- Compress `src/assets/bg.jpg` (aim for under 200 KB, WebP if you can) - it is the heaviest file on the home page.
- Run Lighthouse in Chrome DevTools on `/` and `/app`, and submit `sitemap.xml` in Google Search Console.
- Analytics is optional: create a Plausible site and set `VITE_PLAUSIBLE_DOMAIN`. It only loads after a visitor allows it.
