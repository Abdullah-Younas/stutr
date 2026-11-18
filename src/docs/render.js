// Turns the docs data into HTML (for the page and for crawlers), markdown (for AI tools) and llms.txt. No React, no browser APIs.
import { PAGES, pageUrl } from './content.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// inline marks: `code`, **bold**, [text](link)
export const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')

const partDl = (f) => [
  ['In code', '`' + f.codeName + '`' + (f.aliases.length ? ' (also ' + f.aliases.map((a) => '`' + a + '`').join(', ') + ')' : '')],
  ['Inputs', f.inputs], ['Outputs', f.outputs], f.width && ['Default width', f.width + ' bit' + (f.width === '1' ? '' : 's')],
  f.clocked && ['Clocked', 'Acts on the rising edge of its clock pin'],
].filter(Boolean)

export const blockHtml = (b) => {
  switch (b.t) {
    case 'p': return `<p>${inline(b.x)}</p>`
    case 'h': return `<h3>${inline(b.x)}</h3>`
    case 'code': return `<pre class="doc-code"><code>${esc(b.x)}</code></pre>`
    case 'list': return `<ul>${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`
    case 'note': return `<p class="doc-note">${inline(b.x)}</p>`
    case 'table': return `<div class="doc-table"><table><thead><tr>${b.head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    case 'part': {
      const f = b.f
      return `<section class="doc-part" id="part-${f.type.toLowerCase()}"><h3>${esc(f.name)}</h3><p>${inline(f.desc)}</p>`
        + `<dl>${partDl(f).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${inline(v)}</dd>`).join('')}${f.settings.length ? `<dt>Settings</dt><dd><ul>${f.settings.map((x) => `<li>${inline(x)}</li>`).join('')}</ul></dd>` : ''}</dl>`
        + (f.outNames ? `<p>${inline(f.outNames)}</p>` : '') + `<pre class="doc-code"><code>${esc(f.example)}</code></pre></section>`
    }
    default: return ''
  }
}
export const pageHtml = (page) =>
  `<h1>${esc(page.title)}</h1><p class="doc-lede">${esc(page.description)}</p>`
  + `<nav class="doc-toc" aria-label="On this page"><ol>${page.sections.map((s) => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join('')}</ol></nav>`
  + page.sections.map((s) => `<section id="${s.id}"><h2>${esc(s.title)}</h2>${s.blocks.map(blockHtml).join('')}</section>`).join('')

/* ---- markdown ---- */
const cell = (c) => String(c).replace(/\|/g, '\\|')
export const blockMd = (b) => {
  switch (b.t) {
    case 'p': return b.x
    case 'h': return `### ${b.x}`
    case 'code': return '```' + b.lang + '\n' + b.x + '\n```'
    case 'list': return b.items.map((i) => `- ${i}`).join('\n')
    case 'note': return `> **Note:** ${b.x}`
    case 'table': return [`| ${b.head.map(cell).join(' | ')} |`, `|${b.head.map(() => ' --- ').join('|')}|`, ...b.rows.map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n')
    case 'part': {
      const f = b.f
      return [`### ${f.name}`, f.desc, partDl(f).map(([k, v]) => `- ${k}: ${v}`).join('\n') + (f.settings.length ? '\n- Settings:\n' + f.settings.map((x) => `  - ${x}`).join('\n') : ''), f.outNames, '```stutr\n' + f.example + '\n```'].filter(Boolean).join('\n\n')
    }
    default: return ''
  }
}
export const pageMd = (page) => [`# ${page.title}`, `> ${page.description}`, ...page.sections.flatMap((s) => [`## ${s.title}`, ...s.blocks.map(blockMd)])].join('\n\n') + '\n'

const trim = (u) => u.replace(/\/$/, '')
export const mdFile = (slug) => (slug ? `${slug}.md` : 'index.md')
export const SUMMARY = 'Stutr is a code-based digital logic circuit simulator that runs in the browser. Build circuits by typing short lines of code or by dragging parts onto a canvas; both views stay in sync and the circuit runs live. It has gates, buses, flip-flops, counters, RAM and ROM, a 4-bit CPU example, and an LED screen part up to 2048 by 2048 pixels.'

export const llmsTxt = (base) => {
  const b = trim(base)
  return [
    '# Stutr', '', `> ${SUMMARY}`, '',
    'Stutr is an alternative to Logisim with a text language. The documentation below is complete and is also available as one file at ' + `${b}/llms-full.txt.`, '',
    '## Documentation', '',
    ...PAGES.map((p) => `- [${p.title}](${b}/docs/${mdFile(p.slug)}): ${p.description}`), '',
    '## Machine-readable', '',
    `- [All documentation in one file](${b}/llms-full.txt): every page below in markdown`,
    `- [Parts as JSON](${b}/docs/parts.json): every part with its pins, default width, settings and example`, '',
    '## Product', '',
    `- [Home](${b}/): what Stutr is`, `- [FAQ](${b}/faq): common questions`, `- [Pricing](${b}/pricing): plans and prices`, `- [Privacy policy](${b}/privacy)`, `- [Terms of service](${b}/terms)`, '',
    '## Optional', '', `- [Open the editor](${b}/app): the circuit editor (needs a browser)`, '',
  ].join('\n')
}
export const llmsFull = (base) => {
  const b = trim(base)
  return [`# Stutr: complete documentation`, '', `> ${SUMMARY}`, '', `Website: ${b}/`, '', ...PAGES.flatMap((p) => [`<!-- ${b}${pageUrl(p.slug)} -->`, '', pageMd(p).replace(/^# /m, '# ')])].join('\n')
}
export const partsJson = () => PAGES.find((p) => p.slug === 'parts').sections.flatMap((s) => s.blocks).filter((b) => b.t === 'part').map(({ f }) => ({
  type: f.type, name: f.name, category: f.category, code: f.codeName, aliases: f.aliases, description: f.desc, inputs: f.inputs, outputs: f.outputs, defaultWidth: f.width || null, settings: f.settings.map((x) => x.replace(/`/g, '')), clocked: f.clocked, example: f.example,
}))

// full HTML document body for crawlers: plain, readable without JavaScript (the app replaces it once it loads)
export const staticBody = (page) =>
  `<header><a href="/">Stutr</a> <nav aria-label="Docs">${PAGES.map((p) => `<a href="${pageUrl(p.slug)}">${esc(p.title)}</a>`).join(' ')}</nav></header><main><article>${pageHtml(page)}</article></main>`
