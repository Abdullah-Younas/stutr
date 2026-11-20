// The Stutr documentation as plain data. One source feeds the web pages, the static HTML for crawlers,
// the markdown copies and llms.txt, so they can never disagree. Parts facts are read from the engine itself.
import { ALIAS, DEFS, INS, M, NN, OUTS, PREF, SMAX, TX, W } from '../engine.js'
import { EXAMPLES } from '../examples.js'
import { CATEGORIES, PARTS } from './parts.js'
import { PAGE_META, pageUrl } from './pages-meta.js'

const p = (x) => ({ t: 'p', x })
const h = (x) => ({ t: 'h', x })
const code = (x, lang = 'stutr') => ({ t: 'code', x, lang })
const list = (...items) => ({ t: 'list', items })
const table = (head, rows) => ({ t: 'table', head, rows })
const note = (x) => ({ t: 'note', x })
const S = (id, title, ...blocks) => ({ id, title, blocks })
const L = (...lines) => lines.join('\n')

/* ---- facts about one part, read from the engine ---- */
const names = (labels) => (labels.length === 0 ? 'none' : labels.every((l) => l === '') ? `${labels.length} unlabeled` : labels.map((l) => l || '(unlabeled)').join(', '))
export const partFacts = (type) => {
  const d = DEFS[type], c = { type }, me = M(type)
  const codeName = PREF[type] ?? type.toLowerCase()
  const aliases = Object.entries(ALIAS).filter(([, t]) => t === type).map(([k]) => k).filter((k) => k !== codeName)
  if (PREF[type]) aliases.push(type.toLowerCase())
  const inputs = type === 'MERGE' ? 'one 1-bit input per bit of the width (0 is the lowest)' : names(INS(c))
  const outputs = type === 'SPLIT' ? 'one 1-bit output per bit of the width (0 is the lowest)' : names(OUTS(c))
  const outNames = me.names ? `Refer to outputs as ${me.names.map((n) => '`.' + n + '`').join(', ')} or by number in square brackets.` : ''
  const settings = []
  if (d.bits !== undefined) settings.push(`\`bits\` (also written \`<bits>\`): ${d.blabel || 'data width'}, 1 to 16, default ${W(c)}`)
  if (me.nkey) settings.push(`\`${me.nkey}\`: ${d.nlabel}, default ${type === 'CONST' ? 1 : NN(c)}${type === 'SCREEN' ? `, 1 to ${SMAX}` : ''}`)
  if (me.n2key) settings.push(`\`${me.n2key}\`: ${d.n2label}, default ${DEFS[type].n2}, 1 to ${SMAX}`)
  if (me.akey) settings.push(`\`${me.akey}\`: ${d.attr}${TX(c) !== '' ? `, default "${TX(c)}"` : ''}`)
  return {
    type, name: PARTS[type][1], category: PARTS[type][0], desc: PARTS[type][2], example: PARTS[type][3],
    codeName, aliases, inputs, outputs, outNames,
    width: d.bits !== undefined ? String(W(c)) : '', settings,
    clocked: !!d.seq && type !== 'KEYB',
  }
}
export const ALL_PARTS = Object.keys(DEFS).filter((t) => t !== 'CHIP').map(partFacts) // a chip is made by you, so it has its own guide section

const partBlocks = () => CATEGORIES.map((cat) => {
  const items = ALL_PARTS.filter((f) => f.category === cat)
  return S('parts-' + cat.toLowerCase().replace(/\W+/g, '-'), cat, ...items.map((f) => ({ t: 'part', f })))
})

/* ---- pages ---- */
const RAW = [
  {
    slug: '',
    sections: [
      S('what', 'What Stutr is',
        p('Stutr is a digital logic circuit simulator that runs in your browser. You build a circuit in two ways that always stay in sync: type it as short lines of code, or drag parts onto a canvas and wire them together. Press Run and the circuit works live: gates switch, counters count, memory stores, and an LED screen can show pictures. It is an alternative to Logisim with a text language, and nothing needs to be installed.'),
        p('These docs cover everything in the app. Read them in order, or jump to what you need:'),
        list('[The circuit language](/docs/language): how to write a circuit as code.', '[The editor](/docs/editor): tools, shortcuts, the run bar and settings.', '[Parts reference](/docs/parts): every part, with its pins, settings and an example.', '[LED screen guide](/docs/led-screen): build screens up to 2048 by 2048 and draw on them.', '[Examples](/docs/examples): ready-made circuits including a 4-bit CPU.', '[Accounts, saving and plans](/docs/account): projects, your profile and billing.')),
      S('quick-start', 'Five-minute start',
        p('Open the editor at `/app`. You can use it without an account. The Code tab and the Editor tab show the same circuit. Paste this into the Code tab:'),
        code(L('# a half adder: adds two bits', 'a = input(1)', 'b = input(1)', 'sum = xor(a, b)', 'carry = and(a, b)', 's = output(sum)', 'c = output(carry)')),
        p('Switch to the Editor tab. You will see two inputs, an XOR gate, an AND gate and two probes, already wired. Choose the Poke tool (press `P`) and click the inputs `a` and `b` to flip them. The probe `s` shows the sum and `c` shows the carry.'),
        p('Now try a clocked circuit. Add these lines, then press Run above the canvas:'),
        code(L('ck = clock()', 'n = counter<3>(ck)', 'out = output<3>(n)')),
        p('The clock ticks, the counter adds one on each rising edge, and the probe counts 0 to 7 and wraps. Use the speed menu next to Run to go faster or slower. Click the clock with the Poke tool to step one edge by hand.')),
      S('ideas', 'Ideas to know first',
        h('Values are numbers made of bits'),
        p('Every wire carries a whole number between 0 and 2 to the power of its width minus one. A single-bit wire is 0 or 1. Widths go from 1 to 16 bits. You set a part\'s width with `<bits>` in code (`add<4>`) or the Data bits field in its panel. A wider wire into a narrower input loses its top bits. A narrower wire into a wider input is padded with zeros. Use the splitter, combiner and bit extender to reshape values on purpose.'),
        h('Two kinds of parts'),
        p('Combinational parts (gates, adders, multiplexers and similar) always show the result of their current inputs. Clocked parts (flip-flops, registers, counters, RAM, shift registers, the keyboard, TTY and LED screen) remember something. They only look at their inputs at the moment their clock pin rises from 0 to 1, called the rising edge, and then change.'),
        h('Floating wires'),
        p('A wire with nothing driving it is floating. Most parts treat a floating input as 0. The controlled buffer and inverter, transistor and transmission gate can leave their output floating on purpose, and the pull resistor and tunnel handle floating values. This lets several parts share one bus.'),
        h('Names'),
        p('Every part has a name, and the name is how code and wires refer to it. Rename a part in its panel, with the Label tool, or by changing the name in the code. Names use letters, digits and underscores, cannot start with a digit, and must be unique.'),
        h('Limits'),
        list('Widths are 1 to 16 bits.', 'A combinational loop (a wire feeding back into its own logic without a flip-flop) reads as floating. Use a flip-flop to build memory.', 'Memory contents (RAM, registers and so on) and LED screen pixels are not saved in the circuit code.')),
    ],
  },
  {
    slug: 'language',
    sections: [
      S('shape', 'The shape of a line',
        p('A circuit is a list of lines. Each line makes one part:'),
        code('name = part<bits>(input, input, setting=value)', 'text'),
        list('`name` is what you call the part.', '`part` is its type, such as `and`, `add` or `ram`. See the [parts reference](/docs/parts) for every name.', '`<bits>` is the width, 1 to 16. It is optional. You can also write `bits=4` inside the brackets.', 'The things inside the brackets are its inputs, in pin order, followed by any settings.'),
        p('One line per part. A `#` or `//` starts a comment that runs to the end of the line. A `;` at the end of a line is allowed and ignored. Blank lines are fine. Parts may refer to parts defined further down, so order does not matter.'),
        code(L('a = input(1)       # a pin that starts at 1', 'b = input(0)', 'g = and(a, b)     // an AND gate', 'y = output(g);')),
      ),
      S('wiring', 'Wiring inputs',
        p('Each input of a part is the name of the part whose output feeds it:'),
        code(L('a = input(1)', 'b = input(1)', 'g = and(a, b)   # pin 0 comes from a, pin 1 from b')),
        list('Leave an input unconnected with `None` or `_`. It reads as 0 (or floating, for parts that allow it). Trailing unconnected inputs can simply be left off.', 'A part with several outputs uses a dot and the output\'s name, or square brackets and its number: `s.carry` and `s[1]` mean the same thing. Names for each part are in the parts reference.', 'An output can feed any number of inputs. An input takes exactly one wire.', 'A connection is checked as it is read: if you name something that is not an output of any part, you get an error on that line.'),
        code(L('a = input<4>(7)', 'b = input<4>(9)', 's = add<4>(a, b)', 'sum = output<4>(s)       # first output: the sum', 'co = output(s.carry)     # second output: the carry')),
      ),
      S('sources', 'Parts with no inputs',
        p('Pins, constants and a few others have no inputs, so the first value in the brackets is the part\'s own value:'),
        code(L('a = input(1)          # a pin set to 1', 'w = input<8>(0xA5)    # an 8-bit pin set to 165', 'k = constant<4>(9)   # a fixed value', 'ck = clock()          # no value needed', 'n = text("hello")     # a note')),
        p('You can write numbers in decimal (`12`), hexadecimal (`0xC`) or binary (`0b1100`). Text goes in double quotes.')),
      S('settings', 'Settings',
        p('Some parts have extra settings, written as `key=value` after the inputs:'),
        code(L('a = input<4>(1)', 'n = input<2>(1)', 'x = input<6>(0)', 'y = input<6>(0)', 'd = input<3>(5)', 'we = input(1)', 'ck = clock()', '', 'r = rom<4>(a, addr=4, data="3 a f")', 'sh = shift<4>(a, n, mode="rr")', 'sc = screen<3>(x, y, d, we, None, ck, width=64, height=64, color="#3be0ff")')),
        table(['Setting', 'On which parts', 'What it does'], [
          ['`value`', 'constant', 'The fixed number'], ['`to`', 'bit extender, pull resistor', 'Extender: the output width. Pull resistor: `"0"` or `"1"`'], ['`fill`', 'bit extender', '`"zero"`, `"one"` or `"sign"`'],
          ['`mode`', 'shifter', '`ll`, `lr`, `ar`, `rl` or `rr`'], ['`find`', 'bit finder', '`low1`, `high1`, `low0` or `high0`'], ['`stages`', 'shift register', 'How many stages'],
          ['`addr`', 'RAM, ROM', 'Address width in bits'], ['`data`', 'ROM', 'Contents as hexadecimal words separated by spaces'], ['`rows`', 'LED matrix', 'Number of rows'],
          ['`width`, `height`', 'LED screen', `Size in pixels, 1 to ${SMAX} each`], ['`color`', 'LED screen', 'LED color as `"#rrggbb"`'], ['`tag`', 'tunnel', 'Name that connects tunnels together'],
          ['`kind`', 'transistor', '`"n"` or `"p"`'], ['`text`', 'text note', 'The words'],
        ]),
        p('Every part page in the [parts reference](/docs/parts) lists exactly which settings it accepts.')),
      S('aliases', 'Other names for parts',
        p('A few parts have friendlier words in code. Both forms work when you type, but the editor writes the first form.'),
        table(['Part', 'Code word', 'Also accepted'], Object.entries(PREF).map(([t, k]) => [PARTS[t][1], '`' + k + '`', '`' + t.toLowerCase() + '`']).concat([['Splitter', '`split`', '`splitter`'], ['Combiner', '`merge`', '`combiner`'], ['Register', '`reg`', '`register`'], ['Counter', '`ctr`', '`counter`']]))),
      S('chips', 'Using a saved circuit as a part',
        p('Any circuit you have saved in Projects can be used as a part in another circuit. Its name becomes the word you write, spelled in lowercase with underscores (a project called "Half Adder" is `half_adder`). The input and output pins inside it become the part\'s pins, in the order they appear in its code, and the pins use the names you gave them.'),
        code(L('# half_adder is a saved circuit with inputs a, b and outputs sum, carry', 'x = input(1)', 'y = input(1)', 'u = half_adder(x, y)', 's = output(u.sum)', 'c = output(u.carry)'), 'text'),
        list('Refer to a chip\'s outputs by the names of its output pins: `u.sum` and `u.carry`, or by number.', 'A chip keeps its own memory: a counter or flip-flop inside it holds its value between clock edges.', 'A chip can contain other chips, but never itself.', 'Inside a chip, use an input pin for the clock, not a clock part, so the outer circuit controls the timing.', 'Using chips as parts is part of the Pro plan. Circuits that already use them still open and run on any plan.')),
      S('layout', 'Where parts go',
        p('Code has no coordinates. A part keeps its place on the canvas as long as its name and type stay the same. New parts are placed automatically, left to right by how many steps they are from an input. Drag them wherever you like. Moving things on the canvas never changes the code.')),
      S('errors', 'When something is wrong',
        p('If a line cannot be read, the Code tab shows the line number and what is wrong, and the canvas keeps the last circuit that worked. Fix the line and the canvas updates. Messages you may see:'),
        table(['Message', 'What it means'], [
          ['`can\'t read "…". Write: name = part<bits>(inputs)`', 'The line does not have the shape `name = part(...)`.'],
          ['`unknown part "x"`', 'There is no part with that word. Check the spelling against the parts reference.'],
          ['`name "x" is used twice`', 'Two parts have the same name.'],
          ['`x has no setting "y"`', 'That part does not accept that setting.'],
          ['`x takes N input(s)`', 'You gave more inputs than the part has pins.'],
          ['`"x" is not an output of any part`', 'An input refers to a name that does not exist, or to an output the part does not have.'],
          ['`can\'t read the value of y`', 'A setting value is not a number or a quoted word.'],
        ])),
    ],
  },
  {
    slug: 'editor',
    sections: [
      S('layout', 'The workspace',
        p('The editor has two views of one circuit: **Code** (the text) and **Editor** (the canvas). Use the buttons in the top bar to show one at a time as tabs, or side by side in a row or a column. In side-by-side mode, drag the divider to resize. Your choice is remembered.'),
        p('The menu on the left holds your projects, parts, examples, export, documentation and settings. On a phone or tablet it opens from the menu button.')),
      S('runbar', 'The run bar',
        table(['Control', 'What it does'], [
          ['Run / Pause', 'Starts and stops every clock in the circuit. It needs at least one clock part.'],
          ['Speed menu', 'How fast the clock runs: 1, 2, 5, 10, 20, 50 or 100 Hz.'],
          ['Fit view', 'Zooms and pans so the whole circuit is visible.'],
          ['− and +', 'Zoom out and in.'],
          ['Undo / Redo', 'Step back or forward through your edits.'],
        ])),
      S('tools', 'Tools',
        p('Pick a tool from the Parts and tools panel, or press its key. The hint at the bottom of the canvas always tells you what the current tool does.'),
        table(['Tool', 'Key', 'What it does'], [
          ['Poke', '`P`', 'Use the circuit. Click an input or clock to change it, hold a button, drag a joystick. Drag from one pin to another to draw a wire. Parts can still be dragged.'],
          ['Edit', '`E`', 'Drag parts to move them. `Delete` removes the selection.'],
          ['Select', '`S`', 'Drag a box around several parts, then move them together or delete them.'],
          ['Erase', '`X`', 'Click a part or a wire to remove it.'],
          ['Text', '`T`', 'Click the canvas to place a text note.'],
          ['Menu', '`M`', 'Click a part for a small menu with Duplicate and Delete.'],
          ['Label', '`L`', 'Click a part, then type its new name in the panel.'],
        ]),
        p('To place any part, pick it from the Parts and tools panel and click the canvas. It stays selected so you can place several. Press `Esc` to go back to Poke.')),
      S('wires', 'Wires',
        list('Drag from an output pin to an input pin (or the other way round) with the Poke tool.', 'An input takes one wire. Connecting a second wire to the same input replaces the first.', 'An output can feed many inputs. A filled dot marks an output that feeds more than one wire.', 'Wires glow and show a moving pulse when they carry a non-zero value. Thick wires are buses (more than 1 bit).', 'To remove a wire, hold `D` and click it, or use the Erase tool.', 'Settings let you choose right-angle or straight wires.')),
      S('panel', 'The part panel',
        p('Click a part (Edit or Poke tool) to open its panel on the right. It shows:'),
        list('**Name**: edit it to rename the part everywhere.', '**Data bits**: the width, 1 to 16.', 'Part-specific fields such as Address bits, Rows, Stages, Contents, Mode or Color.', '**Position** and the part\'s **current outputs** (or inputs), in hexadecimal. `Z` means floating.', 'A **Delete** button. The LED screen also has **Open screen**.'),
        p('Select several parts with the Select tool and the panel offers Delete all.')),
      S('shortcuts', 'Keyboard and mouse',
        table(['Input', 'Action'], [
          ['`P` `E` `S` `X`', 'Poke, Edit, Select, Erase'], ['`T` `M` `L`', 'Text, Menu, Label'], ['Hold `D`', 'Erase while held: click a wire or part'], ['`Delete`', 'Remove the selection'], ['`Esc`', 'Back to Poke'],
          ['`Ctrl+Z`', 'Undo'], ['`Ctrl+Y` or `Ctrl+Shift+Z`', 'Redo'], ['Mouse wheel', 'Zoom'], ['Drag empty space', 'Pan'], ['Two fingers (touch)', 'Pinch to zoom and drag to pan'],
        ])),
      S('chips', 'Your circuits as parts',
        p('Save a circuit in Projects, then open Parts and tools and look under My circuits. Pick one and click the canvas to place it as a single part. Its input and output pins become the part\'s pins. Change the saved circuit and open the other circuit again to use the new version. See [the language guide](/docs/language) for how chips look in code.'),
        p('Using your circuits as parts is part of the Pro plan.')),
      S('history', 'Version history',
        p('Every time you save a project with changes, Stutr keeps that version. The last 20 versions of each project are kept. In Projects press History next to a project, then Open this version to load an earlier one. Save again to make it the current version. Version history is part of the Pro plan.')),
      S('export', 'Exporting',
        table(['Export', 'What you get', 'Plan'], [
          ['Circuit code', 'The circuit as text (`circuit.stutr.txt`).', 'Free'],
          ['Picture (PNG)', 'An image of the whole canvas, for reports and slides.', 'Pro'],
          ['Netlist', 'Every part and every connection as readable text.', 'Pro'],
          ['Verilog', 'Hardware description code for the common parts: pins, gates, multiplexers, adders, comparators, splitters, extenders, flip-flops, registers and counters, plus chips as their own modules. Parts it cannot export are listed in comments at the top and their outputs are left undriven, so check the file before using it.', 'Pro'],
        ]),
        p('Open Export from the menu to choose one.')),
      S('themes', 'Themes',
        p('The default theme is Midnight. Pro adds Terminal (green), Ember (orange) and Violet. Choose one in Settings.')),
      S('menu', 'The menu',
        table(['Item', 'What it does'], [
          ['Projects', 'Save the current circuit under a name, open or delete saved ones, and open earlier versions.'], ['Create', 'Start a new empty circuit. Undo brings the old one back.'], ['Parts and tools', 'Every tool and part, grouped.'],
          ['Examples', 'Ready-made circuits to open and learn from.'], ['LED screen', 'Picks the LED screen part to place.'], ['Export', 'Download the circuit as code, a picture, a netlist or Verilog.'],
          ['Documentation', 'A quick reference and a link to these docs.'], ['Settings', 'Editor options, privacy and your data.'], ['Profile and plan', 'Your account, your plan and billing.'],
          ['Hardware lab', 'Arduino boards, breadboards, LEDs and jumper wires. Marked "soon": not available yet.'],
        ])),
      S('settings', 'Settings',
        list('Snap to grid: parts jump to a 20 px grid.', 'Show the grid, pin labels and part names.', 'Theme and wire style: right angles or straight lines.', 'Autosave my circuit: reopens where you left off.', 'Confirm before starting a new circuit.', 'Analytics: off unless you allow it.', 'Export my data as a file, and delete everything you have saved.')),
    ],
  },
  {
    slug: 'parts',
    sections: [
      S('how', 'How to read this page',
        p(`There are ${ALL_PARTS.length} parts. For each one you see what it does, the word used in code, its input and output pins in order, its default width, its settings, and a small circuit you can paste into the Code tab.`),
        p('Pins are listed in the order you write them in code. A pin named `>` is a clock input. "Unlabeled" pins have no name on the canvas. Clocked parts act only on a rising clock edge.')),
      ...partBlocks(),
    ],
  },
  {
    slug: 'led-screen',
    sections: [
      S('overview', 'One part, any size',
        p(`The LED screen is a single part that holds a whole picture, so a screen of 800 by 800 (640,000 pixels) is as light as a screen of 8 by 8. Sizes go from 1 by 1 up to ${SMAX} by ${SMAX}. Pixels are solid squares with no gaps, like a monitor.`),
        p('Place it from the menu (LED screen) or the Input and output group, set its size, and you can use it in two ways: draw on it from a circuit, or paint on it by hand.')),
      S('pins', 'Pins',
        table(['Pin', 'Meaning'], [
          ['X', 'Column to write, counted from 0 on the left. Its width fits the screen automatically.'], ['Y', 'Row to write, counted from 0 at the top.'], ['D', 'The color value to store. Its width is the color bits setting.'],
          ['WE', 'Write enable. A pixel is written only while WE is 1.'], ['CLR', 'When 1 on a clock edge, the whole screen is cleared to black.'], ['Clock', 'Writing happens on its rising edge.'],
        ]),
        p('On every rising clock edge, if WE is 1 and X and Y are inside the screen, the pixel at X, Y is set to D. Writes outside the screen are ignored. The screen is an output only: it has no output pins.'),
        code(L('ck = clock()', 'n = counter<6>(ck)', 'sp = split<6>(n)', 'x = merge<3>(sp[0], sp[1], sp[2])', 'y = merge<3>(sp[3], sp[4], sp[5])', 'd = xor<3>(x, y)', 'we = constant(1)', 'scr = screen<3>(x, y, d, we, None, ck, width=8, height=8)')),
        p('This counter visits all 64 pixels of an 8 by 8 screen and colors each one by x XOR y.')),
      S('colors', 'Colors',
        p('The Color bits setting decides what D means. Red is stored in the high bits, then green, then blue.'),
        table(['Color bits', 'Colors', 'Layout (red, green, blue bits)'], [
          ['1', 'Off or on, in the screen\'s LED color', '-'], ['2', 'Four brightness levels of the LED color', '-'], ['3', '8 colors', '1, 1, 1'], ['4', '16 colors', '2, 1, 1'],
          ['6', '64 colors', '2, 2, 2'], ['8', '256 colors', '3, 3, 2'], ['12', '4,096 colors', '4, 4, 4'], ['16', '65,536 colors', '6, 5, 5'],
        ]),
        p('Other widths from 1 to 16 work too. Set the LED color with `color="#rrggbb"` or the Color field in the panel. It is used for the 1 and 2 bit modes and as the starting paint color.')),
      S('paint', 'Painting by hand',
        p('Double-click the screen, press the small expand button in its corner, or use Open screen in its panel. The big view lets you:'),
        list('**Size**: choose 8, 16, 32, 64, 128, 256, 512, 800, 1024 or 2048, or type any width and height and press Apply. Resizing keeps the pixels that still fit.', '**Colors**: pick the number of colors.', '**Zoom**: Fit the window, or 1 to 16 times.', '**Paint** with a color picker, a brush size, and an eraser. Drag to draw. Fast strokes leave no gaps.', '**Clear** and **Fill**.', '**Make** patterns: Checker, Gradient, Bars, Noise.', '**Import picture** from an image file. It is fitted to the screen with black bars if the shape differs, and reduced to the screen\'s colors.', '**Save PNG** to keep your artwork.')),
      S('notes', 'Good to know',
        list('Pixels are not saved with the circuit code. Editing the code keeps them, but reloading the page clears them. Use Save PNG for pictures you want to keep.', 'Painting cannot be undone with Ctrl+Z.', 'A circuit writes one pixel per clock edge, and the fastest clock is 100 Hz, so a circuit can draw about 100 pixels per second. That suits patterns and slow animation. Paint and import are the fast way to fill large screens.', 'A screen is wider than it looks on the canvas: the canvas shows a small preview, and the big view shows every pixel.')),
      S('matrix', 'The LED matrix',
        p('The LED matrix is a small grid of separate LEDs (up to 16 columns by 16 rows) that works the way real LED matrices do. Input C has one bit per column and input R has one bit per row. The LED at column k and row r is on when bit k of C and bit r of R are both 1.'),
        p('That means you cannot light an arbitrary picture in one go. You show one row at a time, very quickly, and your eyes blend them. Use the counter and decoder parts to step through the rows. For pictures, use the LED screen instead.'),
        code(L('c = input<5>(0b10101)', 'r = input<7>(0b1111111)', 'm = matrix<5>(c, r, rows=7)'))),
    ],
  },
  {
    slug: 'examples',
    sections: [
      S('how', 'Opening an example',
        p('In the editor choose Examples from the menu and press Open on any circuit below. The code is shown here too, so you can read it or paste it into the Code tab.')),
      ...EXAMPLES.map((e) => S(e.name.toLowerCase().replace(/\W+/g, '-'), e.name, p(e.note), code(e.code))),
    ],
  },
  {
    slug: 'account',
    sections: [
      S('saving', 'Saving your work',
        list('**Without an account**, your latest circuit and your projects are kept in this browser only.', '**With an account**, they are stored online and follow you to any device. Sign in with GitHub or Google from the login page.', '**Autosave** keeps the latest circuit so the editor reopens where you left off. You can turn it off in Settings.', '**Projects** are named copies you save on purpose. Use the Projects panel to save, open or delete them.', '**Export code** downloads `circuit.stutr.txt`. **Settings, Export my data** downloads everything you have saved as a file.', 'Settings also lets you delete all your saved data. This cannot be undone.'),
        p('See the [privacy policy](/privacy) for what is stored and why.')),
      S('plans', 'Plans',
        p('Stutr is free to use. Paid plans add convenience and, as they are built, more features. See [Pricing](/pricing) for current prices.'),
        table(['Plan', 'For', 'What it is'], [
          ['Free', 'Learning and building', 'Every part, the code editor and canvas in sync, up to 5 saved projects (in your browser or your account), LED screens up to 64 by 64, and the example circuits.'],
          ['Pro', 'Serious builders', 'Everything in Free plus unlimited projects, your own circuits as parts, LED screens up to 2048 by 2048, version history, export to PNG, netlist and Verilog, extra themes, and early access to Hardware Lab when it launches.'],
          ['Student', 'Students with a school email', 'The same as Pro at a lower price. Needs an account whose email ends in .edu, .edu.xx or .ac.xx.'],
          ['Classroom', 'Teachers and schools', 'Class tools for many students. Coming soon.'],
          ['Founder', 'Early supporters', 'Pro for life, paid once.'],
        ]),
        p('Limits apply only to the Free plan. If a paid plan ends, your circuits and projects stay yours: you can still open, run and export the code of everything you made.')),
      S('profile', 'Your profile and plan',
        p('Open the menu and choose Profile and plan, or click your name at the bottom of the menu. You will see your account, your current plan and its status:'),
        list('**Active**: your plan is on, with the date it renews.', '**Ends on a date**: you cancelled, and your access continues until that date.', '**Lifetime**: the Founder plan has no renewal.', '**Free**: no paid plan yet, with a link to the plans.'),
        p('The **Manage billing** button opens a secure page from our payment provider, Polar. There you can change your plan between monthly and yearly, cancel, update your card and download invoices. Changes appear in your profile within a minute.')),
    ],
  },
]

export const PAGES = RAW.map((r) => ({ ...PAGE_META.find((m) => m.slug === r.slug), ...r }))
export { pageUrl }
export const pageBySlug = (slug) => PAGES.find((x) => x.slug === slug)
