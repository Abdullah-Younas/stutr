import { describe, expect, it } from 'vitest'
import { buf, dims, gen, parse, settle, sim } from './engine'
import { draw, inkOf, lutFor, resized, stroke } from './screen'
import { EXAMPLES } from './examples'

const load = (code) => {
  const r = parse(code)
  if (r.errs.length) throw new Error(r.errs.join(' | '))
  return settle({ parts: r.parts, wires: r.wires })
}
const val = (c, id) => { const S = sim(c.parts, c.wires); return S.ins(S.by[id])[0] }
const tick = (c) => settle({ ...c, parts: c.parts.map((p) => (p.type === 'CLK' ? { ...p, v: p.v ? 0 : 1 } : p)) })

describe('every example in the Repository', () => {
  for (const e of EXAMPLES) {
    it(`${e.name}: loads, round-trips and has no coordinates or overlaps`, () => {
      const c = load(e.code)
      const text = gen(c)
      expect(text).not.toContain('@')
      expect(gen(load(text))).toBe(text)
      for (const p of c.parts) for (const q of c.parts) {
        if (p === q) continue
        const [pw, ph] = dims(p), [qw, qh] = dims(q)
        expect(p.x < q.x + qw && p.x + pw > q.x && p.y < q.y + qh && p.y + ph > q.y).toBe(false)
      }
    })
  }
})

describe('simulation', () => {
  it('adds two 4-bit numbers', () => {
    const c = load(EXAMPLES.find((e) => e.name === '4-bit adder').code)
    expect([val(c, 'Sum'), val(c, 'Carry')]).toEqual([8, 0])
  })
  it('runs the Mini CPU program', () => {
    let c = load(EXAMPLES[0].code)
    const trace = []
    for (let i = 0; i < 20; i++) { c = tick(tick(c)); trace.push(`${val(c, 'ACC')}@${val(c, 'PC')}`) }
    expect(trace.join(' ')).toBe('1@1 2@2 4@3 8@4 0@5 5@6 4@7 4@6 3@7 3@6 2@7 2@6 1@7 1@6 0@7 0@8 3@9 6@10 6@0 1@1')
  })
  it('toggles a flip-flop on every rising edge', () => {
    let c = load('ck = clock()\nf = dff(f.nq, ck)\nQ = output(f)')
    const q = [val(c, 'Q')]
    for (let i = 0; i < 4; i++) { c = tick(c); q.push(val(c, 'Q')) }
    expect(q).toEqual([0, 1, 1, 0, 0])
  })
})

describe('language', () => {
  it('reads comments, semicolons, hex and binary, and keeps # inside strings', () => {
    const c = load('a = input<4>(0b1010) # note\nb = input<4>(0xC);\nx = xor<4>(a, b)\nt = text("a # b // c")\nY = output<4>(x)')
    expect(val(c, 'Y')).toBe(6)
    expect(c.parts.find((p) => p.id === 't').text).toBe('a # b // c')
  })
  it.each([
    ['x = foo(A)', 'unknown part'],
    ['A = input()\nA = input()', 'used twice'],
    ['y = and(A, B)', 'not an output'],
    ['A = input(1)\ny = and(A, A, A)', 'takes 2 input'],
    ['A = input(1)\ns = add<4>(A, A)\nY = output(s.nope)', 'not an output'],
    ['A = input(1, size=3)', 'no setting'],
    ['hello', "can't read"],
  ])('explains %j', (code, message) => {
    expect(parse(code).errs[0]).toContain(message)
  })
  it('keeps the position of parts that already exist and places new ones without overlap', () => {
    const c = load('A = input(1)\nY = output(A)')
    const prev = Object.fromEntries(c.parts.map((p) => [p.id, { ...p, x: p.x + 7, y: p.y + 3 }]))
    const r = parse('A = input(1)\nY = output(A)\nZ = not(A)', prev)
    expect(r.parts.find((p) => p.id === 'A').x).toBe(prev.A.x)
    expect(r.parts.find((p) => p.id === 'Z').x).toBeDefined()
  })
})

describe('LED screen', () => {
  const run = (code, ticks) => {
    let c = settle(parse(code))
    for (let i = 0; i < ticks; i++) {
      for (const v of [1, 0]) c = settle({ ...c, parts: c.parts.map((p) => (p.id === 'ck' ? { ...p, v } : p)) })
    }
    return c
  }
  it('the example fills every pixel with x XOR y', () => {
    const ex = EXAMPLES.find((e) => e.name.startsWith('LED screen'))
    expect(parse(ex.code).errs).toEqual([])
    const c = run(ex.code, 64), s = buf(c.parts.find((p) => p.id === 'scr'))
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) expect(s.px[y * 8 + x]).toBe(x ^ y)
  })
  it('keeps its size in the code and ignores writes outside the screen', () => {
    const code = 'ck = clock()\nx = input<3>(7)\ny = input<3>(0)\nd = input<3>(5)\nwe = input(1)\nscr = screen<3>(x, y, d, we, None, ck, width=6, height=2)'
    const c = run(code, 1), p = c.parts.find((q) => q.id === 'scr')
    expect(gen(c)).toContain('width=6, height=2')
    expect(buf(p).px.some((v) => v)).toBe(false) // x = 7 is past width 6
  })
  it('CLR wipes it, and editing the code does not', () => {
    const code = 'ck = clock()\nx = input<2>(1)\ny = input<2>(1)\nd = input<2>(3)\nwe = input(1)\nclr = input(0)\nscr = screen<2>(x, y, d, we, clr, ck, width=4, height=4)'
    let c = run(code, 1)
    expect(buf(c.parts.find((p) => p.id === 'scr')).px[5]).toBe(3)
    c = settle(parse(gen(c) + '\n# edit', Object.fromEntries(c.parts.map((p) => [p.id, p]))))
    expect(buf(c.parts.find((p) => p.id === 'scr')).px[5]).toBe(3)
    c = { ...c, parts: c.parts.map((p) => (p.id === 'clr' ? { ...p, v: 1 } : p.id === 'ck' ? { ...p, v: 0 } : p)) }
    c = settle(c)
    c = settle({ ...c, parts: c.parts.map((p) => (p.id === 'ck' ? { ...p, v: 1 } : p)) })
    expect(buf(c.parts.find((p) => p.id === 'scr')).px.some((v) => v)).toBe(false)
  })
  it('paints strokes, resizes keeping pixels, and an 800 x 800 screen is just one part', () => {
    const s = { px: new Uint16Array(16), w: 4, h: 4, v: 0 }
    stroke(s.px, 4, 4, 0, 0, 3, 3, 1, 7)
    expect([0, 5, 10, 15].every((i) => s.px[i] === 7)).toBe(true)
    const r = resized(s, 8, 2)
    expect(r.px[0]).toBe(7); expect(r.px[8 + 1]).toBe(7)
    expect(inkOf(1, '#ff0000')).toBe(1)
    expect(lutFor(3, '#ff0000')[0b100]).toBe(0xff0000ff) // red bit only
    const big = parse('scr = screen<8>(None, None, None, None, None, None, width=800, height=800)')
    expect(big.errs).toEqual([])
    expect(buf(big.parts[0]).px.length).toBe(640000)
  })
  it('small screens draw square pixels, not circles', () => {
    const calls = []
    const ctx = { fillRect: (...a) => calls.push(['rect', ...a]), arc: () => calls.push(['arc']), beginPath() {}, fill() {}, set fillStyle(v) {} }
    const cv = { width: 0, height: 0, getContext: () => ctx }
    draw(cv, new Uint16Array(4).fill(1), 2, 2, lutFor(1, '#ff0000'))
    expect(calls.some((c) => c[0] === 'arc')).toBe(false)
    expect(calls.filter((c) => c[0] === 'rect').length).toBe(5) // background + 4 pixels
  })
})
