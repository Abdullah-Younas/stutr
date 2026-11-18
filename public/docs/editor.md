# The editor

> How to use the Stutr editor: the Code and Editor panes, the run bar, every tool, keyboard shortcuts, zoom and pan, the part panel, menus and settings.

## The workspace

The editor has two views of one circuit: **Code** (the text) and **Editor** (the canvas). Use the buttons in the top bar to show one at a time as tabs, or side by side in a row or a column. In side-by-side mode, drag the divider to resize. Your choice is remembered.

The menu on the left holds your projects, parts, examples, export, documentation and settings. On a phone or tablet it opens from the menu button.

## The run bar

| Control | What it does |
| --- | --- |
| Run / Pause | Starts and stops every clock in the circuit. It needs at least one clock part. |
| Speed menu | How fast the clock runs: 1, 2, 5, 10, 20, 50 or 100 Hz. |
| Fit view | Zooms and pans so the whole circuit is visible. |
| − and + | Zoom out and in. |
| Undo / Redo | Step back or forward through your edits. |

## Tools

Pick a tool from the Parts and tools panel, or press its key. The hint at the bottom of the canvas always tells you what the current tool does.

| Tool | Key | What it does |
| --- | --- | --- |
| Poke | `P` | Use the circuit. Click an input or clock to change it, hold a button, drag a joystick. Drag from one pin to another to draw a wire. Parts can still be dragged. |
| Edit | `E` | Drag parts to move them. `Delete` removes the selection. |
| Select | `S` | Drag a box around several parts, then move them together or delete them. |
| Erase | `X` | Click a part or a wire to remove it. |
| Text | `T` | Click the canvas to place a text note. |
| Menu | `M` | Click a part for a small menu with Duplicate and Delete. |
| Label | `L` | Click a part, then type its new name in the panel. |

To place any part, pick it from the Parts and tools panel and click the canvas. It stays selected so you can place several. Press `Esc` to go back to Poke.

## Wires

- Drag from an output pin to an input pin (or the other way round) with the Poke tool.
- An input takes one wire. Connecting a second wire to the same input replaces the first.
- An output can feed many inputs. A filled dot marks an output that feeds more than one wire.
- Wires glow and show a moving pulse when they carry a non-zero value. Thick wires are buses (more than 1 bit).
- To remove a wire, hold `D` and click it, or use the Erase tool.
- Settings let you choose right-angle or straight wires.

## The part panel

Click a part (Edit or Poke tool) to open its panel on the right. It shows:

- **Name**: edit it to rename the part everywhere.
- **Data bits**: the width, 1 to 16.
- Part-specific fields such as Address bits, Rows, Stages, Contents, Mode or Color.
- **Position** and the part's **current outputs** (or inputs), in hexadecimal. `Z` means floating.
- A **Delete** button. The LED screen also has **Open screen**.

Select several parts with the Select tool and the panel offers Delete all.

## Keyboard and mouse

| Input | Action |
| --- | --- |
| `P` `E` `S` `X` | Poke, Edit, Select, Erase |
| `T` `M` `L` | Text, Menu, Label |
| Hold `D` | Erase while held: click a wire or part |
| `Delete` | Remove the selection |
| `Esc` | Back to Poke |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` or `Ctrl+Shift+Z` | Redo |
| Mouse wheel | Zoom |
| Drag empty space | Pan |
| Two fingers (touch) | Pinch to zoom and drag to pan |

## The menu

| Item | What it does |
| --- | --- |
| Projects | Save the current circuit under a name, open or delete saved ones. |
| Create | Start a new empty circuit. Undo brings the old one back. |
| Parts and tools | Every tool and part, grouped. |
| Examples | Ready-made circuits to open and learn from. |
| LED screen | Picks the LED screen part to place. |
| Export code | Downloads the circuit as `circuit.stutr.txt`. |
| Documentation | A quick reference and a link to these docs. |
| Settings | Editor options, privacy and your data. |
| Profile and plan | Your account, your plan and billing. |
| Hardware lab | Arduino boards, breadboards, LEDs and jumper wires. Marked "soon": not available yet. |

## Settings

- Snap to grid: parts jump to a 20 px grid.
- Show the grid, pin labels and part names.
- Wire style: right angles or straight lines.
- Autosave my circuit: reopens where you left off.
- Confirm before starting a new circuit.
- Analytics: off unless you allow it.
- Export my data as a file, and delete everything you have saved.
