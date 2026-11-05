// Runs before every production build: writes public/sitemap.xml and public/robots.txt from src/routes.js
// and stops the build if the values a live site must not ship without are missing.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { robotsTxt, sitemapXml } from '../src/routes.js'

const file = existsSync('.env')
  ? Object.fromEntries(readFileSync('.env', 'utf8').split('\n').map((l) => l.match(/^\s*(\w+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
  : {}
const get = (k) => process.env[k] || file[k] || ''
const url = get('VITE_SITE_URL')
const missing = ['VITE_SITE_URL', 'VITE_CONTACT_EMAIL'].filter((k) => !get(k))
if (missing.length) {
  console.error(`\nBuild stopped: set ${missing.join(' and ')} (in .env or your host's environment variables).\n`)
  process.exit(1)
}
writeFileSync('public/sitemap.xml', sitemapXml(url))
writeFileSync('public/robots.txt', robotsTxt(url))
console.log(`seo: wrote public/sitemap.xml and public/robots.txt for ${url}`)
