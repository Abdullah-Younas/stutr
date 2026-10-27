import './index.css'
import './dashboard.css'
import { Hand, MousePointer2, Cable, Eraser, Search, Wrench, FilePlus, Folder, GitBranch, Download, BookOpen, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

/* ================= circuit model ================= */
const N = '' // unlabeled pin
// ins / outs = pin labels. f(inputs, part) -> output bits. Clocked parts ("seq") keep their state in part.s
const def = (sym, ins, outs, f, x = {}) => ({ sym, ins, outs, f, ...x })
const gate = (sym, n, f, x) => def(sym, Array(n).fill(N), [N], (a) => [f(a)], x)
const odd = (a) => a.filter(Boolean).length % 2 === 1
const count = (a) => a.filter(Boolean).length
const flop = (sym, ins, next, outs = ['Q', '!Q'], q = (c) => [!!c.s, !c.s]) =>
  def(sym, ins, outs, null, { seq: true, clk: 1, next, q })

const DEFS = {
  IN: def('0', [], [N], (_, c) => [c.on], { toggle: true, bit: true, w: 40, h: 40 }),
  CLK: def('CK', [], [N], (_, c) => [c.on], { toggle: true, w: 40, h: 40 }),
  BTN: def('0', [], [N], (_, c) => [c.on], { bit: true, w: 40, h: 40 }),
  CONST: def('1', [], [N], () => [true], { bit: true, w: 40, h: 40 }),
  POWER: def('+V', [], [N], () => [true], { w: 40, h: 40 }),
  GND: def('GND', [], [N], () => [false], { w: 40, h: 40 }),
  OUT: def('0', [N], [], () => [], { bit: true, round: true, w: 40, h: 40 }),
  LED: def('', [N], [], () => [], { led: true, round: true, w: 40, h: 40 }),
  SEG7: def('', ['a', 'b', 'c', 'd', 'e', 'f', 'g'], [], () => [], { seg: true, w: 80 }),
  HEX: def('', ['1', '2', '4', '8'], [], () => [], { seg: true, w: 70 }),

  NOT: gate('1', 1, (a) => !a[0], { neg: true }),
  BUF: gate('1', 1, (a) => a[0]),
  AND: gate('&', 2, (a) => a[0] && a[1]),
  OR: gate('≥1', 2, (a) => a[0] || a[1]),
  NAND: gate('&', 2, (a) => !(a[0] && a[1]), { neg: true }),
  NOR: gate('≥1', 2, (a) => !(a[0] || a[1]), { neg: true }),
  XOR: gate('=1', 2, (a) => a[0] !== a[1]),
  XNOR: gate('=1', 2, (a) => a[0] === a[1], { neg: true }),
  ODD: gate('2k+1', 3, odd),
  EVEN: gate('2k', 3, (a) => !odd(a)),
  CBUF: def('EN', ['D', 'E'], [N], (a) => [a[1] && a[0]]),
  CINV: def('EN', ['D', 'E'], [N], (a) => [a[1] && !a[0]], { neg: true }),

  MUX: def('MUX', ['0', '1', 'S'], [N], (a) => [a[2] ? a[1] : a[0]]),
  DEMUX: def('DMX', ['D', 'S'], ['0', '1'], (a) => [a[0] && !a[1], a[0] && a[1]]),
  DEC: def('DEC', ['S0', 'S1'], ['0', '1', '2', '3'], (a) => [0, 1, 2, 3].map((k) => (a[0] ? 1 : 0) + (a[1] ? 2 : 0) === k)),
  PENC: def('PRI', ['0', '1', '2', '3'], ['Y0', 'Y1', 'V'], (a) => {
    const k = a.lastIndexOf(true)
    return [k >= 0 && !!(k & 1), k >= 0 && !!(k & 2), k >= 0]
  }),

  ADD: def('+', ['A', 'B', 'Ci'], ['S', 'Co'], (a) => [count(a) % 2 === 1, count(a) >= 2]),
  SUB: def('-', ['A', 'B', 'Bi'], ['D', 'Bo'], (a) => {
    const d = (a[0] ? 1 : 0) - (a[1] ? 1 : 0) - (a[2] ? 1 : 0)
    return [(d & 1) === 1, d < 0]
  }),
  CMP: def('CMP', ['A', 'B'], ['>', '=', '<'], (a) => [a[0] && !a[1], a[0] === a[1], !a[0] && a[1]]),
  BADD: def('Σ', ['0', '1', '2'], ['1s', '2s'], (a) => [(count(a) & 1) === 1, (count(a) & 2) === 2]),

  DFF: flop('D', ['D', '>'], (i) => i[0]),
  TFF: flop('T', ['T', '>'], (i, c) => (i[0] ? !c.s : !!c.s)),
  JKFF: flop('JK', ['J', '>', 'K'], (i, c) => (i[0] ? (i[2] ? !c.s : true) : i[2] ? false : !!c.s)),
  SRFF: flop('SR', ['S', '>', 'R'], (i, c) => (i[0] ? true : i[2] ? false : !!c.s)),
  REG: flop('REG', ['D', '>'], (i) => i[0], ['Q'], (c) => [!!c.s]),
  CTR: def('CTR', ['>'], ['Q0', 'Q1'], null, {
    seq: true, clk: 0,
    next: (_, c) => ((c.s || 0) + 1) % 4,
    q: (c) => [!!((c.s || 0) & 1), !!((c.s || 0) & 2)],
  }),
}

const dims = (c) => {
  const d = DEFS[c.type]
  return [d.w || 60, d.h || Math.max(60, 20 * (Math.max(d.ins.length, d.outs.length) + 1))]
}
const snap = (v) => Math.round(v / 20) * 20
const pinIn = (c, i) => [c.x, c.y + (dims(c)[1] / (DEFS[c.type].ins.length + 1)) * (i + 1)]
const pinOut = (c, k = 0) => [
  c.x + dims(c)[0] + (DEFS[c.type].neg ? 10 : 0),
  c.y + (dims(c)[1] / (DEFS[c.type].outs.length + 1)) * (k + 1),
]
const NAME = /^[A-Za-z_]\w*$/

// a part's id IS its name, so wires and code refer to the same thing
const START = {
  parts: [
    { id: 'A', type: 'IN', x: 60, y: 60, on: true },
    { id: 'B', type: 'IN', x: 60, y: 140, on: false },
    { id: 'C', type: 'IN', x: 60, y: 200, on: true },
    { id: 'g1', type: 'OR', x: 200, y: 160 },
    { id: 'g2', type: 'AND', x: 340, y: 100 },
    { id: 'Y', type: 'OUT', x: 500, y: 110 },
  ],
  wires: [
    { from: 'B', to: 'g1', pin: 0 }, { from: 'C', to: 'g1', pin: 1 },
    { from: 'A', to: 'g2', pin: 0 }, { from: 'g1', to: 'g2', pin: 1 },
    { from: 'g2', to: 'Y', pin: 0 },
  ],
}

/* ---- simulation: combinational parts are computed on demand, clocked parts read their stored state ---- */
const sim = (parts, wires) => {
  const by = Object.fromEntries(parts.map((p) => [p.id, p]))
  const memo = {}
  const ins = (c, seen) => DEFS[c.type].ins.map((_, i) => {
    const w = wires.find((w) => w.to === c.id && w.pin === i)
    return w ? !!outs(w.from, seen)[w.fp || 0] : false
  })
  const outs = (id, seen = new Set()) => {
    const c = by[id]
    if (!c) return []
    if (memo[id]) return memo[id]
    const d = DEFS[c.type]
    if (d.seq) return (memo[id] = d.q(c))
    if (seen.has(id)) return [] // combinational loop: treated as 0
    return (memo[id] = d.f(ins(c, new Set(seen).add(id)), c))
  }
  return { by, outs, ins: (c) => ins(c, new Set()) }
}

// on every change: clocked parts sample their inputs on a rising clock edge (repeat so ripple chains settle)
const settle = (circuit) => {
  let parts = circuit.parts
  for (let k = 0; k < 8; k++) {
    const sm = sim(parts, circuit.wires)
    let changed = false
    parts = parts.map((c) => {
      const d = DEFS[c.type]
      if (!d.seq) return c
      const ins = sm.ins(c)
      const clk = ins[d.clk]
      if (clk === !!c.pc) return c
      changed = true
      return clk ? { ...c, pc: clk, s: d.next(ins, c) } : { ...c, pc: clk }
    })
    if (!changed) break
  }
  return { ...circuit, parts }
}

/* ================= circuit -> code ================= */
const gen = ({ parts, wires }) =>
  parts.map((c) => {
    const d = DEFS[c.type], kw = c.type.toLowerCase(), at = ` @${c.x},${c.y}`
    const src = (i) => {
      const w = wires.find((w) => w.to === c.id && w.pin === i)
      return w ? w.from + (w.fp ? `.${w.fp}` : '') : '_'
    }
    if (d.toggle) return `${kw} ${c.id} = ${c.on ? 1 : 0}${at}`
    if (c.type === 'OUT') return `out ${c.id} = ${src(0)}${at}`
    return `${kw} ${c.id}(${d.ins.map((_, i) => src(i)).join(', ')})${at}`
  }).join('\n')

/* ================= code -> circuit ================= */
const SRC = /^(\w+)(?:\.(\d+))?$/
const parse = (text) => {
  const parts = [], wires = [], errs = [], refs = []
  const add = (p, n) => {
    if (parts.some((x) => x.id === p.id)) errs.push(`Line ${n}: name "${p.id}" is used twice`)
    else parts.push(p)
  }
  text.split('\n').forEach((raw, i) => {
    const n = i + 1
    const line = raw.replace(/\/\/.*/, '').trim()
    if (!line) return
    const at = line.match(/@\s*(-?\d+)\s*,\s*(-?\d+)\s*$/)
    const body = at ? line.slice(0, at.index).trim() : line
    const pos = at ? { x: +at[1], y: +at[2] } : {}
    let m
    if ((m = body.match(/^(in|clk)\s+(\w+)\s*=\s*([01])$/i))) {
      add({ id: m[2], type: m[1].toUpperCase(), on: m[3] === '1', ...pos }, n)
    } else if ((m = body.match(/^out\s+(\w+)\s*=\s*(\S+)$/i))) {
      add({ id: m[1], type: 'OUT', ...pos }, n)
      refs.push({ src: m[2], to: m[1], pin: 0, n })
    } else if ((m = body.match(/^(\w+)\s+(\w+)\s*\(([^)]*)\)$/)) && DEFS[m[1].toUpperCase()] && !DEFS[m[1].toUpperCase()].toggle) {
      const type = m[1].toUpperCase(), d = DEFS[type]
      const args = m[3].split(',').map((s) => s.trim()).filter(Boolean)
      if (args.length !== d.ins.length) errs.push(`Line ${n}: ${type} needs ${d.ins.length} input(s)`)
      add({ id: m[2], type, ...pos }, n)
      args.forEach((a, pin) => refs.push({ src: a, to: m[2], pin, n }))
    } else errs.push(`Line ${n}: can't read "${body}"`)
  })
  refs.forEach(({ src, to, pin, n }) => {
    if (src === '_') return
    const m = src.match(SRC)
    const s = m && parts.find((p) => p.id === m[1])
    const fp = m ? +(m[2] || 0) : 0
    if (!s || fp >= DEFS[s.type].outs.length) errs.push(`Line ${n}: "${src}" is not an output of any part`)
    else wires.push({ from: s.id, fp, to, pin })
  })
  // parts written without @x,y get placed in columns by logic depth
  const lvl = {}
  const depth = (id, seen = new Set()) => {
    if (lvl[id] != null) return lvl[id]
    const p = parts.find((x) => x.id === id)
    if (!p || !DEFS[p.type].ins.length || seen.has(id)) return 0
    const s = new Set(seen).add(id)
    return (lvl[id] = 1 + Math.max(0, ...wires.filter((w) => w.to === id).map((w) => depth(w.from, s))))
  }
  const rows = {}
  parts.forEach((p) => {
    if (p.x != null) return
    const l = depth(p.id)
    rows[l] = rows[l] || 0
    p.x = 60 + l * 140
    p.y = 60 + rows[l]++ * 100
  })
  return { parts, wires, errs }
}

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
        placeholder={'in A = 1\nin B = 0\nand g1(A, B)\nout Y = g1'}
      />
      <div className={`codebar${err ? ' err' : ''}`}>
        {err || 'Synced · in A = 1  ·  and g(A, B)  ·  out Y = g  ·  _ = empty pin  ·  @x,y optional'}
      </div>
    </div>
  )
}

/* ================= Editor tab ================= */
const HINTS = {
  poke: 'Poke: click an input or clock to flip it, hold a button to press it',
  select: 'Edit: drag parts, Delete removes the selection',
  wire: 'Wire: click an output pin, then an input pin',
  erase: 'Erase: click a part or a wire',
}
const SEGS = { a: [6, 0, 28, 6], b: [34, 6, 6, 28], c: [34, 38, 6, 28], d: [6, 66, 28, 6], e: [0, 38, 6, 28], f: [0, 6, 6, 28], g: [6, 33, 28, 6] }
const HEXMAP = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg', 'abcefg', 'cdefg', 'adef', 'bcdeg', 'adefg', 'aefg']

function Circuit({ circuit, update, tool, setTool }) {
  const { parts, wires } = circuit
  const [sel, setSel] = useState(null)
  const [pending, setPending] = useState(null)
  const drag = useRef(null)
  const held = useRef(null)
  const svg = useRef(null)
  const S = useMemo(() => sim(parts, wires), [parts, wires])
  const byId = S.by

  const point = (e) => {
    const r = svg.current.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }
  const patch = (id, o) => update((c) => ({ ...c, parts: c.parts.map((p) => (p.id === id ? { ...p, ...o } : p)) }))
  const remove = (id) => {
    update((c) => ({ parts: c.parts.filter((p) => p.id !== id), wires: c.wires.filter((w) => w.from !== id && w.to !== id) }))
    setSel(null)
  }
  const rename = (id, name) => {
    if (!NAME.test(name) || (name !== id && byId[name])) return
    update((c) => ({
      parts: c.parts.map((p) => (p.id === id ? { ...p, id: name } : p)),
      wires: c.wires.map((w) => ({ ...w, from: w.from === id ? name : w.from, to: w.to === id ? name : w.to })),
    }))
    setSel(name)
  }
  const fresh = (type) => {
    const base = type.toLowerCase()
    let i = 1
    while (byId[base + i]) i++
    return base + i
  }

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === 'Delete' && sel) remove(sel)
      if (e.key === 'Escape') { setPending(null); setTool('poke') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const release = () => {
    drag.current = null
    if (held.current) { patch(held.current, { on: false }); held.current = null }
  }
  const onCanvasDown = (e) => {
    setSel(null); setPending(null)
    if (!DEFS[tool]) return
    const [x, y] = point(e), [w, h] = dims({ type: tool })
    const id = fresh(tool)
    update((c) => ({ ...c, parts: [...c.parts, { id, type: tool, x: snap(x - w / 2), y: snap(y - h / 2), on: false }] }))
    setSel(id)
  }
  const onPartDown = (e, c) => {
    e.stopPropagation()
    if (tool === 'erase') return remove(c.id)
    if (tool === 'poke') {
      if (DEFS[c.type].toggle) return patch(c.id, { on: !c.on })
      if (c.type === 'BTN') { held.current = c.id; return patch(c.id, { on: true }) }
    }
    setSel(c.id)
    if (tool === 'select' || tool === 'poke') {
      const [x, y] = point(e)
      drag.current = { id: c.id, ox: x - c.x, oy: y - c.y }
    }
  }
  const onMove = (e) => {
    if (!drag.current) return
    const [x, y] = point(e)
    patch(drag.current.id, { x: snap(x - drag.current.ox), y: snap(y - drag.current.oy) })
  }
  const onPin = (e, c, i, k = 0) => {
    e.stopPropagation()
    if (tool !== 'wire') return
    if (i === 'out') return setPending({ id: c.id, k })
    if (!pending) return
    update((m) => ({
      ...m,
      wires: [...m.wires.filter((w) => !(w.to === c.id && w.pin === i)), { from: pending.id, fp: pending.k, to: c.id, pin: i }],
    }))
    setPending(null)
  }

  const cur = byId[sel]
  const vals = cur ? (DEFS[cur.type].outs.length ? S.outs(cur.id) : S.ins(cur)) : []

  return (
    <div className={`circuit tool-${tool}`}>
      <svg ref={svg} onPointerDown={onCanvasDown} onPointerMove={onMove} onPointerUp={release} onPointerLeave={release}>
        <defs>
          <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.14)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />

        {wires.map((w, i) => {
          const a = byId[w.from], b = byId[w.to]
          if (!a || !b) return null
          const [x1, y1] = pinOut(a, w.fp || 0), [x2, y2] = pinIn(b, w.pin), mx = (x1 + x2) / 2
          return (
            <path key={i} d={`M${x1} ${y1}H${mx}V${y2}H${x2}`} className={`wire ${S.outs(w.from)[w.fp || 0] ? 'hi' : ''}`}
              onPointerDown={(e) => { e.stopPropagation(); if (tool === 'erase') update((k) => ({ ...k, wires: k.wires.filter((_, j) => j !== i) })) }} />
          )
        })}

        {parts.map((c) => {
          const d = DEFS[c.type], [w, h] = dims(c), ins = S.ins(c), o = S.outs(c.id)
          const on = d.outs.length ? !!o[0] : !!ins[0]
          const lit = !d.seg ? '' : c.type === 'SEG7'
            ? 'abcdefg'.split('').filter((_, i) => ins[i]).join('')
            : HEXMAP[ins.reduce((n, b, i) => n + (b ? 1 << i : 0), 0)]
          return (
            <g key={c.id} transform={`translate(${c.x} ${c.y})`} onPointerDown={(e) => onPartDown(e, c)}
              className={`part ${sel === c.id ? 'sel' : ''}`}>
              <rect width={w} height={h} rx={d.round ? 20 : 6} className={d.led ? (on ? 'led' : '') : d.bit && on ? 'on' : ''} />
              {d.seg ? (
                <g transform={`translate(${(w - 40) / 2} ${(h - 72) / 2})`}>
                  {Object.entries(SEGS).map(([k, [x, y, sw, sh]]) => (
                    <rect key={k} x={x} y={y} width={sw} height={sh} rx="2" className={`seg${lit.includes(k) ? ' on' : ''}`} />
                  ))}
                </g>
              ) : (
                <text x={w / 2} y={h / 2 + 5} textAnchor="middle">{d.bit ? (on ? 1 : 0) : d.sym}</text>
              )}
              {d.neg && <circle cx={w + 5} cy={h / 2} r="5" />}
              {d.ins.map((l, i) => l && <text key={'i' + i} x="6" y={pinIn(c, i)[1] - c.y + 4} className="pl">{l}</text>)}
              {d.outs.map((l, k) => l && <text key={'o' + k} x={w - 6} y={pinOut(c, k)[1] - c.y + 4} textAnchor="end" className="pl">{l}</text>)}
              <text x={w / 2} y={-8} textAnchor="middle" className="lbl">{c.id}</text>
            </g>
          )
        })}

        {parts.map((c) => (
          <g key={'p' + c.id}>
            {DEFS[c.type].ins.map((_, i) => (
              <circle key={'i' + i} cx={pinIn(c, i)[0]} cy={pinIn(c, i)[1]} r="5" className="pin" onPointerDown={(e) => onPin(e, c, i)} />
            ))}
            {DEFS[c.type].outs.map((_, k) => (
              <circle key={'o' + k} cx={pinOut(c, k)[0]} cy={pinOut(c, k)[1]} r="5"
                className={`pin${pending?.id === c.id && pending.k === k ? ' pending' : ''}`} onPointerDown={(e) => onPin(e, c, 'out', k)} />
            ))}
          </g>
        ))}
      </svg>

      <div className="hint">{HINTS[tool] || `Click the canvas to place ${tool}`}</div>

      {cur && (
        <aside className="inspector">
          <h4>{cur.type}</h4>
          <label>Name
            <input value={cur.id} onChange={(e) => rename(cur.id, e.target.value)} />
          </label>
          <p>Position <span>{cur.x}, {cur.y}</span></p>
          <p>{DEFS[cur.type].outs.length ? 'Outputs' : 'Inputs'} <span>{vals.map(Number).join(' ') || '-'}</span></p>
          <button type="button" onClick={() => remove(cur.id)}>Delete</button>
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
    T('Poke Tool', 'poke', null, Hand), T('Edit Tool', 'select', null, MousePointer2), T('Select Tool', null, 'box'),
    T('Wiring Tool', 'wire', null, Cable), T('Erase Tool', 'erase', null, Eraser),
    T('Text Tool', null, 'Aa'), T('Menu Tool', null, 'menu'), T('Label', null, 'lbl'),
  ] },
  { label: 'Wiring', items: [
    T('Splitter', null, 'spl'), T('Pin', 'IN', 'in'), T('Probe', 'OUT', 'out'), T('Tunnel', null, 'tun'),
    T('Pull Resistor', null, 'pull'), T('Clock', 'CLK', 'CK'), T('Constant', 'CONST', '1'), T('Power', 'POWER', '+V'),
    T('Ground', 'GND', 'GND'), T('Transistor', null, 'Tr'), T('Transmission Gate', null, 'TG'), T('Bit Extender', null, 'ext'),
  ] },
  { label: 'Gates', items: [
    T('NOT Gate', 'NOT'), T('Buffer', 'BUF'), T('AND Gate', 'AND'), T('OR Gate', 'OR'), T('NAND Gate', 'NAND'), T('NOR Gate', 'NOR'),
    T('XOR Gate', 'XOR'), T('XNOR Gate', 'XNOR'), T('Odd Parity', 'ODD'), T('Even Parity', 'EVEN'),
    T('Controlled Buffer', 'CBUF'), T('Controlled Inverter', 'CINV'),
  ] },
  { label: 'Plexers', items: [
    T('Multiplexer', 'MUX'), T('Demultiplexer', 'DEMUX'), T('Decoder', 'DEC'), T('Priority Encoder', 'PENC'), T('Bit Selector', null, 'sel'),
  ] },
  { label: 'Arithmetic', items: [
    T('Adder', 'ADD'), T('Subtractor', 'SUB'), T('Multiplier', null, 'x'), T('Divider', null, '/'), T('Negator', null, '-x'),
    T('Comparator', 'CMP'), T('Shifter', null, '>>'), T('Bit Adder', 'BADD'), T('Bit Finder', null, '?'),
  ] },
  { label: 'Memory', items: [
    T('D Flip-Flop', 'DFF'), T('T Flip-Flop', 'TFF'), T('J-K Flip-Flop', 'JKFF'), T('S-R Flip-Flop', 'SRFF'),
    T('Register', 'REG'), T('Counter', 'CTR'), T('Shift Register', null, 'shr'), T('Random Generator', null, 'rnd'),
    T('RAM', null, 'RAM'), T('ROM', null, 'ROM'),
  ] },
  { label: 'Input/Output', items: [
    T('Button', 'BTN', 'btn'), T('Joystick', null, 'joy'), T('Keyboard', null, 'key'), T('LED', 'LED', 'led'),
    T('7-Segment Display', 'SEG7', '7seg'), T('Hex Digit Display', 'HEX', 'hex'), T('LED Matrix', null, 'mat'), T('TTY', null, 'tty'),
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
                  {Icon ? <Icon size={22} strokeWidth={1.5} /> : <span className="glyph">{glyph ?? DEFS[t].sym}</span>}
                  <span>{name}</span>
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

const KEY = 'stutr-projects'
const readProjects = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }

function Projects({ code, onOpen }) {
  const [list, setList] = useState(readProjects)
  const [name, setName] = useState('')
  const store = (next) => {
    setList(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage blocked or full */ }
  }
  const save = () => {
    const n = name.trim() || `Circuit ${list.length + 1}`
    store([{ name: n, code, saved: Date.now() }, ...list.filter((p) => p.name !== n)])
    setName('')
  }
  return (
    <>
      <div className="row">
        <input className="modal-search" value={name} placeholder="Name this circuit" onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()} />
        <button type="button" className="btn" onClick={save}>Save current</button>
      </div>
      {!list.length && <p className="empty">Nothing saved yet. Name the circuit above and save it.</p>}
      {list.map((p) => (
        <div className="item" key={p.name}>
          <div><strong>{p.name}</strong><small>{new Date(p.saved).toLocaleString()}</small></div>
          <button type="button" className="btn" onClick={() => onOpen(p.code)}>Open</button>
          <button type="button" className="btn ghost" onClick={() => store(list.filter((x) => x !== p))}>Delete</button>
        </div>
      ))}
    </>
  )
}

const EXAMPLES = [
  { name: 'Clock divider', note: 'Poke the clock: the flip-flop toggles on every rising edge.',
    code: ['clk ck = 0', 'dff f(f.1, ck)', 'out Q = f'].join('\n') },
  { name: '2-bit counter', note: 'Poke the clock to count 0 to 3.',
    code: ['clk ck = 0', 'ctr c(ck)', 'out Q0 = c', 'out Q1 = c.1'].join('\n') },
  { name: 'Half adder', note: 'Adds two bits: XOR is the sum, AND is the carry.',
    code: ['in A = 1', 'in B = 1', 'xor sum(A, B)', 'and carry(A, B)', 'out S = sum', 'out C = carry'].join('\n') },
  { name: 'Full adder', note: 'Adds two bits plus a carry-in.',
    code: ['in A = 1', 'in B = 0', 'in Cin = 1', 'xor x(A, B)', 'xor s(x, Cin)', 'and a1(A, B)', 'and a2(x, Cin)', 'or co(a1, a2)', 'out Sum = s', 'out Cout = co'].join('\n') },
  { name: 'XOR from NANDs', note: 'Four NAND gates behave like one XOR.',
    code: ['in A = 1', 'in B = 0', 'nand n1(A, B)', 'nand n2(A, n1)', 'nand n3(B, n1)', 'nand n4(n2, n3)', 'out Y = n4'].join('\n') },
  { name: 'Majority vote', note: 'Output is 1 when at least two inputs are 1.',
    code: ['in A = 1', 'in B = 1', 'in C = 0', 'and ab(A, B)', 'and bc(B, C)', 'and ac(A, C)', 'or t(ab, bc)', 'or m(t, ac)', 'out Y = m'].join('\n') },
]

const DOCS = [
  'in A = 1            input (clk makes a clock, same syntax)',
  'and g1(A, B)        any part: and or not xor mux add cmp dff ...',
  'add a(A, B, C)      a = first output, a.1 = second output',
  'out Y = a.1         output fed by that pin',
  'dff f(f.1, ck)      flip-flop, pin order is shown on the canvas',
  '_                   leave a pin empty',
  '@x,y                optional position (the editor adds it)',
  '// text             comment',
].join('\n')


/* ================= Dashboard ================= */
const NAV = [
  { label: 'Build', items: [
    { id: 'tools', name: 'Parts & tools', icon: Wrench },
    { id: 'create', name: 'Create', icon: FilePlus },
  ] },
  { label: 'Library', items: [
    { id: 'projects', name: 'Projects', icon: Folder },
    { id: 'repo', name: 'Repository', icon: GitBranch },
  ] },
  { label: 'Circuit', items: [{ id: 'export', name: 'Export code', icon: Download }] },
  { label: 'Support', items: [{ id: 'docs', name: 'Documentation', icon: BookOpen }] },
]
const tabs = ['Code', 'Editor']

export default function Dashboard() {
  const [tab, setTab] = useState('Editor')
  const [tool, setTool] = useState('poke')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)
  const [circuit, setCircuit] = useState(START)
  const [code, setCode] = useState(() => gen(START))
  const [err, setErr] = useState('')
  const close = () => setModal(null)

  // editor -> code: every canvas change rewrites the text
  const update = (fn) => {
    const next = settle(fn(circuit))
    setCircuit(next)
    setCode(gen(next))
    setErr('')
  }
  // code -> editor: valid text rebuilds the canvas, invalid text keeps the last good circuit
  const onCode = (text) => {
    setCode(text)
    const r = parse(text)
    if (r.errs.length) return setErr(r.errs[0])
    setErr('')
    setCircuit(settle({ parts: r.parts, wires: r.wires }))
  }
  const load = (text) => { onCode(text); close(); setTab('Editor') }

  const exportCode = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }))
    a.download = 'circuit.stutr.txt'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const run = (id) => {
    if (id === 'create') {
      if (circuit.parts.length && !window.confirm('Start a new circuit? Unsaved changes will be lost.')) return
      return load('')
    }
    if (id === 'export') return exportCode()
    setModal(id)
  }

  return (
    <div className="DashBG">
      <aside className="Tree">
        <button className="brand" type="button">
          <span className="brand-logo">S</span>
          <span className="brand-name">Stutr</span>
        </button>

        <label className="search">
          <Search size={18} />
          <input type="text" placeholder="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>

        {NAV.map((s) => {
          const items = s.items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))
          if (!items.length) return null
          return (
            <nav className="group" key={s.label}>
              <p className="group-label">{s.label}</p>
              {items.map(({ id, name, icon: Icon }) => (
                <button key={id} type="button" className={`nav-item${modal === id ? ' active' : ''}`} onClick={() => run(id)}>
                  <Icon size={20} strokeWidth={1.5} />
                  <span>{name}</span>
                  {id === 'tools' && <em className="badge">{tool}</em>}
                </button>
              ))}
            </nav>
          )
        })}
      </aside>

      <main className="Main">
        <div className="SelectionBar" role="tablist">
          {tabs.map((n) => (
            <button key={n} type="button" role="tab" aria-selected={tab === n}
              className={tab === n ? 'active' : ''} onClick={() => setTab(n)}>{n}</button>
          ))}
        </div>
        <div style={{ display: tab === 'Code' ? 'contents' : 'none' }}>
          <CodeEditor code={code} onChange={onCode} err={err} />
        </div>
        <div style={{ display: tab === 'Editor' ? 'contents' : 'none' }}>
          <Circuit circuit={circuit} update={update} tool={tool} setTool={setTool} />
        </div>
      </main>

      {modal === 'tools' && (
        <Modal title="Parts & tools" onClose={close}>
          <ToolPicker tool={tool} onPick={(t) => { setTool(t); close(); setTab('Editor') }} />
        </Modal>
      )}
      {modal === 'projects' && <Modal title="Projects" onClose={close}><Projects code={code} onOpen={load} /></Modal>}
      {modal === 'repo' && (
        <Modal title="Repository" onClose={close}>
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
    </div>
  )
}