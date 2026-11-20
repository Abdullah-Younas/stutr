import { describe, expect, it } from 'vitest'
import { parse } from './engine'
import { netlist, verilog } from './export'

const adder = 'a = input<4>(5)\nb = input<4>(9)\ns = add<4>(a, b)\nsum = output<4>(s)\nco = output(s.carry)'

describe('exports', () => {
  it('writes a netlist with every part and every connection', () => {
    const t = netlist(parse(adder), 'adder')
    expect(t).toContain('PART a IN bits=4 value=5')
    expect(t).toContain('PART s ADD bits=4')
    expect(t).toContain('NET a.out0 width=4 -> s.A')
    expect(t).toContain('NET s.Co width=1 -> co.in0')
  })
  it('writes Verilog with ports, an adder with carry, and no leftovers', () => {
    const v = verilog(parse(adder))
    expect(v).toContain('module stutr_circuit (')
    expect(v).toContain('input wire [3:0] a')
    expect(v).toContain('output wire [0:0] co')
    expect(v).toContain('assign s__full = a__0 + b__0 + 1\'d0;')
    expect(v).toContain('assign s__1 = s__full[4];')
    expect(v).toContain('endmodule')
    expect(v).toContain('All parts in this circuit were exported')
  })
  it('turns clocked parts into always blocks and avoids Verilog keywords', () => {
    const v = verilog(parse('ck = clock()\nd = input(1)\ninput_ = input(0)\nff = dff(d, ck)\nq = output(ff.q)\nor1 = or(d, input_)\ny = output(or1)'))
    expect(v).toContain('always @(posedge ck__0[0]) ff__r <= d__0;')
    expect(v).toContain('assign ff__0 = ff__r;')
    expect(v).not.toMatch(/\binput_\b\s*=/) // ids never collide with keywords
  })
  it('exports a chip as its own module and says what it cannot export', () => {
    const lib = { half: 'a = input(0)\nb = input(0)\ns = xor(a, b)\nsum = output(s)' }
    const v = verilog(parse('x = input(1)\ny = input(0)\nu = half(x, y)\no = output(u.sum)\nh = hex(x)', {}, lib))
    expect(v).toContain('module half (')
    expect(v).toMatch(/half u_inst \(\.a\(x__0\), \.b\(y__0\), \.sum\(u__0\)\);/)
    expect(v).toContain('HEX "h" is not supported')
    expect(v).toContain('Not supported by this export (left undriven): HEX')
  })
})
