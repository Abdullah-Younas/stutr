// Title and description of each docs page. Light on purpose: routes.js imports it, so it must not pull in the engine.
export const PAGE_META = [
  { slug: "", title: "Stutr documentation", description: "Learn Stutr, the code-based circuit simulator: how it works, a five-minute start, and links to the language, editor, parts and LED screen guides." },
  { slug: "language", title: "The circuit language", description: "The Stutr circuit language: one line per part, how to wire inputs, set bit widths and settings, use numbers and comments, and fix errors." },
  { slug: "editor", title: "The editor", description: "How to use the Stutr editor: the Code and Editor panes, the run bar, every tool, keyboard shortcuts, zoom and pan, the part panel, menus and settings." },
  { slug: "parts", title: "Parts reference", description: "Every Stutr part: wiring, gates, plexers, arithmetic, memory, input and output. Pins, default width, settings, code name and a working example for each." },
  { slug: "led-screen", title: "LED screen guide", description: "Build Stutr LED screens from 1 by 1 to 2048 by 2048 pixels: draw from a circuit, paint by hand, import pictures, choose colors, and use the LED matrix." },
  { slug: "examples", title: "Examples", description: "Ready-made Stutr circuits you can open and run: half adder, full adder, 4-bit adder, counter, clock divider, RAM, a 4-bit CPU and an LED screen." },
  { slug: "account", title: "Accounts, saving and plans", description: "How saving works in Stutr, signing in, exporting or deleting your data, the Free, Pro, Student, Classroom and Founder plans, and managing billing." },
]
export const pageUrl = (slug) => (slug ? `/docs/${slug}` : '/docs')
