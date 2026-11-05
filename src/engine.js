/* ================= circuit model ================= */
// Values are integers (bit buses up to 16 bits) or null = floating (Z).
// Per part: bits = data width, n = second number (rows, stages, address bits...), text = string attribute.
export const N = ''
export const mk = (w) => (1 << w) - 1
export const lg = (n) => Math.max(1, Math.ceil(Math.log2(n)))
export const pop = (v) => { let k = 0; for (; v; v >>= 1) k += v & 1; return k }
export const lab = (n) => Array.from({ length: n }, (_, i) => String(i))
export const sq = () => [40, 40]
export const def = (sym, ins, outs, f, x = {}) => ({ sym, ins, outs, f, ...x })

export const W = (c) => c.bits ?? DEFS[c.type].bits ?? 1
export const NN = (c) => c.n ?? DEFS[c.type].n
export const TX = (c) => c.text ?? DEFS[c.type].adef ?? ''
export const INS = (c) => { const i = DEFS[c.type].ins; return typeof i === 'function' ? i(c) : i }
export const OUTS = (c) => { const o = DEFS[c.type].outs; return typeof o === 'function' ? o(c) : o }
export const IW = (c) => DEFS[c.type].iw?.(c) ?? INS(c).map(() => W(c))
export const OW = (c) => DEFS[c.type].ow?.(c) ?? OUTS(c).map(() => W(c))
export const bitDim = (c) => [Math.max(40, 12 * Math.ceil(W(c) / 4) + 20), 40]

export const gate = (sym, n, f, x) => def(sym, Array(n).fill(N), [N], (a, c, m) => [f(a, m)], { bits: 1, ...x })
export const flop = (sym, ins, next, outs = ['Q', '!Q'], q = (c) => [c.s || 0, ~(c.s || 0)], x = {}) =>
  def(sym, ins, outs, null, { seq: true, clk: 1, bits: 1, next, q, iw: (c) => ins.map((l) => (l === '>' ? 1 : W(c))), ...x })

export const shift = (v, s, m, w, mode) => {
  const r = s % w
  if (mode === 'lr') return v >> s
  if (mode === 'ar') return (((v >> (w - 1)) & 1 ? v - (m + 1) : v) >> s) & m
  if (mode === 'rl') return ((v << r) | (v >> (w - r))) & m
  if (mode === 'rr') return ((v >> r) | (v << (w - r))) & m
  return (v << s) & m
}

export const DEFS = {
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
  SUB: def('−', ['A', 'B', 'Bi'], ['D', 'Bo'], (a, c, m) => { const d = a[0] - a[1] - a[2]; return [d & m, d < 0 ? 1 : 0] },
    { bits: 4, iw: (c) => [W(c), W(c), 1], ow: (c) => [W(c), 1] }),
  MUL: def('×', ['A', 'B', 'Ci'], ['P', 'Co'], (a, c, m) => { const p = a[0] * a[1] + a[2]; return [p & m, Math.floor(p / (m + 1)) & m] }, { bits: 4 }),
  DIV: def('÷', ['A', 'B', 'Up'], ['Q', 'R'], (a, c, m) => {
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

export const dims = (c) => {
  const d = DEFS[c.type]
  return d.dim ? d.dim(c) : [60, Math.max(60, 20 * (Math.max(INS(c).length, OUTS(c).length) + 1))]
}
export const snap = (v) => Math.round(v / 20) * 20
export const pinIn = (c, i) => [c.x, c.y + (dims(c)[1] / (INS(c).length + 1)) * (i + 1)]
export const pinOut = (c, k = 0) => [c.x + dims(c)[0] + (DEFS[c.type].neg ? 10 : 0), c.y + (dims(c)[1] / (OUTS(c).length + 1)) * (k + 1)]
export const NAME = /^[A-Za-z_]\w*$/

// a part's id IS its name, so wires and code refer to the same thing
export const START = {
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
export const sim = (parts, wires) => {
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
export const settle = (circuit) => {
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

/* ================= the language ================= */
// name = part<bits>(input, input, setting=value)      one line per part, # or // comments, optional ;
export const META = {
  ADD: { names: ['sum', 'carry'] }, SUB: { names: ['diff', 'borrow'] }, MUL: { names: ['product', 'carry'] },
  DIV: { names: ['quotient', 'remainder'] }, CMP: { names: ['gt', 'eq', 'lt'] },
  DEMUX: { names: ['out0', 'out1'] }, DEC: { names: ['out0', 'out1', 'out2', 'out3'] }, PENC: { names: ['y0', 'y1', 'valid'] },
  BFIND: { names: ['index', 'found'], akey: 'find' }, JOY: { names: ['x', 'y'] }, KEYB: { names: ['char', 'ready'] },
  DFF: { names: ['q', 'nq'] }, TFF: { names: ['q', 'nq'] }, JKFF: { names: ['q', 'nq'] }, SRFF: { names: ['q', 'nq'] },
  CONST: { nkey: 'value' }, EXT: { nkey: 'to', akey: 'fill' }, SHIFT: { akey: 'mode' }, SHREG: { nkey: 'stages' },
  RAM: { nkey: 'addr' }, ROM: { nkey: 'addr', akey: 'data' }, MATRIX: { nkey: 'rows' },
  TUNNEL: { akey: 'tag' }, PULL: { akey: 'to' }, TRANS: { akey: 'kind' }, TEXT: { akey: 'text' },
}
export const M = (t) => META[t] || {}
export const PREF = { IN: 'input', CLK: 'clock', OUT: 'output', BTN: 'button', CONST: 'constant', GND: 'ground', JOY: 'joystick', KEYB: 'keyboard' }
export const ALIAS = { ...Object.fromEntries(Object.entries(PREF).map(([t, k]) => [k, t])), splitter: 'SPLIT', combiner: 'MERGE', register: 'REG', counter: 'CTR' }
export const typeOf = (w) => ALIAS[w.toLowerCase()] ?? (DEFS[w.toUpperCase()] ? w.toUpperCase() : null)
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/* ================= circuit -> code ================= */
export const gen = ({ parts, wires }) =>
  parts.map((c) => {
    const me = M(c.type), ins = INS(c)
    const refs = ins.map((_, i) => {
      const w = wires.find((w) => w.to === c.id && w.pin === i)
      const s = w && parts.find((p) => p.id === w.from)
      if (!s) return 'None'
      const nm = M(s.type).names?.[w.fp || 0]
      return w.from + (w.fp ? (nm ? `.${nm}` : `[${w.fp}]`) : '')
    })
    while (refs.length && refs[refs.length - 1] === 'None') refs.pop()
    if (!ins.length) {
      if (DEFS[c.type].toggle) refs.push(String(c.v || 0))
      else if (c.type === 'CONST') refs.push(String(c.n ?? 1))
      else if (c.type === 'TEXT') refs.push(JSON.stringify(TX(c)))
    }
    if (c.n != null && me.nkey && c.type !== 'CONST') refs.push(`${me.nkey}=${c.n}`)
    if (c.text && me.akey && ins.length) refs.push(`${me.akey}=${JSON.stringify(c.text)}`)
    return `${c.id} = ${PREF[c.type] ?? c.type.toLowerCase()}${c.bits != null ? `<${c.bits}>` : ''}(${refs.join(', ')})`
  }).join('\n')

/* ================= code -> circuit ================= */
export const splitArgs = (str) => {
  const out = []
  let cur = '', q = false, esc = false
  for (const ch of str) {
    if (q) { cur += ch; if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') q = false; continue }
    if (ch === '"') { q = true; cur += ch } else if (ch === ',') { out.push(cur.trim()); cur = '' } else cur += ch
  }
  if (cur.trim() || out.length) out.push(cur.trim())
  return out
}
export const lit = (s) => {
  if (s.startsWith('"')) { try { return JSON.parse(s) } catch { return undefined } }
  return /^-?(0x[\da-f]+|0b[01]+|\d+)$/i.test(s) ? Number(s) : undefined
}

export const parse = (text, prev = {}) => {
  const parts = [], wires = [], errs = [], refs = []
  text.split('\n').forEach((raw, i) => {
    const n = i + 1
    const line = raw.replace(/("(?:[^"\\]|\\.)*")|(?:#|\/\/).*/g, (m, q) => q || '').trim().replace(/;$/, '').trim()
    if (!line) return
    const m = line.match(/^([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\s*(?:<\s*(\d+)\s*>)?\s*\(([\s\S]*)\)$/)
    if (!m) return errs.push(`Line ${n}: can't read "${line}". Write: name = part<bits>(inputs)`)
    const type = typeOf(m[2])
    if (!type) return errs.push(`Line ${n}: unknown part "${m[2]}"`)
    if (parts.some((p) => p.id === m[1])) return errs.push(`Line ${n}: name "${m[1]}" is used twice`)
    const p = { id: m[1], type }, me = M(type), pos = []
    if (m[3]) p.bits = clamp(+m[3], 1, 16)
    for (const a of splitArgs(m[4])) {
      const kw = a.match(/^([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/)
      if (!kw) { pos.push(a); continue }
      const v = lit(kw[2])
      if (v === undefined) errs.push(`Line ${n}: can't read the value of ${kw[1]}`)
      else if (kw[1] === 'bits' && typeof v === 'number') p.bits = clamp(v, 1, 16)
      else if (kw[1] === me.nkey && typeof v === 'number') p.n = clamp(v, 0, 65535)
      else if (kw[1] === me.akey) p.text = String(v)
      else errs.push(`Line ${n}: ${m[2]} has no setting "${kw[1]}"`)
    }
    const ins = INS(p)
    if (!ins.length) {
      const v = lit(pos[0] ?? '')
      if (typeof v === 'number') { if (DEFS[type].toggle) p.v = v; else if (type === 'CONST') p.n = clamp(v, 0, 65535) }
      else if (typeof v === 'string') p.text = v
    } else {
      if (pos.length > ins.length) errs.push(`Line ${n}: ${m[2]} takes ${ins.length} input(s)`)
      pos.forEach((a, pin) => { if (a !== 'None' && a !== '_') refs.push({ src: a, to: p.id, pin, n }) })
    }
    parts.push(p)
  })
  refs.forEach(({ src, to, pin, n }) => {
    const m = src.match(/^([A-Za-z_]\w*)(?:\.([A-Za-z_]\w*)|\[(\d+)\])?$/)
    const s = m && parts.find((p) => p.id === m[1])
    const fp = !m ? -1 : m[3] != null ? +m[3] : m[2] ? (M(s?.type).names || []).indexOf(m[2]) : 0
    if (!s || fp < 0 || fp >= OUTS(s).length) errs.push(`Line ${n}: "${src}" is not an output of any part`)
    else wires.push({ from: s.id, fp, to, pin })
  })
  // no coordinates in the code: a part keeps its old spot (same name and type), new parts are placed by logic depth
  const lvl = {}
  const depth = (id, seen = new Set()) => {
    if (lvl[id] != null) return lvl[id]
    const p = parts.find((x) => x.id === id)
    if (!p || !INS(p).length || seen.has(id)) return 0
    const s = new Set(seen).add(id)
    return (lvl[id] = 1 + Math.max(0, ...wires.filter((w) => w.to === id).map((w) => depth(w.from, s))))
  }
  parts.forEach((p) => {
    const o = prev[p.id]
    if (o && o.type === p.type) { p.x = o.x; p.y = o.y }
  })
  const clash = (p) => parts.some((q) => {
    if (q === p || q.x == null) return false
    const [pw, ph] = dims(p), [qw, qh] = dims(q)
    return p.x < q.x + qw + 40 && p.x + pw + 40 > q.x && p.y < q.y + qh + 30 && p.y + ph + 30 > q.y
  })
  parts.forEach((p) => {
    if (p.x != null) return
    p.x = 60 + depth(p.id) * 140
    p.y = 60
    while (clash(p)) p.y += 20
  })
  return { parts, wires, errs }
}

