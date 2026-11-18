// Runs after every build. The app is a single-page app, and many crawlers (search and AI) do not run JavaScript.
// So each docs page also gets a real HTML file with the full text in it. When the app loads it takes over.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { get } from './env.mjs'
import { ROUTES } from '../src/routes.js'
import { PAGES } from '../src/docs/content.js'
import { pageUrl } from '../src/docs/pages-meta.js'
import { mdFile, staticBody } from '../src/docs/render.js'

const base = get('VITE_SITE_URL').replace(/\/$/, '')
if (!existsSync('dist/index.html')) { console.error('prerender: run the build first (dist/index.html is missing)'); process.exit(1) }
const tpl = readFileSync('dist/index.html', 'utf8')
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
const swap = (html, re, to) => (re.test(html) ? html.replace(re, () => to) : html.replace('</head>', () => `${to}\n</head>`))

for (const page of PAGES) {
  const path = pageUrl(page.slug), r = ROUTES.find((x) => x.path === path), url = base + path
  const ld = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'TechArticle', headline: page.title, description: page.description, url,
    inLanguage: 'en', isPartOf: { '@type': 'WebSite', name: 'Stutr', url: base }, publisher: { '@type': 'Organization', name: 'Stutr', url: base },
    ...(page.slug ? { breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Docs', item: base + '/docs' }, { '@type': 'ListItem', position: 2, name: page.title, item: url }] } } : {}),
  })
  let html = tpl
  html = swap(html, /<title>[\s\S]*?<\/title>/, `<title>${attr(r.title)}</title>`)
  html = swap(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${attr(r.description)}" />`)
  html = swap(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`)
  html = swap(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${attr(r.title)}" />`)
  html = swap(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${attr(r.description)}" />`)
  html = swap(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`)
  html = swap(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${attr(r.title)}" />`)
  html = swap(html, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${attr(r.description)}" />`)
  html = html.replace('</head>', () => `<link rel="alternate" type="text/markdown" href="${base}/docs/${mdFile(page.slug)}" title="Markdown version" />\n<script type="application/ld+json">${ld}</script>\n</head>`)
  html = html.replace('<div id="root"></div>', () => `<div id="root">${staticBody(page)}</div>`)
  const dir = page.slug ? `dist/docs/${page.slug}` : 'dist/docs'
  mkdirSync(dir, { recursive: true })
  writeFileSync(`${dir}/index.html`, html)
}
console.log(`prerender: wrote ${PAGES.length} static docs pages`)
