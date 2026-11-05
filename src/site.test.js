import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FOOTER_LINKS, ROUTES, robotsTxt, sitemapXml } from './routes'
import { DEFAULTS, sanitize } from './lib/settings'

const paths = ROUTES.map((r) => r.path)

describe('routes and SEO', () => {
  it('has unique paths and sensible titles and descriptions', () => {
    expect(new Set(paths).size).toBe(paths.length)
    for (const r of ROUTES) {
      expect(r.path.startsWith('/')).toBe(true)
      expect(r.title.length).toBeLessThanOrEqual(65)
      expect(r.description.length).toBeGreaterThan(40)
      expect(r.description.length).toBeLessThanOrEqual(160)
    }
  })
  it('builds a sitemap with absolute URLs for indexable pages only', () => {
    const xml = sitemapXml('https://example.com/', '2026-11-01')
    expect(xml).toContain('<loc>https://example.com/</loc>')
    expect(xml).toContain('<loc>https://example.com/faq</loc>')
    expect(xml).not.toContain('/app')
    expect(xml).not.toContain('/login')
  })
  it('keeps the editor and login out of search results', () => {
    const txt = robotsTxt('https://example.com')
    expect(txt).toContain('Disallow: /app')
    expect(txt).toContain('Disallow: /login')
    expect(txt).toContain('Sitemap: https://example.com/sitemap.xml')
  })
})

// Broken-link check: every internal link written in the source must point at a real route.
describe('internal links', () => {
  const files = []
  const walk = (dir) => readdirSync(dir).forEach((f) => { const p = join(dir, f); statSync(p).isDirectory() ? walk(p) : /\.jsx?$/.test(f) && !/\.test\./.test(f) && files.push(p) })
  walk('src')
  const found = new Set()
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    for (const m of text.matchAll(/(?:\bto=|href=|navigate\(|path=)["'{(]*["']?(\/[A-Za-z0-9/_-]*)["']/g)) found.add(m[1])
  }
  it('finds links to check', () => expect(found.size).toBeGreaterThan(3))
  it('has no link to a page that does not exist', () => {
    const virtual = ['/*', '/404'] // the catch-all route and the page name the 404 page uses for its title
    const bad = [...found].filter((p) => !virtual.includes(p) && !paths.includes(p))
    expect(bad).toEqual([])
  })
  it('lists real pages in the footer', () => {
    for (const [, p] of FOOTER_LINKS) expect(paths).toContain(p)
  })
})

describe('settings form data', () => {
  it('falls back to defaults for junk', () => {
    expect(sanitize(null)).toEqual(DEFAULTS)
    expect(sanitize('x')).toEqual(DEFAULTS)
    expect(sanitize({ hz: 999, snap: 'yes', wires: 'curvy' })).toEqual(DEFAULTS)
  })
  it('keeps valid values', () => {
    expect(sanitize({ hz: 10, snap: false, wires: 'straight', extra: 1 })).toEqual({ ...DEFAULTS, hz: 10, snap: false, wires: 'straight' })
  })
})
