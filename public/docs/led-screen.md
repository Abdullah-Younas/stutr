# LED screen guide

> Build Stutr LED screens from 1 by 1 to 2048 by 2048 pixels: draw from a circuit, paint by hand, import pictures, choose colors, and use the LED matrix.

## One part, any size

The LED screen is a single part that holds a whole picture, so a screen of 800 by 800 (640,000 pixels) is as light as a screen of 8 by 8. Sizes go from 1 by 1 up to 2048 by 2048. Pixels are solid squares with no gaps, like a monitor.

Place it from the menu (LED screen) or the Input and output group, set its size, and you can use it in two ways: draw on it from a circuit, or paint on it by hand.

## Pins

| Pin | Meaning |
| --- | --- |
| X | Column to write, counted from 0 on the left. Its width fits the screen automatically. |
| Y | Row to write, counted from 0 at the top. |
| D | The color value to store. Its width is the color bits setting. |
| WE | Write enable. A pixel is written only while WE is 1. |
| CLR | When 1 on a clock edge, the whole screen is cleared to black. |
| Clock | Writing happens on its rising edge. |

On every rising clock edge, if WE is 1 and X and Y are inside the screen, the pixel at X, Y is set to D. Writes outside the screen are ignored. The screen is an output only: it has no output pins.

```stutr
ck = clock()
n = counter<6>(ck)
sp = split<6>(n)
x = merge<3>(sp[0], sp[1], sp[2])
y = merge<3>(sp[3], sp[4], sp[5])
d = xor<3>(x, y)
we = constant(1)
scr = screen<3>(x, y, d, we, None, ck, width=8, height=8)
```

This counter visits all 64 pixels of an 8 by 8 screen and colors each one by x XOR y.

## Colors

The Color bits setting decides what D means. Red is stored in the high bits, then green, then blue.

| Color bits | Colors | Layout (red, green, blue bits) |
| --- | --- | --- |
| 1 | Off or on, in the screen's LED color | - |
| 2 | Four brightness levels of the LED color | - |
| 3 | 8 colors | 1, 1, 1 |
| 4 | 16 colors | 2, 1, 1 |
| 6 | 64 colors | 2, 2, 2 |
| 8 | 256 colors | 3, 3, 2 |
| 12 | 4,096 colors | 4, 4, 4 |
| 16 | 65,536 colors | 6, 5, 5 |

Other widths from 1 to 16 work too. Set the LED color with `color="#rrggbb"` or the Color field in the panel. It is used for the 1 and 2 bit modes and as the starting paint color.

## Painting by hand

Double-click the screen, press the small expand button in its corner, or use Open screen in its panel. The big view lets you:

- **Size**: choose 8, 16, 32, 64, 128, 256, 512, 800, 1024 or 2048, or type any width and height and press Apply. Resizing keeps the pixels that still fit.
- **Colors**: pick the number of colors.
- **Zoom**: Fit the window, or 1 to 16 times.
- **Paint** with a color picker, a brush size, and an eraser. Drag to draw. Fast strokes leave no gaps.
- **Clear** and **Fill**.
- **Make** patterns: Checker, Gradient, Bars, Noise.
- **Import picture** from an image file. It is fitted to the screen with black bars if the shape differs, and reduced to the screen's colors.
- **Save PNG** to keep your artwork.

## Good to know

- Pixels are not saved with the circuit code. Editing the code keeps them, but reloading the page clears them. Use Save PNG for pictures you want to keep.
- Painting cannot be undone with Ctrl+Z.
- A circuit writes one pixel per clock edge, and the fastest clock is 100 Hz, so a circuit can draw about 100 pixels per second. That suits patterns and slow animation. Paint and import are the fast way to fill large screens.
- A screen is wider than it looks on the canvas: the canvas shows a small preview, and the big view shows every pixel.

## The LED matrix

The LED matrix is a small grid of separate LEDs (up to 16 columns by 16 rows) that works the way real LED matrices do. Input C has one bit per column and input R has one bit per row. The LED at column k and row r is on when bit k of C and bit r of R are both 1.

That means you cannot light an arbitrary picture in one go. You show one row at a time, very quickly, and your eyes blend them. Use the counter and decoder parts to step through the rows. For pictures, use the LED screen instead.

```stutr
c = input<5>(0b10101)
r = input<7>(0b1111111)
m = matrix<5>(c, r, rows=7)
```
