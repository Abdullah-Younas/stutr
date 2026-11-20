# Stutr documentation

> Learn Stutr, the code-based circuit simulator: how it works, a five-minute start, and links to the language, editor, parts and LED screen guides.

## What Stutr is

Stutr is a digital logic circuit simulator that runs in your browser. You build a circuit in two ways that always stay in sync: type it as short lines of code, or drag parts onto a canvas and wire them together. Press Run and the circuit works live: gates switch, counters count, memory stores, and an LED screen can show pictures. It is an alternative to Logisim with a text language, and nothing needs to be installed.

These docs cover everything in the app. Read them in order, or jump to what you need:

- [The circuit language](/docs/language): how to write a circuit as code.
- [The editor](/docs/editor): tools, shortcuts, the run bar and settings.
- [Parts reference](/docs/parts): every part, with its pins, settings and an example.
- [LED screen guide](/docs/led-screen): build screens up to 2048 by 2048 and draw on them.
- [Examples](/docs/examples): ready-made circuits including a 4-bit CPU.
- [Accounts, saving and plans](/docs/account): projects, your profile and billing.

## Five-minute start

Open the editor at `/app`. You can use it without an account. The Code tab and the Editor tab show the same circuit. Paste this into the Code tab:

```stutr
# a half adder: adds two bits
a = input(1)
b = input(1)
sum = xor(a, b)
carry = and(a, b)
s = output(sum)
c = output(carry)
```

Switch to the Editor tab. You will see two inputs, an XOR gate, an AND gate and two probes, already wired. Choose the Poke tool (press `P`) and click the inputs `a` and `b` to flip them. The probe `s` shows the sum and `c` shows the carry.

Now try a clocked circuit. Add these lines, then press Run above the canvas:

```stutr
ck = clock()
n = counter<3>(ck)
out = output<3>(n)
```

The clock ticks, the counter adds one on each rising edge, and the probe counts 0 to 7 and wraps. Use the speed menu next to Run to go faster or slower. Click the clock with the Poke tool to step one edge by hand.

## Ideas to know first

### Values are numbers made of bits

Every wire carries a whole number between 0 and 2 to the power of its width minus one. A single-bit wire is 0 or 1. Widths go from 1 to 16 bits. You set a part's width with `<bits>` in code (`add<4>`) or the Data bits field in its panel. A wider wire into a narrower input loses its top bits. A narrower wire into a wider input is padded with zeros. Use the splitter, combiner and bit extender to reshape values on purpose.

### Two kinds of parts

Combinational parts (gates, adders, multiplexers and similar) always show the result of their current inputs. Clocked parts (flip-flops, registers, counters, RAM, shift registers, the keyboard, TTY and LED screen) remember something. They only look at their inputs at the moment their clock pin rises from 0 to 1, called the rising edge, and then change.

### Floating wires

A wire with nothing driving it is floating. Most parts treat a floating input as 0. The controlled buffer and inverter, transistor and transmission gate can leave their output floating on purpose, and the pull resistor and tunnel handle floating values. This lets several parts share one bus.

### Names

Every part has a name, and the name is how code and wires refer to it. Rename a part in its panel, with the Label tool, or by changing the name in the code. Names use letters, digits and underscores, cannot start with a digit, and must be unique.

### Limits

- Widths are 1 to 16 bits.
- A combinational loop (a wire feeding back into its own logic without a flip-flop) reads as floating. Use a flip-flop to build memory.
- Memory contents (RAM, registers and so on) and LED screen pixels are not saved in the circuit code.
