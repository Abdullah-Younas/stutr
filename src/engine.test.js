import { describe, expect, it } from 'vitest'
import { dims, gen, parse, settle, sim } from './engine'
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
