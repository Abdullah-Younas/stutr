import { describe, expect, it } from 'vitest'
import { DEFS, parse } from './engine'
import { ALL_PARTS, PAGES } from './docs/content'
import { PARTS } from './docs/parts'
import { llmsFull, llmsTxt, mdFile, pageHtml, pageMd, partsJson, staticBody } from './docs/render'
import { AI_BOTS, ROUTES, robotsTxt } from './routes'

const blocks = PAGES.flatMap((p) => p.sections.flatMap((s) => s.blocks.map((b) => ({ page: p.slug || 'index', section: s.id, b }))))

describe('documentation stays true to the code', () => {
  it('documents every part in the engine, and nothing that does not exist', () => {
    expect(Object.keys(PARTS).sort()).toEqual(Object.keys(DEFS).sort())
    expect(ALL_PARTS.length).toBe(Object.keys(DEFS).length)
  })
  it('every part example is a circuit that loads without errors', () => {
    for (const f of ALL_PARTS) expect(parse(f.example).errs, f.type).toEqual([])
  })
  it('every example uses the part it documents', () => {
    for (const f of ALL_PARTS) {
      const c = parse(f.example)
      expect(c.parts.some((p) => p.type === f.type), f.type).toBe(true)
    }
  })
  it('every code sample on every docs page loads without errors', () => {
    for (const { page, section, b } of blocks) if (b.t === 'code' && b.lang === 'stutr') expect(parse(b.x).errs, `${page}/${section}`).toEqual([])
  })
  it('lists pins and defaults from the engine, not from memory', () => {
    const ram = ALL_PARTS.find((f) => f.type === 'RAM')
    expect(ram.inputs).toBe('A, D, WE, >')
    expect(ram.settings.join(' ')).toContain('`addr`')
    expect(ALL_PARTS.find((f) => f.type === 'SCREEN').settings.join(' ')).toContain('2048')
  })
})

describe('documentation is readable by AI tools', () => {
  const base = 'https://example.com'
  it('has a page, a markdown file and an llms.txt entry for every docs page', () => {
    const txt = llmsTxt(base)
    for (const p of PAGES) {
      expect(txt).toContain(`${base}/docs/${mdFile(p.slug)}`)
      expect(pageMd(p)).toContain(`# ${p.title}`)
      expect(pageHtml(p)).toContain(`<h1>${p.title.replace(/&/g, '&amp;')}</h1>`)
    }
    expect(txt.startsWith('# Stutr\n\n> ')).toBe(true)
  })
  it('puts every part name in the one-file version, the static HTML and the JSON', () => {
    const full = llmsFull(base), parts = PAGES.find((p) => p.slug === 'parts'), html = staticBody(parts), json = partsJson()
    for (const f of ALL_PARTS) { expect(full).toContain(f.name); expect(html).toContain(f.name) }
    expect(json.length).toBe(ALL_PARTS.length)
    expect(json[0]).toHaveProperty('example')
  })
  it('static HTML needs no JavaScript: real headings, links and text', () => {
    const html = staticBody(PAGES[0])
    expect(html).toContain('<h1>')
    expect(html).toContain('href="/docs/language"')
    expect(html).not.toContain('<script')
  })
  it('lets AI crawlers in, but keeps the private pages blocked for them too', () => {
    const txt = robotsTxt(base)
    for (const b of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) expect(AI_BOTS).toContain(b)
    expect(txt).toContain('User-agent: ClaudeBot')
    expect(txt.match(/Disallow: \/app/g).length).toBe(2) // once for everyone, once for the AI group
    expect(txt).not.toContain('Disallow: /docs')
  })
  it('docs pages are indexable and in the routes list', () => {
    for (const p of PAGES) expect(ROUTES.find((r) => r.path === (p.slug ? `/docs/${p.slug}` : '/docs')).index).toBe(true)
  })
})
