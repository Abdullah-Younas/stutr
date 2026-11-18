# The circuit language

> The Stutr circuit language: one line per part, how to wire inputs, set bit widths and settings, use numbers and comments, and fix errors.

## The shape of a line

A circuit is a list of lines. Each line makes one part:

```text
name = part<bits>(input, input, setting=value)
```

- `name` is what you call the part.
- `part` is its type, such as `and`, `add` or `ram`. See the [parts reference](/docs/parts) for every name.
- `<bits>` is the width, 1 to 16. It is optional. You can also write `bits=4` inside the brackets.
- The things inside the brackets are its inputs, in pin order, followed by any settings.

One line per part. A `#` or `//` starts a comment that runs to the end of the line. A `;` at the end of a line is allowed and ignored. Blank lines are fine. Parts may refer to parts defined further down, so order does not matter.

```stutr
a = input(1)       # a pin that starts at 1
b = input(0)
g = and(a, b)     // an AND gate
y = output(g);
```

## Wiring inputs

Each input of a part is the name of the part whose output feeds it:

```stutr
a = input(1)
b = input(1)
g = and(a, b)   # pin 0 comes from a, pin 1 from b
```

- Leave an input unconnected with `None` or `_`. It reads as 0 (or floating, for parts that allow it). Trailing unconnected inputs can simply be left off.
- A part with several outputs uses a dot and the output's name, or square brackets and its number: `s.carry` and `s[1]` mean the same thing. Names for each part are in the parts reference.
- An output can feed any number of inputs. An input takes exactly one wire.
- A connection is checked as it is read: if you name something that is not an output of any part, you get an error on that line.

```stutr
a = input<4>(7)
b = input<4>(9)
s = add<4>(a, b)
sum = output<4>(s)       # first output: the sum
co = output(s.carry)     # second output: the carry
```

## Parts with no inputs

Pins, constants and a few others have no inputs, so the first value in the brackets is the part's own value:

```stutr
a = input(1)          # a pin set to 1
w = input<8>(0xA5)    # an 8-bit pin set to 165
k = constant<4>(9)   # a fixed value
ck = clock()          # no value needed
n = text("hello")     # a note
```

You can write numbers in decimal (`12`), hexadecimal (`0xC`) or binary (`0b1100`). Text goes in double quotes.

## Settings

Some parts have extra settings, written as `key=value` after the inputs:

```stutr
a = input<4>(1)
n = input<2>(1)
x = input<6>(0)
y = input<6>(0)
d = input<3>(5)
we = input(1)
ck = clock()

r = rom<4>(a, addr=4, data="3 a f")
sh = shift<4>(a, n, mode="rr")
sc = screen<3>(x, y, d, we, None, ck, width=64, height=64, color="#3be0ff")
```

| Setting | On which parts | What it does |
| --- | --- | --- |
| `value` | constant | The fixed number |
| `to` | bit extender, pull resistor | Extender: the output width. Pull resistor: `"0"` or `"1"` |
| `fill` | bit extender | `"zero"`, `"one"` or `"sign"` |
| `mode` | shifter | `ll`, `lr`, `ar`, `rl` or `rr` |
| `find` | bit finder | `low1`, `high1`, `low0` or `high0` |
| `stages` | shift register | How many stages |
| `addr` | RAM, ROM | Address width in bits |
| `data` | ROM | Contents as hexadecimal words separated by spaces |
| `rows` | LED matrix | Number of rows |
| `width`, `height` | LED screen | Size in pixels, 1 to 2048 each |
| `color` | LED screen | LED color as `"#rrggbb"` |
| `tag` | tunnel | Name that connects tunnels together |
| `kind` | transistor | `"n"` or `"p"` |
| `text` | text note | The words |

Every part page in the [parts reference](/docs/parts) lists exactly which settings it accepts.

## Other names for parts

A few parts have friendlier words in code. Both forms work when you type, but the editor writes the first form.

| Part | Code word | Also accepted |
| --- | --- | --- |
| Pin (input) | `input` | `in` |
| Clock | `clock` | `clk` |
| Probe (output) | `output` | `out` |
| Button | `button` | `btn` |
| Constant | `constant` | `const` |
| Ground | `ground` | `gnd` |
| Joystick | `joystick` | `joy` |
| Keyboard | `keyboard` | `keyb` |
| Splitter | `split` | `splitter` |
| Combiner | `merge` | `combiner` |
| Register | `reg` | `register` |
| Counter | `ctr` | `counter` |

## Where parts go

Code has no coordinates. A part keeps its place on the canvas as long as its name and type stay the same. New parts are placed automatically, left to right by how many steps they are from an input. Drag them wherever you like. Moving things on the canvas never changes the code.

## When something is wrong

If a line cannot be read, the Code tab shows the line number and what is wrong, and the canvas keeps the last circuit that worked. Fix the line and the canvas updates. Messages you may see:

| Message | What it means |
| --- | --- |
| `can't read "…". Write: name = part<bits>(inputs)` | The line does not have the shape `name = part(...)`. |
| `unknown part "x"` | There is no part with that word. Check the spelling against the parts reference. |
| `name "x" is used twice` | Two parts have the same name. |
| `x has no setting "y"` | That part does not accept that setting. |
| `x takes N input(s)` | You gave more inputs than the part has pins. |
| `"x" is not an output of any part` | An input refers to a name that does not exist, or to an output the part does not have. |
| `can't read the value of y` | A setting value is not a number or a quoted word. |
