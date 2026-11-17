// Pixel helpers for the LED screen part. No React in here, so the same code draws the small
// preview on the canvas and the big paintable view, and it can be tested without a browser.
import { blank } from './engine'

export const SIZES = [8, 16, 32, 64, 128, 256, 512, 800, 1024, 2048]
export const DEPTHS = [[1, 'On / off'], [2, '4 levels'], [3, '8 colors'], [4, '16 colors'], [6, '64 colors'], [8, '256 colors'], [12, '4096 colors'], [16, '65k colors']]

export const hexOk = (t) => (/^#[0-9a-f]{6}$/i.test(t || '') ? t : '#ff5470')
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const pack = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0 // ImageData is little-endian ABGR
const css = (p) => `rgb(${p & 255},${(p >> 8) & 255},${(p >> 16) & 255})`
const OFF = [14, 22, 50]

// bits 1-2: brightness levels of one LED color. 3 and up: red, green and blue share the bits
export const split = (bits) => { const r = Math.ceil(bits / 3), g = Math.ceil((bits - r) / 2); return [r, g, bits - r - g] }

const cache = new Map()
export const lutFor = (bits, hex) => {
  const key = `${bits}|${hex}`
  if (cache.has(key)) return cache.get(key)
  const n = 1 << bits, t = new Uint32Array(n)
  if (bits <= 2) {
    const [r, g, b] = rgb(hex)
    for (let v = 0; v < n; v++) {
      const k = v / (n - 1)
      t[v] = pack(...[OFF[0] + (r - OFF[0]) * k, OFF[1] + (g - OFF[1]) * k, OFF[2] + (b - OFF[2]) * k].map(Math.round))
    }
  } else {
    const [rb, gb, bb] = split(bits), mr = (1 << rb) - 1, mg = (1 << gb) - 1, mb = (1 << bb) - 1
    for (let v = 0; v < n; v++) {
      t[v] = pack(
        Math.round((((v >> (gb + bb)) & mr) * 255) / mr),
        Math.round((((v >> bb) & mg) * 255) / mg),
        Math.round(((v & mb) * 255) / mb),
      )
    }
  }
  if (cache.size > 40) cache.clear()
  cache.set(key, t)
  return t
}

// a color from the picture or the color picker -> the closest value this screen can hold
export const quant = (bits, r, g, b) => {
  if (bits <= 2) return Math.round(((0.299 * r + 0.587 * g + 0.114 * b) / 255) * ((1 << bits) - 1))
  const [rb, gb, bb] = split(bits), q = (v, n) => Math.round((v / 255) * ((1 << n) - 1))
  return (q(r, rb) << (gb + bb)) | (q(g, gb) << bb) | q(b, bb)
}
export const inkOf = (bits, hex) => (bits <= 2 ? (1 << bits) - 1 : quant(bits, ...rgb(hex)))

/* ---- drawing the buffer onto a canvas ---- */
// Every pixel is a solid square with no gap, like a monitor. Small screens are scaled up by a whole number
// (so edges stay sharp); screens bigger than maxSide are sampled down.
export const canvasSize = (w, h, maxSide) => {
  const big = Math.max(w, h)
  if (big <= maxSide) { const s = Math.max(1, Math.min(8, Math.floor(384 / big), Math.floor(maxSide / big))); return [w * s, h * s, s] }
  const k = maxSide / big
  return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), 0]
}

export const draw = (canvas, px, w, h, lut, maxSide = 2048) => {
  const [dw, dh, s] = canvasSize(w, h, maxSide)
  if (canvas.width !== dw) canvas.width = dw
  if (canvas.height !== dh) canvas.height = dh
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = ctx.createImageData(dw, dh), out = new Uint32Array(img.data.buffer)
  if (s === 1) for (let i = 0; i < out.length; i++) out[i] = lut[px[i]]
  else if (s > 1) {
    for (let y = 0; y < dh; y++) {
      const row = Math.floor(y / s) * w
      for (let x = 0; x < dw; x++) out[y * dw + x] = lut[px[row + Math.floor(x / s)]]
    }
  } else {
    for (let y = 0; y < dh; y++) {
      const row = Math.floor((y * h) / dh) * w
      for (let x = 0; x < dw; x++) out[y * dw + x] = lut[px[row + Math.floor((x * w) / dw)]]
    }
  }
  ctx.putImageData(img, 0, 0)
}

/* ---- painting ---- */
export const stamp = (px, w, h, cx, cy, size, val) => {
  const r = Math.floor(size / 2)
  for (let y = Math.max(0, cy - r); y <= Math.min(h - 1, cy - r + size - 1); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(w - 1, cx - r + size - 1); x++) px[y * w + x] = val
  }
}
// a straight stroke, so a fast mouse leaves no gaps
export const stroke = (px, w, h, x0, y0, x1, y1, size, val) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let i = 0; i <= n; i++) stamp(px, w, h, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), size, val)
}

export const PATTERNS = [['checker', 'Checker'], ['gradient', 'Gradient'], ['bars', 'Bars'], ['noise', 'Noise']]
export const pattern = (px, w, h, kind, bits) => {
  const max = (1 << bits) - 1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v
      if (kind === 'checker') v = (x + y) & 1 ? max : 0
      else if (kind === 'gradient') v = bits <= 2 ? Math.round((x / Math.max(1, w - 1)) * max) : quant(bits, (x / Math.max(1, w - 1)) * 255, (y / Math.max(1, h - 1)) * 255, 255 - (x / Math.max(1, w - 1)) * 255)
      else if (kind === 'bars') { const n = Math.min(8, max + 1); v = Math.round((Math.floor((x * n) / w) * max) / Math.max(1, n - 1)) }
      else v = Math.floor(Math.random() * (max + 1))
      px[y * w + x] = v & max
    }
  }
}

// a new size keeps whatever still fits in the top-left corner
export const resized = (old, nw, nh) => {
  const s = blank(nw, nh)
  if (old) {
    for (let y = 0; y < Math.min(old.h, nh); y++) s.px.set(old.px.subarray(y * old.w, y * old.w + Math.min(old.w, nw)), y * nw)
    s.v = old.v + 1
  }
  return s
}
export const rebit = (st, bits) => { const m = (1 << bits) - 1; for (let i = 0; i < st.px.length; i++) st.px[i] &= m }

// a picture file scaled to fit the screen (the whole picture shows, black bars if the shape differs)
export const fromImage = (img, px, w, h, bits) => {
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  ctx.imageSmoothingQuality = 'high'
  const k = Math.min(w / img.width, h / img.height), dw = Math.max(1, Math.round(img.width * k)), dh = Math.max(1, Math.round(img.height * k))
  ctx.drawImage(img, Math.floor((w - dw) / 2), Math.floor((h - dh) / 2), dw, dh)
  const d = ctx.getImageData(0, 0, w, h).data
  for (let i = 0; i < w * h; i++) px[i] = quant(bits, d[i * 4], d[i * 4 + 1], d[i * 4 + 2])
}
