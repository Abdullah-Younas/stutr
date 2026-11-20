// Exports a circuit as a plain-text netlist or as Verilog. Pure functions, no browser needed.
import { DEFS, INS, OUTS, OW, TX, W, NN } from './engine.js'

const iws = (c) => DEFS[c.type].iw?.(c) ?? INS(c).map(() => W(c))
const pin = (list, k, fallback) => (list[k] && list[k] !== '>' ? list[k] : list[k] === '>' ? 'clock' : `${fallback}${k}`)
const ownWires = (wires, id) => wires.filter((w) => w.to === id)

/* ---------- netlist: parts, then every connection ---------- */
export const netlist = ({ parts, wires }, title = 'circuit') => {
  const byId = Object.fromEntries(parts.map((p) => [p.id, p]))
  const out = [`# Stutr netlist: ${title}`, '# PART <name> <type> [settings]', '# NET <driver.pin> width=<bits> -> <sink.pin>, ...', '']
  for (const c of parts) {
    if (c.type === 'TEXT') continue
    const bits = DEFS[c.type].bits !== undefined || c.type === 'CHIP' ? ` bits=${c.type === 'CHIP' ? 1 : W(c)}` : ''
    const extra = c.type === 'CHIP' ? ` chip=${c.chip.name}` : DEFS[c.type].n !== undefined ? ` ${DEFS[c.type].nlabel?.toLowerCase().replace(/\W+/g, '_') || 'n'}=${NN(c)}` : ''
    out.push(`PART ${c.id} ${c.type}${bits}${extra}${c.type === 'IN' || c.type === 'CLK' ? ` value=${c.v ?? 0}` : ''}`)
  }
  out.push('')
  const groups = new Map()
  for (const w of wires) {
    const key = `${w.from}\t${w.fp || 0}`
    groups.set(key, [...(groups.get(key) || []), w])
  }
  for (const [key, list] of groups) {
    const [from, fp] = key.split('\t'), src = byId[from]
    if (!src) continue
    const sinks = list.map((w) => `${w.to}.${pin(INS(byId[w.to]), w.pin, 'in')}`).join(', ')
    out.push(`NET ${from}.${pin(OUTS(src), +fp, 'out')} width=${OW(src)[+fp] ?? 1} -> ${sinks}`)
  }
  return out.join('\n') + '\n'
}

/* ---------- Verilog ---------- */
const KW = new Set('always and assign begin buf case default else end endcase endmodule for if initial input inout integer module nand nor not or output parameter reg supply0 supply1 wire xnor xor while real time tri wand wor'.split(' '))
const vid = (id) => (KW.has(id) ? `${id}_` : id)
const rng = (w) => `[${Math.max(1, w) - 1}:0]`

function moduleText(name, parts, wires, chips) {
  const byId = Object.fromEntries(parts.map((p) => [p.id, p]))
  const L = [], decl = [], body = [], ports = [], notes = new Set()
  const net = (c, k) => `${vid(c.id)}__${k}`
  const src = (c, k) => {
    const w = ownWires(wires, c.id).find((x) => x.pin === k), width = iws(c)[k] ?? 1
    const from = w && byId[w.from]
    return from && from.type !== 'TEXT' ? net(from, w.fp || 0) : `${width}'d0`
  }
  for (const c of parts) {
    if (c.type === 'TEXT') continue
    const t = c.type, w = W(c), ins = (k) => src(c, k), o = (k = 0) => net(c, k), id = vid(c.id)
    OUTS(c).forEach((_, k) => decl.push(`  wire ${rng(OW(c)[k] ?? 1)} ${o(k)};`))
    const A = (e) => body.push(`  assign ${o()} = ${e};`)
    const clk = (k) => ins(k) + '[0]'
    const regs = (init = 0) => { decl.push(`  reg ${rng(w)} ${id}__r;`); body.push(`  initial ${id}__r = ${init};`) }
    switch (t) {
      case 'IN': case 'BTN': case 'CLK': ports.push(`  input wire ${rng(w)} ${id}`); A(id); break
      case 'OUT': case 'LED': ports.push(`  output wire ${rng(iws(c)[0])} ${id}`); body.push(`  assign ${id} = ${ins(0)};`); break
      case 'CONST': A(`${w}'d${(c.n ?? 1) & ((1 << w) - 1)}`); break
      case 'POWER': A(`{${w}{1'b1}}`); break
      case 'GND': A(`${w}'d0`); break
      case 'NOT': A(`~${ins(0)}`); break
      case 'BUF': A(ins(0)); break
      case 'AND': A(`${ins(0)} & ${ins(1)}`); break
      case 'OR': A(`${ins(0)} | ${ins(1)}`); break
      case 'NAND': A(`~(${ins(0)} & ${ins(1)})`); break
      case 'NOR': A(`~(${ins(0)} | ${ins(1)})`); break
      case 'XOR': A(`${ins(0)} ^ ${ins(1)}`); break
      case 'XNOR': A(`~(${ins(0)} ^ ${ins(1)})`); break
      case 'ODD': A(`${ins(0)} ^ ${ins(1)} ^ ${ins(2)}`); break
      case 'EVEN': A(`~(${ins(0)} ^ ${ins(1)} ^ ${ins(2)})`); break
      case 'MUX': A(`${ins(2)} ? ${ins(1)} : ${ins(0)}`); break
      case 'NEG': A(`-${ins(0)}`); break
      case 'ADD': case 'SUB': {
        decl.push(`  wire ${rng(w + 1)} ${id}__full;`)
        body.push(`  assign ${id}__full = ${ins(0)} ${t === 'ADD' ? '+' : '-'} ${ins(1)} ${t === 'ADD' ? '+' : '-'} ${ins(2)};`, `  assign ${o(0)} = ${id}__full[${w - 1}:0];`, `  assign ${o(1)} = ${id}__full[${w}];`)
        break
      }
      case 'MUL':
        decl.push(`  wire ${rng(2 * w)} ${id}__full;`)
        body.push(`  assign ${id}__full = ${ins(0)} * ${ins(1)} + ${ins(2)};`, `  assign ${o(0)} = ${id}__full[${w - 1}:0];`, `  assign ${o(1)} = ${id}__full[${2 * w - 1}:${w}];`)
        break
      case 'CMP': body.push(`  assign ${o(0)} = ${ins(0)} > ${ins(1)};`, `  assign ${o(1)} = ${ins(0)} == ${ins(1)};`, `  assign ${o(2)} = ${ins(0)} < ${ins(1)};`); break
      case 'SHIFT': {
        const m = c.text || 'll', a = ins(0), n = ins(1)
        A(m === 'll' ? `${a} << ${n}` : m === 'lr' ? `${a} >> ${n}` : m === 'ar' ? `$signed(${a}) >>> ${n}` : m === 'rl' ? `(${a} << ${n}) | (${a} >> (${w} - ${n}))` : `(${a} >> ${n}) | (${a} << (${w} - ${n}))`)
        break
      }
      case 'SPLIT': OUTS(c).forEach((_, k) => body.push(`  assign ${o(k)} = ${ins(0)}[${k}];`)); break
      case 'MERGE': A(`{${INS(c).map((_, k) => ins(k)).reverse().join(', ')}}`); break
      case 'EXT': {
        const to = c.n ?? 8, fill = c.text || 'zero', inw = iws(c)[0]
        A(to <= inw ? ins(0) : `{${fill === 'sign' ? `{${to - inw}{${ins(0)}[${inw - 1}]}}` : `{${to - inw}{1'b${fill === 'one' ? 1 : 0}}}`}, ${ins(0)}}`)
        break
      }
      case 'DFF': regs(); body.push(`  always @(posedge ${clk(1)}) ${id}__r <= ${ins(0)};`, `  assign ${o(0)} = ${id}__r;`, `  assign ${o(1)} = ~${id}__r;`); break
      case 'REG': regs(); body.push(`  always @(posedge ${clk(1)}) ${id}__r <= ${ins(0)};`, `  assign ${o(0)} = ${id}__r;`); break
      case 'TFF': regs(); body.push(`  always @(posedge ${clk(1)}) if (${ins(0)}[0]) ${id}__r <= ~${id}__r;`, `  assign ${o(0)} = ${id}__r;`, `  assign ${o(1)} = ~${id}__r;`); break
      case 'CTR': regs(); body.push(`  always @(posedge ${clk(0)}) ${id}__r <= ${id}__r + 1;`, `  assign ${o(0)} = ${id}__r;`); break
      case 'CHIP': {
        chips.set(c.chip.name, c.chip)
        const conns = [...c.chip.ins.map((p, k) => `.${vid(p)}(${ins(k)})`), ...c.chip.outs.map((p, k) => `.${vid(p)}(${o(k)})`)]
        body.push(`  ${c.chip.name} ${id}_inst (${conns.join(', ')});`)
        break
      }
      default: notes.add(t); body.push(`  // ${t} "${c.id}" is not supported by this export: its outputs are left undriven`)
    }
  }
  L.push(`module ${name} (`, ports.join(',\n'), ');', ...decl, ...body, 'endmodule')
  return { text: L.join('\n'), unsupported: notes }
}

export const verilog = ({ parts, wires }, name = 'stutr_circuit') => {
  const chips = new Map(), done = new Set(), mods = []
  const top = moduleText(name, parts, wires, chips)
  const unsupported = new Set(top.unsupported)
  for (let more = true; more;) { // chips may use other chips
    more = false
    for (const [n, def] of [...chips]) {
      if (done.has(n)) continue
      done.add(n); more = true
      const m = moduleText(n, def.parts, def.wires, chips)
      m.unsupported.forEach((u) => unsupported.add(u))
      mods.push(m.text)
    }
  }
  const head = ['// Generated by Stutr. Review before use.', unsupported.size ? `// Not supported by this export (left undriven): ${[...unsupported].join(', ')}` : '// All parts in this circuit were exported.'].join('\n')
  return [head, ...mods.reverse(), top.text].join('\n\n') + '\n'
}
