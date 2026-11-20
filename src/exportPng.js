// Saves the circuit canvas as a PNG picture. The canvas is an SVG styled by the page's CSS, so each element's
// look is copied onto it first, which lets the picture stand on its own (outside the page's stylesheet).
import { dims } from './engine.js'

const PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-opacity', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'letter-spacing']
const SKIP = /(^|\s)(hit|gcell|pulse|wirehit|scr-open)(\s|$)/

export function circuitSvg(svg, parts, background = '#070b16') {
  const live = svg.querySelector('g[transform]')
  if (!live || !parts.length) return null
  const boxes = parts.map((c) => { const [w, h] = dims(c); return [c.x, c.y, c.x + w, c.y + h] })
  const m = 48, x0 = Math.min(...boxes.map((b) => b[0])) - m, y0 = Math.min(...boxes.map((b) => b[1])) - m
  const w = Math.max(...boxes.map((b) => b[2])) + m - x0, h = Math.max(...boxes.map((b) => b[3])) + m - y0
  const copy = live.cloneNode(true)
  const from = [live, ...live.querySelectorAll('*')], to = [copy, ...copy.querySelectorAll('*')]
  from.forEach((el, i) => {
    const target = to[i]
    if (SKIP.test(el.getAttribute('class') || '')) { target.setAttribute('data-drop', '1'); return }
    const cs = getComputedStyle(el)
    for (const p of PROPS) target.style.setProperty(p, cs.getPropertyValue(p))
    target.style.setProperty('filter', 'none')
    target.style.setProperty('transition', 'none')
    target.style.setProperty('animation', 'none')
  })
  copy.querySelectorAll('[data-drop]').forEach((n) => n.remove())
  copy.removeAttribute('transform')
  const ns = 'http://www.w3.org/2000/svg', out = document.createElementNS(ns, 'svg')
  out.setAttribute('xmlns', ns)
  out.setAttribute('viewBox', `${x0} ${y0} ${w} ${h}`)
  out.setAttribute('width', w)
  out.setAttribute('height', h)
  const bg = document.createElementNS(ns, 'rect')
  for (const [k, v] of Object.entries({ x: x0, y: y0, width: w, height: h, fill: background })) bg.setAttribute(k, v)
  out.append(bg, copy)
  return { svg: out, w, h }
}

export async function savePng(svg, parts, name = 'circuit') {
  const made = circuitSvg(svg, parts)
  if (!made) throw new Error('empty')
  const xml = new XMLSerializer().serializeToString(made.svg)
  const img = new Image()
  await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}` })
  const k = Math.min(2, 4096 / Math.max(made.w, made.h)), cv = document.createElement('canvas')
  cv.width = Math.round(made.w * k); cv.height = Math.round(made.h * k)
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
  const blob = await new Promise((ok) => cv.toBlob(ok, 'image/png'))
  if (!blob) throw new Error('png')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${name}.png`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
