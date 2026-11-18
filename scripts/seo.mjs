// Runs before every production build: writes the sitemap, robots.txt and the AI-readable docs
// (llms.txt, llms-full.txt, markdown copies of every docs page, parts.json) and stops the build
// if the values a live site must not ship without are missing.
import { mkdirSync, writeFileSync } from 'node:fs'
import { get } from './env.mjs'
import { robotsTxt, sitemapXml } from '../src/routes.js'
import { PAGES } from '../src/docs/content.js'
import { llmsFull, llmsTxt, mdFile, pageMd, partsJson } from '../src/docs/render.js'

const url = get('VITE_SITE_URL')
const missing = ['VITE_SITE_URL', 'VITE_CONTACT_EMAIL'].filter((k) => !get(k))
if (missing.length) {
  console.error(`\nBuild stopped: set ${missing.join(' and ')} (in .env or your host's environment variables).\n`)
  process.exit(1)
}
writeFileSync('public/sitemap.xml', sitemapXml(url))
writeFileSync('public/robots.txt', robotsTxt(url))
writeFileSync('public/llms.txt', llmsTxt(url))
writeFileSync('public/llms-full.txt', llmsFull(url))
mkdirSync('public/docs', { recursive: true })
for (const p of PAGES) writeFileSync(`public/docs/${mdFile(p.slug)}`, pageMd(p))
writeFileSync('public/docs/parts.json', JSON.stringify({ source: `${url}/docs/parts`, parts: partsJson() }, null, 2) + '\n')
console.log(`seo: wrote sitemap, robots, llms.txt, llms-full.txt and ${PAGES.length} docs pages (markdown) for ${url}`)
