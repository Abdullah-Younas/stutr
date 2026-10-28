import './index.css'
import './dashboard.css'
import { Hand, MousePointer2, Cable, Eraser, Search, Wrench, FilePlus, Folder, GitBranch, Download, BookOpen, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

/* ================= circuit model ================= */
// Values are integers (bit buses up to 16 bits) or null = floating (Z).
// Per part: bits = data width, n = second number (rows, stages, address bits...), text = string attribute.
const N = ''
const mk = (w) => (1 << w) - 1
const lg = (n) => Math.max(1, Math.ceil(Math.log2(n)))
const pop = (v) => { let k = 0; for (; v; v >>= 1) k += v & 1; return k }
const lab = (n) => Array.from({ length: n }, (_, i) => String(i))
const sq = () => [40, 40]
const def = (sym, ins, outs, f, x = {}) => ({ sym, ins, outs, f, ...x })

const W = (c) => c.bits ?? DEFS[c.type].bits ?? 1
const NN = (c) => c.n ?? DEFS[c.type].n
const TX = (c) => c.text ?? DEFS[c.type].adef ?? ''
const INS = (c) => { const i = DEFS[c.type].ins; return typeof i === 'function' ? i(c) : i }
const OUTS = (c) => { const o = DEFS[c.type].outs; return typeof o === 'function' ? o(c) : o }
const IW = (c) => DEFS[c.type].iw?.(c) ?? INS(c).map(() => W(c))
const OW = (c) => DEFS[c.type].ow?.(c) ?? OUTS(c).map(() => W(c))
const bitDim = (c) => [Math.max(40, 12 * Math.ceil(W(c) / 4) + 20), 40]

const gate = (sym, n, f, x) => def(sym, Array(n).fill(N), [N], (a, c, m) => [f(a, m)], { bits: 1, ...x })
const flop = (sym, ins, next, outs = ['Q', '!Q'], q = (c) => [c.s || 0, ~(c.s || 0)], x = {}) =>
  def(sym, ins, outs, null, { seq: true, clk: 1, bits: 1, next, q, iw: (c) => ins.map((l) => (l === '>' ? 1 : W(c))), ...x })

const shift = (v, s, m, w, mode) => {
  const r = s % w
  if (mode === 'lr') return v >> s
  if (mode === 'ar') return (((v >> (w - 1)) & 1 ? v - (m + 1) : v) >> s) & m
  if (mode === 'rl') return ((v << r) | (v >> (w - r))) & m
  if (mode === 'rr') return ((v >> r) | (v << (w - r))) & m
  return (v << s) & m
}

const DEFS = {
  /* ---- wiring + pins ---- */
  IN: def('0', [], [N], (_, c) => [c.v || 0], { toggle: true, bit: true, bits: 1, dim: bitDim }),
  CLK: def('CK', [], [N], (_, c) => [c.v || 0], { toggle: true, dim: sq }),
  CONST: def('1', [], [N], (_, c) => [c.n ?? 1], { bit: true, bits: 1, n: 1, nlabel: 'Value', nmin: 0, nmax: 65535, dim: bitDim }),
  POWER: def('+V', [], [N], (_, c, m) => [m], { bits: 1, dim: sq }),
  GND: def('GND', [], [N], () => [0], { bits: 1, dim: sq }),
  OUT: def('0', [N], [], () => [], { bit: true, round: true, bits: 1, dim: bitDim }),
  SPLIT: def('SPL', ['In'], (c) => lab(W(c)), (a, c) => lab(W(c)).map((_, i) => (a[0] >> i) & 1),
    { bits: 4, iw: (c) => [W(c)], ow: (c) => Array(W(c)).fill(1) }),
  MERGE: def('MRG', (c) => lab(W(c)), [N], (a) => [a.reduce((v, b, i) => v | ((b & 1) << i), 0)],
    { bits: 4, iw: (c) => Array(W(c)).fill(1), ow: (c) => [W(c)] }),
  TUNNEL: def('TUN', ['In'], [N], null, { z: true, bits: 1, attr: 'Tag (same tag = connected)', adef: '', label: (c) => c.text || 'tag',
    dim: (c) => [Math.max(50, 9 * (c.text || 'tag').length + 16), 30] }),
  PULL: def('PU', ['In'], [N], (a, c, m) => [a[0] ?? (TX(c) === '0' ? 0 : m)], { z: true, bits: 1, attr: 'Pull to (0 or 1)', adef: '1' }),
  TRANS: def('Tr', ['G', 'S'], ['D'], (a, c) => [(TX(c) === 'p' ? !a[0] : !!a[0]) ? a[1] : null],
    { z: true, bits: 1, attr: 'Type (n or p)', adef: 'n', iw: (c) => [1, W(c)] }),
  TGATE: def('TG', ['A', 'G', '!G'], ['B'], (a) => [a[1] && !a[2] ? a[0] : null], { z: true, bits: 1, iw: (c) => [W(c), 1, 1] }),
  EXT: def('EXT', ['In'], [N], (a, c, m) => {
    const o = NN(c), top = mk(o) & ~m, t = TX(c)
    return [a[0] | (t === 'one' || (t === 'sign' && (a[0] >> (W(c) - 1)) & 1) ? top : 0)]
  }, { bits: 4, n: 8, nlabel: 'Output bits', attr: 'Fill (zero one sign)', adef: 'zero', iw: (c) => [W(c)], ow: (c) => [NN(c)] }),

  /* ---- gates ---- */
  NOT: gate('1', 1, (a, m) => ~a[0] & m, { neg: true }),
  BUF: gate('1', 1, (a) => a[0]),
  AND: gate('&', 2, (a) => a[0] & a[1]),
  OR: gate('≥1', 2, (a) => a[0] | a[1]),
  NAND: gate('&', 2, (a, m) => ~(a[0] & a[1]) & m, { neg: true }),
  NOR: gate('≥1', 2, (a, m) => ~(a[0] | a[1]) & m, { neg: true }),
  XOR: gate('=1', 2, (a) => a[0] ^ a[1]),
  XNOR: gate('=1', 2, (a, m) => ~(a[0] ^ a[1]) & m, { neg: true }),
  ODD: gate('2k+1', 3, (a) => a[0] ^ a[1] ^ a[2]),
  EVEN: gate('2k', 3, (a, m) => ~(a[0] ^ a[1] ^ a[2]) & m),
  CBUF: def('EN', ['D', 'E'], [N], (a) => [a[1] ? a[0] : null], { bits: 1, iw: (c) => [W(c), 1] }),
  CINV: def('EN', ['D', 'E'], [N], (a, c, m) => [a[1] ? ~a[0] & m : null], { bits: 1, neg: true, iw: (c) => [W(c), 1] }),

  /* ---- plexers ---- */
  MUX: def('MUX', ['0', '1', 'S'], [N], (a) => [a[2] ? a[1] : a[0]], { bits: 1, iw: (c) => [W(c), W(c), 1] }),
  DEMUX: def('DMX', ['D', 'S'], ['0', '1'], (a) => [a[1] ? 0 : a[0], a[1] ? a[0] : 0], { bits: 1, iw: (c) => [W(c), 1] }),
  DEC: def('DEC', ['S0', 'S1'], lab(4), (a) => [0, 1, 2, 3].map((k) => ((a[0] | (a[1] << 1)) === k ? 1 : 0))),
  PENC: def('PRI', lab(4), ['Y0', 'Y1', 'V'], (a) => {
    let k = -1
    a.forEach((v, i) => { if (v) k = i })
    return [k >= 0 && k & 1, k >= 0 && k & 2, k >= 0]
  }),
  BSEL: def('BSEL', ['In', 'Sel'], [N], (a) => [(a[0] >> a[1]) & 1], { bits: 8, iw: (c) => [W(c), lg(W(c))], ow: () => [1] }),

  /* ---- arithmetic ---- */
  ADD: def('+', ['A', 'B', 'Ci'], ['S', 'Co'], (a, c, m) => { const t = a[0] + a[1] + a[2]; return [t & m, t > m ? 1 : 0] },
    { bits: 4, iw: (c) => [W(c), W(c), 1], ow: (c) => [W(c), 1] }),
  SUB: def('-', ['A', 'B', 'Bi'], ['D', 'Bo'], (a, c, m) => { const d = a[0] - a[1] - a[2]; return [d & m, d < 0 ? 1 : 0] },
    { bits: 4, iw: (c) => [W(c), W(c), 1], ow: (c) => [W(c), 1] }),
  MUL: def('x', ['A', 'B', 'Ci'], ['P', 'Co'], (a, c, m) => { const p = a[0] * a[1] + a[2]; return [p & m, Math.floor(p / (m + 1)) & m] }, { bits: 4 }),
  DIV: def('/', ['A', 'B', 'Up'], ['Q', 'R'], (a, c, m) => {
    const d = a[2] * (m + 1) + a[0]
    return a[1] ? [Math.floor(d / a[1]) & m, d % a[1]] : [m, 0]
  }, { bits: 4 }),
  NEG: def('-x', ['In'], [N], (a, c, m) => [-a[0] & m], { bits: 4 }),
  CMP: def('CMP', ['A', 'B'], ['>', '=', '<'], (a) => [a[0] > a[1], a[0] === a[1], a[0] < a[1]], { bits: 4, iw: (c) => [W(c), W(c)], ow: () => [1, 1, 1] }),
  SHIFT: def('SH', ['In', 'Sh'], [N], (a, c, m) => [shift(a[0], a[1], m, W(c), TX(c))],
    { bits: 4, attr: 'Mode (ll lr ar rl rr)', adef: 'll', iw: (c) => [W(c), lg(W(c))] }),
  BADD: def('Σ', lab(3), ['N'], (a) => [a.reduce((k, v) => k + pop(v), 0)], { bits: 1, ow: (c) => [Math.ceil(Math.log2(3 * W(c) + 1))] }),
  BFIND: def('FND', ['In'], ['Idx', 'P'], (a, c) => {
    const t = TX(c), want = t.endsWith('0') ? 0 : 1
    const hits = lab(W(c)).map(Number).filter((i) => ((a[0] >> i) & 1) === want)
    return [hits.length ? (t.startsWith('high') ? hits[hits.length - 1] : hits[0]) : 0, hits.length ? 1 : 0]
  }, { bits: 4, attr: 'Find (low1 high1 low0 high0)', adef: 'low1', ow: (c) => [lg(W(c)), 1] }),

  /* ---- memory ---- */
  DFF: flop('D', ['D', '>'], (i) => i[0]),
  TFF: flop('T', ['T', '>'], (i, c) => (c.s || 0) ^ i[0]),
  JKFF: flop('JK', ['J', '>', 'K'], (i, c) => (i[0] & ~(c.s || 0)) | (~i[2] & (c.s || 0))),
  SRFF: flop('SR', ['S', '>', 'R'], (i, c) => i[0] | (~i[2] & (c.s || 0))),
  REG: flop('REG', ['D', '>'], (i) => i[0], ['Q'], (c) => [c.s || 0], { bits: 4 }),
  CTR: def('CTR', ['>'], ['Q'], null, { seq: true, clk: 0, bits: 2, iw: () => [1], next: (_, c, m) => ((c.s || 0) + 1) & m, q: (c) => [c.s || 0] }),
  SHREG: def('SHR', ['In', '>'], [N], null, {
    seq: true, clk: 1, bits: 4, n: 4, nlabel: 'Stages', iw: (c) => [W(c), 1],
    next: (i, c) => [i[0], ...(c.s || [])].slice(0, NN(c)), q: (c) => [(c.s || [])[NN(c) - 1] ?? 0],
  }),
  RND: def('RND', ['>'], [N], null, {
    seq: true, clk: 0, bits: 4, iw: () => [1],
    next: (_, c) => (Math.imul(c.s || 1, 1664525) + 1013904223) >>> 0, q: (c) => [(c.s || 0) >>> 8],
  }),
  RAM: def('RAM', ['A', 'D', 'WE', '>'], ['Q'], null, {
    seq: true, rd: true, clk: 3, bits: 4, n: 4, nlabel: 'Address bits', iw: (c) => [NN(c), W(c), 1, 1],
    next: (i, c) => (i[2] ? { ...(c.s || {}), [i[0]]: i[1] } : c.s), q: (c, i) => [(c.s || {})[i[0]] || 0],
  }),
  ROM: def('ROM', ['A'], ['D'], (a, c) => [parseInt(TX(c).trim().split(/\s+/)[a[0]] || '0', 16) || 0],
    { bits: 4, n: 4, nlabel: 'Address bits', attr: 'Contents (hex words)', adef: '', iw: (c) => [NN(c)] }),

  /* ---- input / output ---- */
  BTN: def('0', [], [N], (_, c) => [c.v || 0], { bit: true, dim: sq }),
  JOY: def('', [], ['X', 'Y'], (_, c, m) => [c.vx ?? (m + 1) >> 1, c.vy ?? (m + 1) >> 1], { bits: 4, dim: () => [80, 80] }),
  KEYB: def('', ['>'], ['Ch', 'Av'], null, {
    seq: true, clk: 0, iw: () => [1], ow: () => [7, 1], dim: () => [110, 60],
    next: (_, c) => (c.s || '').slice(1), q: (c) => [(c.s || '').charCodeAt(0) || 0, c.s ? 1 : 0],
  }),
  LED: def('', [N], [], () => [], { led: true, round: true, dim: sq }),
  SEG7: def('', ['a', 'b', 'c', 'd', 'e', 'f', 'g'], [], () => [], { seg: true, dim: () => [80, 160] }),
  HEX: def('', ['D'], [], () => [], { seg: true, iw: () => [4], dim: () => [70, 100] }),
  MATRIX: def('', ['C', 'R'], [], () => [], {
    bits: 5, n: 7, blabel: 'Columns', nlabel: 'Rows', iw: (c) => [W(c), NN(c)], dim: (c) => [W(c) * 12 + 24, NN(c) * 12 + 24],
  }),
  TTY: def('', ['D', '>'], [], null, {
    seq: true, clk: 1, iw: () => [7, 1], dim: () => [140, 90], q: () => [],
    next: (i, c) => {
      const s = c.s || '', ch = i[0]
      return ch === 8 ? s.slice(0, -1) : ch === 13 || ch === 10 ? s + '\n' : ch >= 32 ? s + String.fromCharCode(ch) : s
    },
  }),
  TEXT: def('', [], [], () => [], { note: true, attr: 'Text', adef: 'text', dim: (c) => [Math.max(40, 9 * TX(c).length + 16), 30] }),
}

const dims = (c) => {
  const d = DEFS[c.type]
  return d.dim ? d.dim(c) : [60, Math.max(60, 20 * (Math.max(INS(c).length, OUTS(c).length) + 1))]
}
const snap = (v) => Math.round(v / 20) * 20
const pinIn = (c, i) => [c.x, c.y + (dims(c)[1] / (INS(c).length + 1)) * (i + 1)]
const pinOut = (c, k = 0) => [c.x + dims(c)[0] + (DEFS[c.type].neg ? 10 : 0), c.y + (dims(c)[1] / (OUTS(c).length + 1)) * (k + 1)]
const NAME = /^[A-Za-z_]\w*$/

// a part's id IS its name, so wires and code refer to the same thing
const START = {
  parts: [
    { id: 'A', type: 'IN', x: 60, y: 60, v: 1 },
    { id: 'B', type: 'IN', x: 60, y: 140, v: 0 },
    { id: 'C', type: 'IN', x: 60, y: 200, v: 1 },
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
  const ins = (c, seen) => {
    const iw = IW(c), z = DEFS[c.type].z
    return INS(c).map((_, i) => {
      const w = wires.find((w) => w.to === c.id && w.pin === i)
      const v = w ? outs(w.from, seen)[w.fp || 0] : null
      return v == null ? (z ? null : 0) : v & mk(iw[i])
    })
  }
  const outs = (id, seen = new Set()) => {
    const c = by[id]
    if (!c) return []
    if (memo[id]) return memo[id]
    const d = DEFS[c.type]
    if (seen.has(id) && !(d.seq && !d.rd)) return [] // combinational loop: treated as floating
    const s = new Set(seen).add(id)
    let r
    if (c.type === 'TUNNEL') {
      const tag = c.text || c.id
      const drv = [c, ...parts].find((p) => p.type === 'TUNNEL' && (p.text || p.id) === tag && wires.some((w) => w.to === p.id))
      r = [drv ? ins(drv, s)[0] : null]
    } else if (d.seq) r = d.rd ? d.q(c, ins(c, s)) : d.q(c)
    else r = d.f(ins(c, s), c, mk(W(c)))
    const ow = OW(c)
    return (memo[id] = r.map((v, k) => (v == null ? null : +v & mk(ow[k] ?? 1))))
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
      const clk = !!ins[d.clk]
      if (clk === !!c.pc) return c
      changed = true
      return clk ? { ...c, pc: clk, s: d.next(ins, c, mk(W(c))) } : { ...c, pc: clk }
    })
    if (!changed) break
  }
  return { ...circuit, parts }
}

/* ================= circuit -> code ================= */
const gen = ({ parts, wires }) =>
  parts.map((c) => {
    const d = DEFS[c.type], kw = c.type.toLowerCase()
    const src = (i) => {
      const w = wires.find((w) => w.to === c.id && w.pin === i)
      return w ? w.from + (w.fp ? `.${w.fp}` : '') : '_'
    }
    const tail = (c.text ? ' ' + JSON.stringify(c.text) : '')
      + (c.bits != null || c.n != null ? ` #${c.bits ?? ''}${c.n != null ? ':' + c.n : ''}` : '')
      + ` @${c.x},${c.y}`
    if (d.toggle) return `${kw} ${c.id} = ${c.v || 0}${tail}`
    if (c.type === 'OUT') return `out ${c.id} = ${src(0)}${tail}`
    return `${kw} ${c.id}(${INS(c).map((_, i) => src(i)).join(', ')})${tail}`
  }).join('\n')

/* ================= code -> circuit ================= */
const SRC = /^(\w+)(?:\.(\d+))?$/
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const parse = (text) => {
  const parts = [], wires = [], errs = [], refs = []
  const add = (p, n) => {
    if (parts.some((x) => x.id === p.id)) errs.push(`Line ${n}: name "${p.id}" is used twice`)
    else parts.push(p)
  }
  text.split('\n').forEach((raw, i) => {
    const n = i + 1
    const line = raw.replace(/("(?:[^"\\]|\\.)*")|\/\/.*/g, (m, q) => q || '').trim() // drop // comments, keep quoted text
    if (!line) return
    const at = line.match(/@\s*(-?\d+)\s*,\s*(-?\d+)\s*$/)
    let body = at ? line.slice(0, at.index).trim() : line
    const ex = at ? { x: +at[1], y: +at[2] } : {} // position + attributes
    const bt = body.match(/#(\d*)(?::(\d+))?$/)
    if (bt) {
      body = body.slice(0, bt.index).trim()
      if (bt[1]) ex.bits = clamp(+bt[1], 1, 16)
      if (bt[2]) ex.n = clamp(+bt[2], 0, 65535)
    }
    const tx = body.match(/"((?:[^"\\]|\\.)*)"$/)
    if (tx) {
      body = body.slice(0, tx.index).trim()
      try { ex.text = JSON.parse(`"${tx[1]}"`) } catch { errs.push(`Line ${n}: bad text`) }
    }
    let m
    if ((m = body.match(/^(in|clk)\s+(\w+)\s*=\s*(\d+)$/i))) {
      add({ id: m[2], type: m[1].toUpperCase(), v: +m[3], ...ex }, n)
    } else if ((m = body.match(/^out\s+(\w+)\s*=\s*(\S+)$/i))) {
      add({ id: m[1], type: 'OUT', ...ex }, n)
      refs.push({ src: m[2], to: m[1], pin: 0, n })
    } else if ((m = body.match(/^(\w+)\s+(\w+)\s*\(([^)]*)\)$/)) && DEFS[m[1].toUpperCase()] && !DEFS[m[1].toUpperCase()].toggle) {
      const type = m[1].toUpperCase(), p = { id: m[2], type, ...ex }
      const args = m[3].split(',').map((s) => s.trim()).filter(Boolean)
      if (args.length !== INS(p).length) errs.push(`Line ${n}: ${type} needs ${INS(p).length} input(s)`)
      add(p, n)
      args.forEach((a, pin) => refs.push({ src: a, to: m[2], pin, n }))
    } else errs.push(`Line ${n}: can't read "${body}"`)
  })
  refs.forEach(({ src, to, pin, n }) => {
    if (src === '_') return
    const m = src.match(SRC)
    const s = m && parts.find((p) => p.id === m[1])
    const fp = m ? +(m[2] || 0) : 0
    if (!s || fp >= OUTS(s).length) errs.push(`Line ${n}: "${src}" is not an output of any part`)
    else wires.push({ from: s.id, fp, to, pin })
  })
  // parts written without @x,y get placed in columns by logic depth
  const lvl = {}
  const depth = (id, seen = new Set()) => {
    if (lvl[id] != null) return lvl[id]
    const p = parts.find((x) => x.id === id)
    if (!p || !INS(p).length || seen.has(id)) return 0
    const s = new Set(seen).add(id)
    return (lvl[id] = 1 + Math.max(0, ...wires.filter((w) => w.to === id).map((w) => depth(w.from, s))))
  }
  const rows = {}
  parts.forEach((p) => {
    if (p.x != null) return
    const l = depth(p.id)
    rows[l] = rows[l] || 0
    p.x = 60 + l * 160
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
  poke: 'Poke: click an input or clock, hold a button, drag a joystick, click a keyboard then type',
  select: 'Edit: drag parts, Delete removes the selection',
  box: 'Select: drag a box around parts, then move them together or press Delete',
  wire: 'Wire: click an output pin, then an input pin',
  erase: 'Erase: click a part or a wire',
  menu: 'Menu: click a part for Duplicate and Delete',
  label: 'Label: click a part, then type its new name in the panel',
}
const SEGS = { a: [6, 0, 28, 6], b: [34, 6, 6, 28], c: [34, 38, 6, 28], d: [6, 66, 28, 6], e: [0, 38, 6, 28], f: [0, 6, 6, 28], g: [6, 33, 28, 6] }
const HEXMAP = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg', 'abcefg', 'cdefg', 'adef', 'bcdeg', 'adefg', 'aefg']

// the drawing inside a part's box
const body = (c, d, w, h, ins, v) => {
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
  return <text x={w / 2} y={h / 2 + 5} textAnchor="middle">{t}</text>
}

function Circuit({ circuit, update, tool, setTool }) {
  const { parts, wires } = circuit
  const [sels, setSels] = useState([])
  const [pending, setPending] = useState(null)
  const [band, setBand] = useState(null)
  const [menu, setMenu] = useState(null)
  const drag = useRef(null)
  const held = useRef(null)
  const svg = useRef(null)
  const nameRef = useRef(null)
  const S = useMemo(() => sim(parts, wires), [parts, wires])
  const byId = S.by
  const cur = sels.length === 1 ? byId[sels[0]] : null
  const cd = cur && DEFS[cur.type]

  const point = (e) => {
    const r = svg.current.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }
  const patch = (id, o) => update((c) => ({ ...c, parts: c.parts.map((p) => (p.id === id ? { ...p, ...o } : p)) }))
  const removeMany = (ids) => {
    update((c) => ({ parts: c.parts.filter((p) => !ids.includes(p.id)), wires: c.wires.filter((w) => !ids.includes(w.from) && !ids.includes(w.to)) }))
    setSels([])
  }
  const rename = (id, name) => {
    if (!NAME.test(name) || (name !== id && byId[name])) return
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
      if (e.key === 'Delete' && sels.length) removeMany(sels)
      else if (e.key === 'Escape') { setPending(null); setMenu(null); setTool('poke') }
      else if (cur?.type === 'KEYB' && !e.ctrlKey && !e.metaKey && (e.key.length === 1 || e.key === 'Enter')) {
        e.preventDefault()
        patch(cur.id, { s: (cur.s || '') + (e.key === 'Enter' ? '\n' : e.key) })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  useEffect(() => { if (tool === 'label' && cur) nameRef.current?.focus() }, [tool, sels])

  const onCanvasDown = (e) => {
    setMenu(null); setPending(null)
    const [x, y] = point(e)
    if (DEFS[tool]) {
      const d = DEFS[tool], [w, h] = dims({ type: tool }), id = fresh(tool)
      update((c) => ({ ...c, parts: [...c.parts, { id, type: tool, x: snap(x - w / 2), y: snap(y - h / 2), ...(d.adef !== undefined && { text: d.adef }) }] }))
      return setSels([id])
    }
    setSels([])
    if (tool === 'box') setBand({ x0: x, y0: y, x1: x, y1: y })
  }
  const onPartDown = (e, c) => {
    e.stopPropagation()
    setMenu(null)
    const d = DEFS[c.type], [x, y] = point(e)
    if (tool === 'erase') return removeMany([c.id])
    if (tool === 'menu') return setMenu({ id: c.id, x, y })
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
    const [x, y] = point(e)
    if (held.current?.joy) return joy(e, byId[held.current.id])
    if (band) return setBand({ ...band, x1: x, y1: y })
    if (!drag.current) return
    const { x: sx, y: sy, orig } = drag.current
    update((c) => ({
      ...c,
      parts: c.parts.map((p) => (orig[p.id] ? { ...p, x: snap(orig[p.id].x + x - sx), y: snap(orig[p.id].y + y - sy) } : p)),
    }))
  }
  const release = () => {
    if (band) {
      const [x0, x1] = [band.x0, band.x1].sort((a, b) => a - b), [y0, y1] = [band.y0, band.y1].sort((a, b) => a - b)
      setSels(parts.filter((p) => { const [w, h] = dims(p); return p.x < x1 && p.x + w > x0 && p.y < y1 && p.y + h > y0 }).map((p) => p.id))
      setBand(null)
    }
    drag.current = null
    const h = held.current
    if (h) { patch(h.id, h.joy ? { vx: undefined, vy: undefined } : { v: 0 }); held.current = null }
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
  const num = (key, lo, hi) => (e) => patch(cur.id, { [key]: clamp(+e.target.value || lo, lo, hi) })
  const vals = cur ? (OUTS(cur).length ? S.outs(cur.id) : S.ins(cur)) : []

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
          const cls = `wire${S.outs(w.from)[w.fp || 0] ? ' hi' : ''}${(OW(a)[w.fp || 0] || 1) > 1 ? ' bus' : ''}`
          return (
            <path key={i} d={`M${x1} ${y1}H${mx}V${y2}H${x2}`} className={cls}
              onPointerDown={(e) => { e.stopPropagation(); if (tool === 'erase') update((k) => ({ ...k, wires: k.wires.filter((_, j) => j !== i) })) }} />
          )
        })}

        {parts.map((c) => {
          const d = DEFS[c.type], [w, h] = dims(c), ins = S.ins(c), o = S.outs(c.id)
          const v = OUTS(c).length ? o[0] : ins[0]
          return (
            <g key={c.id} transform={`translate(${c.x} ${c.y})`} onPointerDown={(e) => onPartDown(e, c)}
              className={`part ${sels.includes(c.id) ? 'sel' : ''}`}>
              <rect width={w} height={h} rx={d.round ? 20 : 6}
                className={d.note ? 'note' : d.led ? (v ? 'led' : '') : d.bit && v ? 'on' : ''} />
              {body(c, d, w, h, ins, v)}
              {d.neg && <circle cx={w + 5} cy={h / 2} r="5" />}
              {INS(c).map((l, i) => l && <text key={'i' + i} x="6" y={pinIn(c, i)[1] - c.y + 4} className="pl">{l}</text>)}
              {OUTS(c).map((l, k) => l && <text key={'o' + k} x={w - 6} y={pinOut(c, k)[1] - c.y + 4} textAnchor="end" className="pl">{l}</text>)}
              {!d.note && <text x={w / 2} y={-8} textAnchor="middle" className="lbl">{c.id}</text>}
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
                className={`pin${pending?.id === c.id && pending.k === k ? ' pending' : ''}`} onPointerDown={(e) => onPin(e, c, 'out', k)} />
            ))}
          </g>
        ))}

        {band && (
          <rect className="band" x={Math.min(band.x0, band.x1)} y={Math.min(band.y0, band.y1)}
            width={Math.abs(band.x1 - band.x0)} height={Math.abs(band.y1 - band.y0)} />
        )}
      </svg>

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
              <input value={TX(cur)} onChange={(e) => patch(cur.id, { text: e.target.value })} />
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
    T('Wiring Tool', 'wire', null, Cable), T('Erase Tool', 'erase', null, Eraser),
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
  { name: '4-bit adder', note: 'Buses: change the bit width of any part in the panel.',
    code: ['in A = 5 #4', 'in B = 3 #4', 'in Ci = 0', 'add s(A, B, Ci) #4', 'out Sum = s #4', 'out Cout = s.1'].join('\n') },
  { name: 'RAM write and read', note: 'Set WE to 1, poke the clock to store D at address A.',
    code: ['in A = 2 #3', 'in D = 9 #4', 'in WE = 1', 'clk ck = 0', 'ram r(A, D, WE, ck) #4:3', 'out Q = r #4'].join('\n') },
  { name: 'Clock divider', note: 'Poke the clock: the flip-flop toggles on every rising edge.',
    code: ['clk ck = 0', 'dff f(f.1, ck)', 'out Q = f'].join('\n') },
  { name: '2-bit counter', note: 'Poke the clock to count 0 to 3.',
    code: ['clk ck = 0', 'ctr c(ck)', 'out Q = c #2'].join('\n') },
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
  'in A = 5 #4         input; #4 = 4-bit bus (clk makes a clock)',
  'and g1(A, B)        any part: and or not xor mux add shift ram ...',
  'add a(A, B, C) #4   a = first output, a.1 = second output',
  'ram r(A, D, W, K) #4:3   #bits:n  (n = address bits, rows, stages...)',
  'rom r(A) "1 2 f"    quoted text = attribute (hex words, mode, tag)',
  'out Y = a.1         output fed by that pin',
  'split s(A) #4       bus to bits s, s.1, s.2 ...   merge m(a,b,c,d)',
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