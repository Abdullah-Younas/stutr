import './index.css'
import './dashboard.css'
import './studio.css'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Cpu, Download, Eraser, FilePlus, Folder, Hand, LayoutGrid, Library, Lightbulb, Menu, MousePointer2, Search, Settings as Cog, Wrench, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './lib/auth'
import { makeStore } from './lib/store'
import { DEFAULTS, HZ, readLocalSettings, sanitize, writeLocalSettings } from './lib/settings'
import { getConsent, setConsent } from './lib/consent'
import { usePageMeta } from './lib/meta'
import { EXAMPLES } from './examples'
import {
  mk, pop, W, NN, TX, INS, OUTS, OW, shift, DEFS, dims, snap, pinIn, pinOut, NAME, START, sim, settle, M, clamp, gen, lit, parse,
} from './engine'

/* ================= Code tab ================= */
function CodeEditor({ code, onChange, err }) {
  const gutter = useRef(null)
  const area = useRef(null)
  const lines = code.split('\n').length

  const onKeyDown = (e) => {
    if (e.key !== 'Tab') return
    e.preventDefault()
    const { selectionStart: s, selectionEnd: en } = e.target
    onChange(code.slice(0, s) + '  ' + code.slice(en))
    requestAnimationFrame(() => (area.current.selectionStart = area.current.selectionEnd = s + 2))
  }

  return (
    <div className="CodeEditor">
      <div className="gutter" ref={gutter} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <textarea
        ref={area} value={code} wrap="off" spellCheck={false} aria-label="Circuit code"
        onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
        onScroll={(e) => (gutter.current.scrollTop = e.target.scrollTop)}
        placeholder={'A = input(1)\nB = input(0)\ng = and(A, B)\nY = output(g)'}
      />
      <div className={`codebar${err ? ' err' : ''}`}>
        {err || 'Synced · name = part<bits>(inputs, setting=value)  ·  None = empty input  ·  layout is automatic'}
      </div>
    </div>
  )
}

/* ================= Editor tab ================= */
const HINTS = {
  poke: 'Poke (P): click inputs and clocks. Drag from a pin to another pin to wire. Hold D and click a wire to delete it',
  select: 'Edit (E): drag parts, Delete removes the selection',
  box: 'Select (S): drag a box around parts, then move them together or press Delete',
  erase: 'Erase (X): click a part or a wire. Tip: hold D in any tool to erase',
  menu: 'Menu (M): click a part for Duplicate and Delete',
  label: 'Label (L): click a part, then type its new name in the panel',
}
const TOOLBAR = [['poke', 'Poke', 'P'], ['select', 'Edit', 'E'], ['box', 'Select', 'S'], ['erase', 'Erase', 'X'], ['TEXT', 'Text', 'T'], ['menu', 'Menu', 'M'], ['label', 'Label', 'L']]
const KEYS = Object.fromEntries(TOOLBAR.map(([t, , k]) => [k.toLowerCase(), t])) // key -> tool
const SHORT = Object.fromEntries(TOOLBAR.map(([t, , k]) => [t, k])) // tool -> key
const SEGS = { a: [6, 0, 28, 6], b: [34, 6, 6, 28], c: [34, 38, 6, 28], d: [6, 66, 28, 6], e: [0, 38, 6, 28], f: [0, 6, 6, 28], g: [6, 33, 28, 6] }
const HEXMAP = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg', 'abcefg', 'cdefg', 'adef', 'bcdeg', 'adefg', 'aefg']

/* ---- part graphics (Logisim style): every kind of part has its own symbol ---- */
const AND_P = (w, h) => `M0 0H${w / 2}A${w / 2} ${h / 2} 0 0 1 ${w / 2} ${h}H0Z`
const OR_P = (w, h) => `M0 0H12Q${w * 0.7} 0 ${w} ${h / 2}Q${w * 0.7} ${h} 12 ${h}H0Q16 ${h / 2} 0 0Z`
const XOR_P = (w, h) => `M8 0H16Q${w * 0.73} 0 ${w} ${h / 2}Q${w * 0.73} ${h} 16 ${h}H8Q24 ${h / 2} 8 0Z`
const TRI_P = (w, h) => `M0 ${h * 0.13}L${w} ${h / 2}L0 ${h * 0.87}Z`
const PATHS = {
  AND: AND_P, NAND: AND_P, OR: OR_P, NOR: OR_P, XOR: XOR_P, XNOR: XOR_P,
  NOT: TRI_P, BUF: TRI_P, CBUF: TRI_P, CINV: TRI_P,
  MUX: (w, h) => `M0 0L${w} ${h * 0.15}V${h * 0.85}L0 ${h}Z`,
  DEMUX: (w, h) => `M0 ${h * 0.15}L${w} 0V${h}L0 ${h * 0.85}Z`,
  TUNNEL: (w, h) => `M0 ${h / 2}L10 0H${w}V${h}H10Z`,
}
const GSHAPE = new Set(['AND', 'NAND', 'OR', 'NOR', 'XOR', 'XNOR', 'NOT', 'BUF', 'CBUF', 'CINV'])
const BARE = new Set(['SPLIT', 'MERGE', 'PULL', 'TRANS', 'POWER', 'GND'])
const BIG = new Set(['ADD', 'SUB', 'MUL', 'DIV', 'BADD'])

// the outline of a part
const frame = (c, d, w, h, v) => {
  const P = PATHS[c.type]?.(w, h)
  if (P) {
    return (
      <>
        <rect className="hit" width={w} height={h} />
        <path className="shape" d={P} />
        {(c.type === 'XOR' || c.type === 'XNOR') && <path className="shape open" d={`M0 0Q16 ${h / 2} 0 ${h}`} />}
      </>
    )
  }
  if (BARE.has(c.type)) return <rect className="hit" width={w} height={h} />
  return <rect width={w} height={h} rx={d.round ? 20 : 6} className={d.note ? 'note' : d.led ? (v ? 'led' : '') : (d.bit || c.type === 'CLK') && v ? 'on' : ''} />
}

// the drawing inside a part's box
const body = (c, d, w, h, ins, v) => {
  const T = c.type
  if (GSHAPE.has(T)) return null // gates are fully drawn by frame()
  if (T === 'CLK') return <path className="mark" d="M7 27H14V13H26V27H33" />
  if (T === 'POWER') return <><path className="mark" d="M40 20H22" /><path className="shape" d="M22 8V32L8 20Z" /></>
  if (T === 'GND') return <path className="mark" d="M40 20H22M22 6V34M16 11V29M10 16V24" />
  if (T === 'PULL') return <path className="mark" d={`M0 ${h / 2}H10L16 ${h / 2 - 12}L26 ${h / 2 + 12}L36 ${h / 2 - 12}L46 ${h / 2 + 12}L52 ${h / 2}H${w}`} />
  if (T === 'TRANS') return <path className="mark" d="M0 20H14M14 12V48M20 10V50M20 18H40V30H60M0 40H20" />
  if (T === 'TGATE') return <path className="mark" d={`M16 ${h * 0.25}L${w - 16} ${h * 0.75}V${h * 0.25}L16 ${h * 0.75}Z`} />
  if (T === 'SPLIT' || T === 'MERGE') {
    const sp = T === 'SPLIT', k = sp ? OUTS(c).length : INS(c).length
    const ys = Array.from({ length: k }, (_, i) => (h / (k + 1)) * (i + 1)), bx = sp ? 14 : w - 14
    return <path className="mark" d={`M${sp ? 0 : w} ${h / 2}H${bx}M${bx} ${ys[0]}V${ys[k - 1]}${ys.map((y) => `M${bx} ${y}H${sp ? w : 0}`).join('')}`} />
  }
  if (T === 'BTN') {
    return (
      <>
        <rect className={`key${v ? ' on' : ''}`} x="8" y="8" width="24" height="24" rx="5" />
        <text x={w / 2} y={h / 2 + 5} textAnchor="middle">{v ? 1 : 0}</text>
      </>
    )
  }
  if (d.seg) {
    const lit = c.type === 'SEG7' ? 'abcdefg'.split('').filter((_, i) => ins[i]).join('') : HEXMAP[ins[0] & 15]
    return (
      <g transform={`translate(${(w - 40) / 2} ${(h - 72) / 2})`}>
        {Object.entries(SEGS).map(([k, [x, y, sw, sh]]) => (
          <rect key={k} x={x} y={y} width={sw} height={sh} rx="2" className={`seg${lit.includes(k) ? ' on' : ''}`} />
        ))}
      </g>
    )
  }
  if (c.type === 'JOY') {
    const m = mk(W(c)), f = (n) => ((n ?? (m + 1) >> 1) + 0.5) / (m + 1)
    return <circle className="knob" cx={f(c.vx) * w} cy={f(c.vy) * h} r="7" />
  }
  if (c.type === 'KEYB') {
    return <text x={w / 2} y={h / 2 + 5} textAnchor="middle" className="mono">{(c.s || '').slice(-8).replace(/\n/g, '↵') || 'type…'}</text>
  }
  if (c.type === 'TTY') {
    return (c.s || '').split('\n').slice(-4).map((l, i) => <text key={i} x="10" y={22 + i * 16} className="mono">{l.slice(-15)}</text>)
  }
  if (c.type === 'MATRIX') {
    return Array.from({ length: NN(c) }, (_, r) => Array.from({ length: W(c) }, (_, k) => (
      <circle key={r + ':' + k} className={`dot${(ins[0] >> k) & 1 && (ins[1] >> r) & 1 ? ' on' : ''}`} cx={18 + k * 12} cy={18 + r * 12} r="4" />
    )))
  }
  if (c.type === 'TEXT') return <text x="8" y="19" className="mono">{TX(c)}</text>
  const t = d.label ? d.label(c) : d.bit ? (W(c) > 1 ? (v || 0).toString(16).toUpperCase() : v ? 1 : 0) : d.sym
  return <text x={w / 2} y={h / 2 + (BIG.has(T) ? 9 : 5)} textAnchor="middle" className={BIG.has(T) ? 'big' : undefined}>{t}</text>
}

const wirePath = (x1, y1, x2, y2, style) => (style === 'straight' ? `M${x1} ${y1}L${x2} ${y2}` : `M${x1} ${y1}H${(x1 + x2) / 2}V${y2}H${x2}`)

function Circuit({ circuit, update, tool, setTool, fitKey, settings, mark, undo, redo, canUndo, canRedo }) {
  const { parts, wires } = circuit
  const [sels, setSels] = useState([])
  const [link, setLink] = useState(null) // a wire being dragged from a pin
  const [band, setBand] = useState(null)
  const [menu, setMenu] = useState(null)
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const pan = useRef(null)
  const drag = useRef(null)
  const held = useRef(null)
  const holdD = useRef(false) // D held down = erase mode
  const [hold, setHold] = useState(false)
  const svg = useRef(null)
  const nameRef = useRef(null)
  const S = useMemo(() => sim(parts, wires), [parts, wires])
  const byId = S.by
  const sn = (v) => (settings.snap ? snap(v) : Math.round(v))
  const cur = sels.length === 1 ? byId[sels[0]] : null
  const cd = cur && DEFS[cur.type]

  const raw = (e) => {
    const r = svg.current.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }
  const point = (e) => { const [x, y] = raw(e); return [(x - view.x) / view.k, (y - view.y) / view.k] } // screen -> circuit coordinates
  const fit = () => {
    const r = svg.current.getBoundingClientRect()
    if (!r.width) return
    if (!parts.length) return setView({ x: 0, y: 0, k: 1 })
    const x0 = Math.min(...parts.map((p) => p.x)), y0 = Math.min(...parts.map((p) => p.y - 20))
    const x1 = Math.max(...parts.map((p) => p.x + dims(p)[0] + 10)), y1 = Math.max(...parts.map((p) => p.y + dims(p)[1]))
    const k = clamp(Math.min((r.width - 40) / (x1 - x0), (r.height - 40) / (y1 - y0)), 0.25, 1)
    setView({ x: 20 - x0 * k, y: 20 - y0 * k, k })
  }
  useEffect(() => { fit() }, [fitKey])
  const [running, setRunning] = useState(false)
  const [hz, setHz] = useState(settings.hz)
  useEffect(() => setHz(settings.hz), [settings.hz])
  const upd = useRef(update)
  upd.current = update // the timer always calls the newest update
  const hasClk = parts.some((p) => p.type === 'CLK')
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => upd.current((c) => ({ ...c, parts: c.parts.map((p) => (p.type === 'CLK' ? { ...p, v: p.v ? 0 : 1 } : p)) })), 500 / hz)
    return () => clearInterval(id)
  }, [running, hz])
  const onWheel = (e) => {
    const [mx, my] = raw(e), k2 = clamp(view.k * (e.deltaY < 0 ? 1.1 : 1 / 1.1), 0.2, 2.5)
    setView({ k: k2, x: mx - (mx - view.x) * (k2 / view.k), y: my - (my - view.y) * (k2 / view.k) })
  }
  const patch = (id, o) => update((c) => ({ ...c, parts: c.parts.map((p) => (p.id === id ? { ...p, ...o } : p)) }))
  const removeMany = (ids) => {
    mark()
    update((c) => ({ parts: c.parts.filter((p) => !ids.includes(p.id)), wires: c.wires.filter((w) => !ids.includes(w.from) && !ids.includes(w.to)) }))
    setSels([])
  }
  const rename = (id, name) => {
    if (!NAME.test(name) || (name !== id && byId[name])) return
    mark(true)
    update((c) => ({
      parts: c.parts.map((p) => (p.id === id ? { ...p, id: name } : p)),
      wires: c.wires.map((w) => ({ ...w, from: w.from === id ? name : w.from, to: w.to === id ? name : w.to })),
    }))
    setSels([name])
  }
  const fresh = (type) => {
    const base = type.toLowerCase()
    let i = 1
    while (byId[base + i]) i++
    return base + i
  }
  const duplicate = (id) => {
    const p = byId[id], nid = fresh(p.type)
    mark()
    update((c) => ({ ...c, parts: [...c.parts, { ...p, id: nid, x: p.x + 40, y: p.y + 40, s: undefined, pc: undefined }] }))
    setSels([nid])
  }
  const joy = (e, c) => {
    const [x, y] = point(e), [w, h] = dims(c), m = mk(W(c))
    const f = (v) => clamp(Math.floor(v * (m + 1)), 0, m)
    patch(c.id, { vx: f((x - c.x) / w), vy: f((y - c.y) / h) })
  }

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey && cur?.type !== 'KEYB') { holdD.current = true; setHold(true); return }
      if (e.key === 'Delete' && sels.length) removeMany(sels)
      else if (e.key === 'Escape') { setLink(null); setMenu(null); setSels([]); setTool('poke') }
      else if (cur?.type === 'KEYB' && !e.ctrlKey && !e.metaKey && (e.key.length === 1 || e.key === 'Enter')) {
        e.preventDefault()
        patch(cur.id, { s: (cur.s || '') + (e.key === 'Enter' ? '\n' : e.key) })
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && KEYS[e.key.toLowerCase()]) {
        setTool(KEYS[e.key.toLowerCase()])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  useEffect(() => {
    const up = (e) => { if (e.type === 'blur' || e.key.toLowerCase() === 'd') { holdD.current = false; setHold(false) } }
    window.addEventListener('keyup', up)
    window.addEventListener('blur', up)
    return () => { window.removeEventListener('keyup', up); window.removeEventListener('blur', up) }
  }, [])
  useEffect(() => { if (tool === 'label' && cur) nameRef.current?.focus() }, [tool, sels])

  const onCanvasDown = (e) => {
    setMenu(null)
    const [x, y] = point(e)
    if (DEFS[tool]) {
      const d = DEFS[tool], [w, h] = dims({ type: tool }), id = fresh(tool)
      mark()
      update((c) => ({ ...c, parts: [...c.parts, { id, type: tool, x: sn(x - w / 2), y: sn(y - h / 2), ...(d.adef !== undefined && { text: d.adef }) }] }))
      return setSels([id])
    }
    setSels([])
    if (tool === 'box') setBand({ x0: x, y0: y, x1: x, y1: y })
    if (tool === 'poke' || tool === 'select') { const [rx, ry] = raw(e); pan.current = { sx: rx, sy: ry, vx: view.x, vy: view.y } }
  }
  const onPartDown = (e, c) => {
    e.stopPropagation()
    setMenu(null)
    const d = DEFS[c.type], [x, y] = point(e)
    if (tool === 'erase' || holdD.current) return removeMany([c.id])
    if (tool === 'menu') { const [rx, ry] = raw(e); return setMenu({ id: c.id, x: rx, y: ry }) }
    if (tool === 'poke') {
      if (d.toggle) return patch(c.id, { v: W(c) > 1 ? ((c.v || 0) + 1) & mk(W(c)) : c.v ? 0 : 1 })
      if (c.type === 'BTN') { held.current = { id: c.id }; return patch(c.id, { v: 1 }) }
      if (c.type === 'JOY') { held.current = { id: c.id, joy: true }; return joy(e, c) }
    }
    const ids = sels.includes(c.id) ? sels : [c.id]
    setSels(ids)
    if (['select', 'box', 'poke'].includes(tool)) {
      drag.current = { x, y, orig: Object.fromEntries(ids.map((i) => [i, { x: byId[i].x, y: byId[i].y }])) }
    }
  }
  const onMove = (e) => {
    if (link) { const [lx, ly] = point(e); return setLink({ ...link, x: lx, y: ly }) }
    if (pan.current) {
      const [rx, ry] = raw(e), a = pan.current
      return setView((v) => ({ ...v, x: a.vx + rx - a.sx, y: a.vy + ry - a.sy }))
    }
    const [x, y] = point(e)
    if (held.current?.joy) return joy(e, byId[held.current.id])
    if (band) return setBand({ ...band, x1: x, y1: y })
    if (!drag.current) return
    const { x: sx, y: sy, orig } = drag.current
    if (!drag.current.marked) { drag.current.marked = true; mark() } // one undo step per drag
    update((c) => ({
      ...c,
      parts: c.parts.map((p) => (orig[p.id] ? { ...p, x: sn(orig[p.id].x + x - sx), y: sn(orig[p.id].y + y - sy) } : p)),
    }))
  }
  const release = (e) => {
    if (link) {
      if (e.type === 'pointerup') finishLink(e)
      setLink(null)
    }
    if (band) {
      const [x0, x1] = [band.x0, band.x1].sort((a, b) => a - b), [y0, y1] = [band.y0, band.y1].sort((a, b) => a - b)
      setSels(parts.filter((p) => { const [w, h] = dims(p); return p.x < x1 && p.x + w > x0 && p.y < y1 && p.y + h > y0 }).map((p) => p.id))
      setBand(null)
    }
    drag.current = null
    pan.current = null
    const h = held.current
    if (h) { patch(h.id, h.joy ? { vx: undefined, vy: undefined } : { v: 0 }); held.current = null }
  }
  // drag from a pin to another pin (output to input, or input to output) to wire two parts
  const onPin = (e, c, i, k = 0) => {
    e.stopPropagation()
    if (tool === 'erase' || holdD.current) return
    const [x, y] = point(e)
    setLink({ id: c.id, side: i === 'out' ? 'out' : 'in', k, pin: i, x, y })
  }
  const finishLink = (e) => {
    const [x, y] = point(e)
    let best = null, bd = 18 / view.k
    parts.forEach((p) => {
      const pins = link.side === 'out'
        ? INS(p).map((_, i) => ({ id: p.id, i, xy: pinIn(p, i) }))
        : OUTS(p).map((_, k) => ({ id: p.id, k, xy: pinOut(p, k) }))
      pins.forEach((q) => { const d = Math.hypot(q.xy[0] - x, q.xy[1] - y); if (d < bd) { bd = d; best = q } })
    })
    if (!best) return
    mark()
    const w = link.side === 'out'
      ? { from: link.id, fp: link.k, to: best.id, pin: best.i }
      : { from: best.id, fp: best.k, to: link.id, pin: link.pin }
    update((m) => ({ ...m, wires: [...m.wires.filter((o) => !(o.to === w.to && o.pin === w.pin)), w] }))
  }
  const num = (key, lo, hi) => (e) => { mark(true); patch(cur.id, { [key]: clamp(+e.target.value || lo, lo, hi) }) }
  const vals = cur ? (OUTS(cur).length ? S.outs(cur.id) : S.ins(cur)) : []

  return (
    <div className={`circuit tool-${tool}${hold ? ' erasing' : ''}`}>
      <svg ref={svg} role="img" aria-label="Circuit canvas. The Code tab is the keyboard-friendly text version of this circuit." onPointerDown={onCanvasDown} onPointerMove={onMove} onPointerUp={release} onPointerLeave={release} onWheel={onWheel}>
        <defs>
          <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.14)" />
          </pattern>
        </defs>
        {settings.grid && <rect width="100%" height="100%" fill="url(#dots)" />}
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>

        {wires.map((w, i) => {
          const a = byId[w.from], b = byId[w.to]
          if (!a || !b) return null
          const [x1, y1] = pinOut(a, w.fp || 0), [x2, y2] = pinIn(b, w.pin), dd = wirePath(x1, y1, x2, y2, settings.wires)
          const cls = `wire${S.outs(w.from)[w.fp || 0] ? ' hi' : ''}${(OW(a)[w.fp || 0] || 1) > 1 ? ' bus' : ''}`
          const del = (e) => {
            e.stopPropagation()
            if (tool === 'erase' || holdD.current) { mark(); update((k) => ({ ...k, wires: k.wires.filter((_, j) => j !== i) })) }
          }
          return (
            <g key={i}>
              <path className="wirehit" d={dd} onPointerDown={del} />
              <path className={cls} d={dd} />
            </g>
          )
        })}

        {parts.map((c) => {
          const d = DEFS[c.type], [w, h] = dims(c), ins = S.ins(c), o = S.outs(c.id)
          const v = OUTS(c).length ? o[0] : ins[0]
          return (
            <g key={c.id} transform={`translate(${c.x} ${c.y})`} onPointerDown={(e) => onPartDown(e, c)}
              className={`part ${sels.includes(c.id) ? 'sel' : ''}`}>
              {frame(c, d, w, h, v)}
              {body(c, d, w, h, ins, v)}
              {d.neg && <circle cx={w + 5} cy={h / 2} r="5" />}
              {d.seq && d.clk != null && <path className="mark" d={`M0 ${pinIn(c, d.clk)[1] - c.y - 6}L9 ${pinIn(c, d.clk)[1] - c.y}L0 ${pinIn(c, d.clk)[1] - c.y + 6}`} />}
              {settings.pinLabels && INS(c).map((l, i) => l && !(d.seq && i === d.clk) && <text key={'i' + i} x="6" y={pinIn(c, i)[1] - c.y + 4} className="pl">{l}</text>)}
              {settings.pinLabels && OUTS(c).map((l, k) => l && <text key={'o' + k} x={w - 6} y={pinOut(c, k)[1] - c.y + 4} textAnchor="end" className="pl">{l}</text>)}
              {settings.names && !d.note && <text x={w / 2} y={-8} textAnchor="middle" className="lbl">{c.id}</text>}
            </g>
          )
        })}

        {parts.map((c) => (
          <g key={'p' + c.id}>
            {INS(c).map((_, i) => (
              <circle key={'i' + i} cx={pinIn(c, i)[0]} cy={pinIn(c, i)[1]} r="5" className="pin" onPointerDown={(e) => onPin(e, c, i)} />
            ))}
            {OUTS(c).map((_, k) => (
              <circle key={'o' + k} cx={pinOut(c, k)[0]} cy={pinOut(c, k)[1]} r="5"
                className="pin" onPointerDown={(e) => onPin(e, c, 'out', k)} />
            ))}
          </g>
        ))}

        {link && byId[link.id] && (() => {
          const [sx, sy] = link.side === 'out' ? pinOut(byId[link.id], link.k) : pinIn(byId[link.id], link.pin)
          return <path className="wire hi ghost" d={wirePath(sx, sy, link.x, link.y, settings.wires)} />
        })()}
        {band && (
          <rect className="band" x={Math.min(band.x0, band.x1)} y={Math.min(band.y0, band.y1)}
            width={Math.abs(band.x1 - band.x0)} height={Math.abs(band.y1 - band.y0)} />
        )}
        </g>
      </svg>

      <div className="toolbar" role="toolbar" aria-label="Tools">
        {TOOLBAR.map(([t, name, key]) => (
          <button key={t} type="button" className={tool === t ? 'on' : ''} title={`${name} tool (${key})`} onClick={() => setTool(t)}>
            {name} <kbd>{key}</kbd>
          </button>
        ))}
      </div>
      <div className="runbar">
        <button type="button" className={running ? 'on' : ''} disabled={!hasClk} title={hasClk ? '' : 'Add a clock part first'}
          onClick={() => setRunning(!running)}>{running ? 'Pause' : 'Run'}</button>
        <select value={hz} onChange={(e) => setHz(+e.target.value)} aria-label="Clock speed">
          {[1, 2, 5, 10, 20].map((h) => <option key={h} value={h}>{h} Hz</option>)}
        </select>
        <button type="button" onClick={fit}>Fit view</button>
        <button type="button" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">Undo</button>
        <button type="button" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">Redo</button>
      </div>
      <div className="hint">{HINTS[tool] || `Click the canvas to place ${tool}`}</div>

      {menu && byId[menu.id] && (
        <div className="ctx" style={{ left: menu.x, top: menu.y }}>
          <button type="button" onClick={() => { duplicate(menu.id); setMenu(null) }}>Duplicate</button>
          <button type="button" className="danger" onClick={() => { removeMany([menu.id]); setMenu(null) }}>Delete</button>
        </div>
      )}

      {sels.length > 1 && (
        <aside className="inspector">
          <h4>{sels.length} parts</h4>
          <p>Drag to move them together</p>
          <button type="button" onClick={() => removeMany(sels)}>Delete all</button>
        </aside>
      )}
      {cur && (
        <aside className="inspector">
          <h4>{cur.type}</h4>
          <label>Name
            <input ref={nameRef} value={cur.id} onChange={(e) => rename(cur.id, e.target.value)} />
          </label>
          {cd.bits !== undefined && (
            <label>{cd.blabel || 'Data bits'}
              <input type="number" min="1" max="16" value={W(cur)} onChange={num('bits', 1, 16)} />
            </label>
          )}
          {cd.n !== undefined && (
            <label>{cd.nlabel}
              <input type="number" min={cd.nmin ?? 1} max={cd.nmax ?? 16} value={NN(cur)} onChange={num('n', cd.nmin ?? 1, cd.nmax ?? 16)} />
            </label>
          )}
          {cd.attr && (
            <label>{cd.attr}
              <input value={TX(cur)} onChange={(e) => { mark(true); patch(cur.id, { text: e.target.value }) }} />
            </label>
          )}
          <p>Position <span>{cur.x}, {cur.y}</span></p>
          <p>{OUTS(cur).length ? 'Outputs' : 'Inputs'} <span>{vals.map((v) => (v == null ? 'Z' : v.toString(16))).join(' ') || '-'}</span></p>
          <button type="button" onClick={() => removeMany([cur.id])}>Delete</button>
        </aside>
      )}
    </div>
  )
}

/* ================= Modal + its contents ================= */
function Modal({ title, onClose, children }) {
  useEffect(() => {
    // capture phase, so Esc closes the modal without also resetting the tool
    const k = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [onClose])
  return (
    <div className="overlay" onPointerDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onPointerDown={(e) => e.stopPropagation()}>
        <header>
          <h3>{title}</h3>
          <button type="button" className="x" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

// T(name, tool, glyph, icon): tool null = listed but not built yet
const T = (name, tool, glyph, icon) => ({ name, tool, glyph, icon })
const CATALOG = [
  { label: 'Base', items: [
    T('Poke Tool', 'poke', null, Hand), T('Edit Tool', 'select', null, MousePointer2), T('Select Tool', 'box', 'box'),
    T('Erase Tool', 'erase', null, Eraser),
    T('Text Tool', 'TEXT', 'Aa'), T('Menu Tool', 'menu', 'menu'), T('Label', 'label', 'lbl'),
  ] },
  { label: 'Wiring', items: [
    T('Splitter', 'SPLIT', 'spl'), T('Combiner', 'MERGE', 'mrg'), T('Pin', 'IN', 'in'), T('Probe', 'OUT', 'out'), T('Tunnel', 'TUNNEL', 'tun'),
    T('Pull Resistor', 'PULL', 'pull'), T('Clock', 'CLK', 'CK'), T('Constant', 'CONST', '1'), T('Power', 'POWER', '+V'),
    T('Ground', 'GND', 'GND'), T('Transistor', 'TRANS', 'Tr'), T('Transmission Gate', 'TGATE', 'TG'), T('Bit Extender', 'EXT', 'ext'),
  ] },
  { label: 'Gates', items: [
    T('NOT Gate', 'NOT'), T('Buffer', 'BUF'), T('AND Gate', 'AND'), T('OR Gate', 'OR'), T('NAND Gate', 'NAND'), T('NOR Gate', 'NOR'),
    T('XOR Gate', 'XOR'), T('XNOR Gate', 'XNOR'), T('Odd Parity', 'ODD'), T('Even Parity', 'EVEN'),
    T('Controlled Buffer', 'CBUF'), T('Controlled Inverter', 'CINV'),
  ] },
  { label: 'Plexers', items: [
    T('Multiplexer', 'MUX'), T('Demultiplexer', 'DEMUX'), T('Decoder', 'DEC'), T('Priority Encoder', 'PENC'), T('Bit Selector', 'BSEL'),
  ] },
  { label: 'Arithmetic', items: [
    T('Adder', 'ADD'), T('Subtractor', 'SUB'), T('Multiplier', 'MUL'), T('Divider', 'DIV'), T('Negator', 'NEG'),
    T('Comparator', 'CMP'), T('Shifter', 'SHIFT'), T('Bit Adder', 'BADD'), T('Bit Finder', 'BFIND'),
  ] },
  { label: 'Memory', items: [
    T('D Flip-Flop', 'DFF'), T('T Flip-Flop', 'TFF'), T('J-K Flip-Flop', 'JKFF'), T('S-R Flip-Flop', 'SRFF'),
    T('Register', 'REG'), T('Counter', 'CTR'), T('Shift Register', 'SHREG'), T('Random Generator', 'RND'),
    T('RAM', 'RAM'), T('ROM', 'ROM'),
  ] },
  { label: 'Input/Output', items: [
    T('Button', 'BTN', 'btn'), T('Joystick', 'JOY', 'joy'), T('Keyboard', 'KEYB', 'key'), T('LED', 'LED', 'led'),
    T('7-Segment Display', 'SEG7', '7seg'), T('Hex Digit Display', 'HEX', 'hex'), T('LED Matrix', 'MATRIX', 'mat'), T('TTY', 'TTY', 'tty'),
  ] },
]

function ToolPicker({ tool, onPick }) {
  const [q, setQ] = useState('')
  return (
    <>
      <input className="modal-search" autoFocus placeholder="Search tools and parts" value={q} onChange={(e) => setQ(e.target.value)} />
      {CATALOG.map((s) => {
        const items = s.items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))
        if (!items.length) return null
        return (
          <section key={s.label}>
            <h4>{s.label}</h4>
            <div className="tiles">
              {items.map(({ name, tool: t, glyph, icon: Icon }) => (
                <button key={name} type="button" disabled={!t} title={t ? name : 'Not built yet'}
                  className={`tile${tool === t ? ' active' : ''}${t ? '' : ' soon'}`} onClick={() => onPick(t)}>
                  {Icon ? <Icon size={22} strokeWidth={1.5} /> : PATHS[t] && t !== 'TUNNEL' ? (
                    <svg className="mini" viewBox="-4 -4 78 68" width="46" height="38">
                      <path d={PATHS[t](60, 60)} />
                      {(t === 'XOR' || t === 'XNOR') && <path d="M0 0Q16 30 0 60" />}
                      {DEFS[t].neg && <circle cx="65" cy="30" r="5" />}
                    </svg>
                  ) : <span className="glyph">{glyph ?? DEFS[t].sym}</span>}
                  <span>{name}</span>
                  {SHORT[t] && <kbd>{SHORT[t]}</kbd>}
                  {!t && <small>soon</small>}
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}

function Projects({ code, store, onOpen }) {
  const [list, setList] = useState(null)
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const refresh = () => store.listProjects().then(setList).catch(() => setMsg('Could not load your projects.'))
  useEffect(() => { refresh() }, [store])
  const save = async (e) => {
    e.preventDefault()
    const n = name.trim() || `Circuit ${(list?.length ?? 0) + 1}`
    setBusy(true)
    try { await store.saveProject(n, code); setName(''); setMsg(`Saved "${n}".`); await refresh() } catch { setMsg('Could not save. Check your connection and try again.') }
    setBusy(false)
  }
  const del = async (p) => {
    try { await store.deleteProject(p.id); await refresh() } catch { setMsg('Could not delete that project.') }
  }
  return (
    <>
      <p className="empty">{store.cloud ? 'Saved to your account.' : 'Saved in this browser only. Sign in to keep your projects online.'}</p>
      <form className="row" onSubmit={save}>
        <input className="modal-search" value={name} maxLength={80} placeholder="Name this circuit" aria-label="Project name" onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save current'}</button>
      </form>
      {msg && <p className="empty" role="status">{msg}</p>}
      {list && !list.length && <p className="empty">Nothing saved yet. Name the circuit above and save it.</p>}
      {(list || []).map((p) => (
        <div className="item" key={p.id}>
          <div><strong>{p.name}</strong><small>{new Date(p.updated_at).toLocaleString()}</small></div>
          <button type="button" className="btn" onClick={() => onOpen(p.code)}>Open</button>
          <button type="button" className="btn ghost" aria-label={`Delete ${p.name}`} onClick={() => del(p)}>Delete</button>
        </div>
      ))}
    </>
  )
}

const DOCS = [
  'name = part<bits>(inputs, setting=value)      one line per part',
  '',
  'A  = input<4>(5)        input with value 5, 4 bits wide',
  'ck = clock()            a clock: press Run to tick it',
  'g  = and(A, B)          gates: and or not nand nor xor xnor',
  's  = add<4>(A, B)       s = first output, s.carry = second',
  'Y  = output<4>(s)       an output pin',
  'ro = rom<4>(pc, addr=4, data="1 2 f")   settings go last',
  'sp = split<4>(A)        then sp[0] ... sp[3] are single bits',
  'None                    leave an input empty (reads 0)',
  '# comment   // comment   ; is optional',
].join('\n')

/* ================= Settings ================= */
const SHORTCUTS = [
  ['P', 'Poke'], ['E', 'Edit (move parts)'], ['S', 'Select (box)'], ['X', 'Erase tool'], ['T / M / L', 'Text / Menu / Label'],
  ['Hold D', 'Erase while held: click a wire or part'], ['Delete', 'Remove the selection'], ['Esc', 'Back to Poke'],
  ['Ctrl+Z', 'Undo'], ['Ctrl+Y / Ctrl+Shift+Z', 'Redo'], ['Wheel / drag empty space', 'Zoom / pan'],
]

function SettingsModal({ settings, setSettings, user, store, onNote, onSignOut }) {
  const [analytics, setAnalytics] = useState(getConsent() === 'all')
  const set = (k, v) => setSettings((s) => sanitize({ ...s, [k]: v }))
  const toggle = (k, label, hint) => (
    <label className="field">
      <span>{label}{hint && <small>{hint}</small>}</span>
      <input type="checkbox" checked={settings[k]} onChange={(e) => set(k, e.target.checked)} />
    </label>
  )
  const download = async () => {
    try {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([JSON.stringify(await store.exportAll(), null, 2)], { type: 'application/json' }))
      a.download = 'stutr-data.json'
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    } catch { onNote('Could not export your data.') }
  }
  const erase = async () => {
    if (!window.confirm('Delete all your saved projects and settings? This cannot be undone.')) return
    try { await store.eraseAll(); setSettings({ ...DEFAULTS }); onNote('Your saved data was deleted.') } catch { onNote('Could not delete your data. Try again.') }
  }
  return (
    <>
      <div className="set-group">
        <h4>Editor</h4>
        {toggle('snap', 'Snap to grid', 'Parts jump to a 20 px grid')}
        {toggle('grid', 'Show grid dots')}
        {toggle('pinLabels', 'Show pin labels')}
        {toggle('names', 'Show part names')}
        <label className="field">
          <span>Wire style</span>
          <select value={settings.wires} onChange={(e) => set('wires', e.target.value)}>
            <option value="elbow">Right angles</option>
            <option value="straight">Straight lines</option>
          </select>
        </label>
      </div>
      <div className="set-group">
        <h4>Simulation</h4>
        <label className="field">
          <span>Clock speed<small>Used by the Run button</small></span>
          <select value={settings.hz} onChange={(e) => set('hz', +e.target.value)}>
            {HZ.map((h) => <option key={h} value={h}>{h} Hz</option>)}
          </select>
        </label>
      </div>
      <div className="set-group">
        <h4>Saving and privacy</h4>
        {toggle('autosave', 'Autosave my circuit', 'Reopen where you left off')}
        {toggle('confirmNew', 'Ask before starting a new circuit')}
        <label className="field">
          <span>Anonymous analytics<small>Page views only. Off unless you allow it</small></span>
          <input type="checkbox" checked={analytics} onChange={(e) => { setConsent(e.target.checked ? 'all' : 'essential'); setAnalytics(e.target.checked) }} />
        </label>
      </div>
      <div className="set-group">
        <h4>Account and data</h4>
        <p className="empty">{user ? `Signed in as ${user.email}` : 'Not signed in. Your work is saved in this browser.'}</p>
        <div className="row-btns">
          <button type="button" className="btn" onClick={download}>Export my data</button>
          <button type="button" className="btn ghost" onClick={erase}>Delete my data</button>
          <button type="button" className="btn" onClick={() => setSettings({ ...DEFAULTS })}>Reset settings</button>
          {user && <button type="button" className="btn" onClick={onSignOut}>Sign out</button>}
        </div>
      </div>
      <div className="set-group">
        <h4>Keyboard shortcuts</h4>
        <dl className="keys">{SHORTCUTS.map(([k, v]) => <Fragment key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></Fragment>)}</dl>
      </div>
    </>
  )
}

/* ================= Dashboard ================= */
const NAV = [
  { label: 'My work', items: [
    { id: 'projects', name: 'Projects', icon: Folder },
    { id: 'create', name: 'Create', icon: FilePlus },
  ] },
  { label: 'Build', items: [
    { id: 'tools', name: 'Parts & tools', icon: Wrench },
    { id: 'examples', name: 'Examples', icon: Library },
  ] },
  // Hardware lab: placeholders for the Arduino / breadboard work that is coming later.
  { label: 'Hardware lab', items: [
    { id: 'arduino', name: 'Arduino boards', icon: Cpu, soon: true },
    { id: 'breadboard', name: 'Breadboards', icon: LayoutGrid, soon: true },
    { id: 'hw-parts', name: 'LEDs & jumper wires', icon: Lightbulb, soon: true },
  ] },
  { label: 'Circuit', items: [{ id: 'export', name: 'Export code', icon: Download }] },
  { label: 'Support', items: [
    { id: 'docs', name: 'Documentation', icon: BookOpen },
    { id: 'settings', name: 'Settings', icon: Cog },
  ] },
]
const tabs = ['Code', 'Editor']
const LAYOUT_KEY = 'stutr-layout'
const other = (t) => (t === 'Code' ? 'Editor' : 'Code')
const readLayout = () => {
  try {
    const v = JSON.parse(localStorage.getItem(LAYOUT_KEY))
    if (v && ['tabs', 'row', 'col'].includes(v.mode) && tabs.includes(v.first)) return { mode: v.mode, first: v.first, ratio: Math.min(0.8, Math.max(0.2, +v.ratio || 0.5)) }
  } catch { /* ignore a missing or broken saved layout */ }
  return { mode: 'tabs', first: 'Editor', ratio: 0.5 }
}
const LayoutIcon = ({ kind }) => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    {kind === 'row' && <path d="M8 3V13" />}
    {kind === 'col' && <path d="M2 8H14" />}
  </svg>
)

export default function Dashboard() {
  usePageMeta('/app')
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const store = useMemo(() => makeStore(user), [user])
  const [tab, setTab] = useState('Editor')
  const [tool, setTool] = useState('poke')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)
  const [drawer, setDrawer] = useState(false)
  const [circuit, setCircuit] = useState(START)
  const [code, setCode] = useState(() => gen(START))
  const [err, setErr] = useState('')
  const [fitKey, setFitKey] = useState(0)
  const [layout, setLayout] = useState(readLayout)
  const [drag, setDrag] = useState(null) // the tab being dragged
  const [zone, setZone] = useState(null) // where it would land
  const space = useRef(null)
  const resizing = useRef(false)
  const split = layout.mode !== 'tabs'
  useEffect(() => { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)) } catch { /* private mode */ } }, [layout])
  const arrange = (mode, first = layout.first) => { setLayout((l) => ({ ...l, mode, first })); setFitKey((k) => k + 1) }
  const zoneAt = (e) => {
    const r = space.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
    return x < 0.28 ? 'left' : x > 0.72 ? 'right' : y < 0.28 ? 'top' : y > 0.72 ? 'bottom' : 'tabs'
  }
  const drop = (t, z) => {
    if (z === 'tabs') { setTab(t); return arrange('tabs') }
    const o = other(t)
    if (z === 'left') arrange('row', t)
    else if (z === 'right') arrange('row', o)
    else if (z === 'top') arrange('col', t)
    else arrange('col', o)
  }
  const nudge = (v) => setLayout((l) => ({ ...l, ratio: Math.min(0.8, Math.max(0.2, v)) }))
  const onResize = (e) => {
    if (!resizing.current) return
    const r = space.current.getBoundingClientRect()
    nudge(layout.mode === 'row' ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height)
  }
  const onResizeKey = (e) => {
    const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp', fwd = e.key === 'ArrowRight' || e.key === 'ArrowDown'
    if (back || fwd) { e.preventDefault(); nudge(layout.ratio + (fwd ? 0.03 : -0.03)) }
  }
  const pane = (name, node) => {
    const first = layout.first === name
    return (
      <div className="pane" style={{ display: split || tab === name ? undefined : 'none', order: first ? 0 : 2, flex: split ? `${first ? layout.ratio : 1 - layout.ratio} 1 0` : '1 1 0' }}>
        {node}
      </div>
    )
  }
  const [settings, setSettings] = useState(readLocalSettings)
  const [ready, setReady] = useState(false)
  const [note, setNote] = useState('')
  const close = () => setModal(null)

  /* ---- undo / redo: a snapshot is taken just before each change a person makes ---- */
  const hist = useRef({ past: [], future: [], last: 0 })
  const [hv, setHv] = useState({ u: 0, r: 0 })
  const sync = () => setHv({ u: hist.current.past.length, r: hist.current.future.length })
  const snapshot = () => ({ circuit, code })
  const mark = (merge) => {
    const h = hist.current, now = Date.now()
    if (merge && now - h.last < 700) { h.last = now; return } // typing: one undo step per burst
    h.last = now
    h.past.push(snapshot())
    if (h.past.length > 100) h.past.shift()
    h.future = []
    sync()
  }
  const restore = (s) => { setCircuit(s.circuit); setCode(s.code); setErr('') }
  const undo = () => {
    const h = hist.current
    if (!h.past.length) return
    h.future.push(snapshot()); restore(h.past.pop()); h.last = 0; sync()
  }
  const redo = () => {
    const h = hist.current
    if (!h.future.length) return
    h.past.push(snapshot()); restore(h.future.pop()); h.last = 0; sync()
  }
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.target.tagName === 'INPUT') return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  /* ---- editor <-> code ---- */
  const update = (fn) => {
    const next = settle(fn(circuit))
    setCircuit(next)
    setCode(gen(next))
    setErr('')
  }
  const applyCode = (text, reset) => {
    setCode(text)
    const r = parse(text, reset ? {} : Object.fromEntries(circuit.parts.map((p) => [p.id, p])))
    if (r.errs.length) return setErr(r.errs[0])
    setErr('')
    setCircuit(settle({ parts: r.parts, wires: r.wires }))
  }
  const onCode = (text) => { mark(true); applyCode(text) }
  const load = (text) => { mark(); applyCode(text, true); close(); setTab('Editor'); setFitKey((k) => k + 1) }

  /* ---- saved data: settings and the latest circuit follow the account ---- */
  useEffect(() => {
    let alive = true
    setReady(false)
    store.loadState()
      .then(({ settings: s, draft }) => {
        if (!alive) return
        if (s) setSettings(sanitize(s))
        if (draft && draft.trim()) { applyCode(draft, true); setFitKey((k) => k + 1) }
      })
      .catch(() => alive && setNote('Could not load your saved data. Working offline.'))
      .finally(() => alive && setReady(true))
    return () => { alive = false }
  }, [store])
  useEffect(() => { writeLocalSettings(settings) }, [settings])
  useEffect(() => {
    if (!ready) return
    const id = setTimeout(() => store.saveState({ settings }).catch(() => setNote('Could not save your settings.')), 800)
    return () => clearTimeout(id)
  }, [settings, ready])
  useEffect(() => {
    if (!ready || !settings.autosave) return
    const id = setTimeout(() => store.saveState({ draft: code }).catch(() => setNote('Autosave failed.')), 1500)
    return () => clearTimeout(id)
  }, [code, settings.autosave, ready])
  useEffect(() => {
    if (!note) return
    const id = setTimeout(() => setNote(''), 6000)
    return () => clearTimeout(id)
  }, [note])

  const exportCode = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }))
    a.download = 'circuit.stutr.txt'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const run = (id) => {
    setDrawer(false)
    if (id === 'create') {
      if (settings.confirmNew && circuit.parts.length && !window.confirm('Start a new circuit? You can undo this with Ctrl+Z.')) return
      return load('')
    }
    if (id === 'export') return exportCode()
    setModal(id)
  }

  return (
    <div className="DashBG">
      <aside className={`Tree${drawer ? ' open' : ''}`} aria-label="Menu">
        <button className="brand" type="button" aria-label="Stutr home" onClick={() => navigate('/')}>
          <span className="brand-logo" aria-hidden="true">S</span>
          <span className="brand-name">Stutr</span>
        </button>

        <label className="search">
          <Search size={18} aria-hidden="true" />
          <input type="text" placeholder="search" aria-label="Search the menu" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>

        {NAV.map((s) => {
          const items = s.items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))
          if (!items.length) return null
          return (
            <nav className="group" key={s.label} aria-label={s.label}>
              <p className="group-label">{s.label}</p>
              {items.map(({ id, name, icon: Icon, soon }) => (
                <button key={id} type="button" disabled={soon} title={soon ? 'Coming soon' : undefined}
                  className={`nav-item${modal === id ? ' active' : ''}`} onClick={() => run(id)}>
                  <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                  <span>{name}</span>
                  {id === 'tools' && <em className="badge">{tool}</em>}
                  {soon && <em className="badge">Soon</em>}
                </button>
              ))}
            </nav>
          )
        })}

        <div className="account">
          {user ? (
            <>
              <span className="avatar" aria-hidden="true">{String(user.user_metadata?.user_name || user.email || '?')[0].toUpperCase()}</span>
              <span className="who" title={user.email}>{user.user_metadata?.user_name || user.email}</span>
              <button type="button" onClick={async () => { await signOut(); navigate('/') }}>Sign out</button>
            </>
          ) : <Link to="/login">Sign in to sync</Link>}
        </div>
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      <main id="main" tabIndex={-1} className="Main">
        <div className="topbar">
          <button type="button" className="burger" aria-label="Open menu" aria-expanded={drawer} onClick={() => setDrawer(!drawer)}>
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className="SelectionBar" role="tablist"
            onDragOver={(e) => { if (drag) e.preventDefault() }}
            onDrop={(e) => { e.preventDefault(); if (drag) drop(drag, 'tabs'); setDrag(null); setZone(null) }}>
            {(split ? [layout.first, other(layout.first)] : tabs).map((n) => (
              <button key={n} type="button" role="tab" aria-selected={split || tab === n} draggable
                title="Click to show. Drag onto the workspace to dock it beside or above the other panel."
                className={split || tab === n ? 'active' : ''}
                onClick={() => { setTab(n); arrange('tabs') }}
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', n); e.dataTransfer.effectAllowed = 'move'; setDrag(n) }}
                onDragEnd={() => { setDrag(null); setZone(null) }}>{n}</button>
            ))}
          </div>
          <div className="layout-btns" role="group" aria-label="Panel layout">
            <button type="button" aria-pressed={layout.mode === 'tabs'} aria-label="One panel at a time" title="One panel at a time" onClick={() => arrange('tabs')}><LayoutIcon kind="tabs" /></button>
            <button type="button" aria-pressed={layout.mode === 'row'} aria-label="Side by side" title="Side by side" onClick={() => arrange('row')}><LayoutIcon kind="row" /></button>
            <button type="button" aria-pressed={layout.mode === 'col'} aria-label="Stacked" title="Stacked" onClick={() => arrange('col')}><LayoutIcon kind="col" /></button>
          </div>
          <span className="stat">{circuit.parts.length} {circuit.parts.length === 1 ? 'part' : 'parts'}</span>
        </div>
        <div ref={space} className={`workspace ${layout.mode}${drag ? ' dragging' : ''}`}
          onDragOver={(e) => { if (!drag) return; e.preventDefault(); const z = zoneAt(e); if (z !== zone) setZone(z) }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setZone(null) }}
          onDrop={(e) => { e.preventDefault(); if (drag && zone) drop(drag, zone); setDrag(null); setZone(null) }}>
          {pane('Code', <CodeEditor code={code} onChange={onCode} err={err} />)}
          {split && (
            <div className="split-handle" role="separator" tabIndex={0} aria-label="Resize panels"
              aria-orientation={layout.mode === 'row' ? 'vertical' : 'horizontal'} style={{ order: 1 }}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); resizing.current = true }}
              onPointerMove={onResize} onPointerUp={() => { resizing.current = false }} onPointerCancel={() => { resizing.current = false }}
              onKeyDown={onResizeKey} onDoubleClick={() => nudge(0.5)} />
          )}
          {pane('Editor', (
            <Circuit circuit={circuit} update={update} tool={tool} setTool={setTool} fitKey={fitKey} settings={settings}
              mark={mark} undo={undo} redo={redo} canUndo={hv.u > 0} canRedo={hv.r > 0} />
          ))}
          {drag && <div className={`drop-preview ${zone || ''}`} aria-hidden="true" />}
        </div>
      </main>

      {note && <div className="toast" role="status">{note}</div>}
      {modal === 'tools' && (
        <Modal title="Parts & tools" onClose={close}>
          <ToolPicker tool={tool} onPick={(t) => { setTool(t); close(); setTab('Editor') }} />
        </Modal>
      )}
      {modal === 'projects' && <Modal title="Projects" onClose={close}><Projects code={code} store={store} onOpen={load} /></Modal>}
      {modal === 'examples' && (
        <Modal title="Examples" onClose={close}>
          {EXAMPLES.map((x) => (
            <div className="item" key={x.name}>
              <div><strong>{x.name}</strong><small>{x.note}</small></div>
              <button type="button" className="btn" onClick={() => load(x.code)}>Open</button>
            </div>
          ))}
        </Modal>
      )}
      {modal === 'docs' && (
        <Modal title="Documentation" onClose={close}>
          <p className="empty">One line per part. Parts can refer to ones defined further down.</p>
          <pre className="docs">{DOCS}</pre>
        </Modal>
      )}
      {modal === 'settings' && (
        <Modal title="Settings" onClose={close}>
          <SettingsModal settings={settings} setSettings={setSettings} user={user} store={store} onNote={setNote}
            onSignOut={async () => { await signOut(); navigate('/') }} />
        </Modal>
      )}
    </div>
  )
}
