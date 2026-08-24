/**
 * Content Bank media generator (Task 5.14). Pure-Node PNG encoder + simple
 * raster drawing, no external deps. Generates the diagram images referenced
 * by the authored image-interaction questions, with features aligned to the
 * hotspot coordinates (x%, y% of image width/height).
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y += 1) {
    raw[y * (1 + width * 4)] = 0
    Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(raw, y * (1 + width * 4) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  return png
}

class Canvas {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.data = new Uint8ClampedArray(width * height * 4)
    this.fill(255, 255, 255, 255)
  }

  fill(r, g, b, a = 255) {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = r
      this.data[i + 1] = g
      this.data[i + 2] = b
      this.data[i + 3] = a
    }
  }

  setPx(x, y, r, g, b, a = 255) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const i = (y * this.width + x) * 4
    this.data[i] = r
    this.data[i + 1] = g
    this.data[i + 2] = b
    this.data[i + 3] = a
  }

  blend(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const i = (y * this.width + x) * 4
    const alpha = a / 255
    this.data[i] = Math.round(this.data[i] * (1 - alpha) + r * alpha)
    this.data[i + 1] = Math.round(this.data[i + 1] * (1 - alpha) + g * alpha)
    this.data[i + 2] = Math.round(this.data[i + 2] * (1 - alpha) + b * alpha)
    this.data[i + 3] = 255
  }

  fillRect(x0, y0, w, h, color) {
    const [r, g, b, a = 255] = color
    for (let y = Math.max(0, y0); y < Math.min(this.height, y0 + h); y += 1) {
      for (let x = Math.max(0, x0); x < Math.min(this.width, x0 + w); x += 1) this.blend(x, y, r, g, b, a)
    }
  }

  strokeRect(x0, y0, w, h, color, thickness = 1) {
    for (let t = 0; t < thickness; t += 1) {
      this.fillRect(x0 + t, y0 + t, w - 2 * t, 1, color)
      this.fillRect(x0 + t, y0 + h - t - 1, w - 2 * t, 1, color)
      this.fillRect(x0 + t, y0 + t, 1, h - 2 * t, color)
      this.fillRect(x0 + w - t - 1, y0 + t, 1, h - 2 * t, color)
    }
  }

  fillCircle(cx, cy, radius, color) {
    const [r, g, b, a = 255] = color
    const r2 = radius * radius
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) this.blend(x, y, r, g, b, a)
      }
    }
  }

  drawLine(x0, y0, x1, y1, color, thickness = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    let x = x0
    let y = y0
    while (true) {
      this.fillCircle(x, y, thickness / 2, color)
      if (x === x1 && y === y1) break
      const e2 = 2 * err
      if (e2 >= dy) { err += dy; x += sx }
      if (e2 <= dx) { err += dx; y += sy }
    }
  }

  triangle(ax, ay, bx, by, cx, cy, color) {
    const [r, g, b, a = 255] = color
    const minX = Math.floor(Math.min(ax, bx, cx))
    const maxX = Math.ceil(Math.max(ax, bx, cx))
    const minY = Math.floor(Math.min(ay, by, cy))
    const maxY = Math.ceil(Math.max(ay, by, cy))
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const v0x = cx - ax; const v0y = cy - ay
        const v1x = bx - ax; const v1y = by - ay
        const v2x = x - ax; const v2y = y - ay
        const dot00 = v0x * v0x + v0y * v0y
        const dot01 = v0x * v1x + v0y * v1y
        const dot02 = v0x * v2x + v0y * v2y
        const dot11 = v1x * v1x + v1y * v1y
        const dot12 = v1x * v2x + v1y * v2y
        const inv = 1 / (dot00 * dot11 - dot01 * dot01)
        const u = (dot11 * dot02 - dot01 * dot12) * inv
        const v = (dot00 * dot12 - dot01 * dot02) * inv
        if (u >= 0 && v >= 0 && u + v <= 1) this.blend(x, y, r, g, b, a)
      }
    }
  }

  arrow(x0, y0, x1, y1, color, thickness = 2) {
    this.drawLine(x0, y0, x1, y1, color, thickness)
    const ang = Math.atan2(y1 - y0, x1 - x0)
    const len = 10
    this.drawLine(x1, y1, x1 - len * Math.cos(ang - 0.45), y1 - len * Math.sin(ang - 0.45), color, thickness)
    this.drawLine(x1, y1, x1 - len * Math.cos(ang + 0.45), y1 - len * Math.sin(ang + 0.45), color, thickness)
  }

  toPng() {
    return encodePng(this.width, this.height, this.data)
  }
}

const BLUE = [41, 98, 185, 255]
const RED = [204, 51, 51, 255]
const GREEN = [46, 139, 87, 255]
const ORANGE = [230, 126, 34, 255]
const PURPLE = [130, 71, 174, 255]
const TEAL = [0, 150, 136, 255]
const DARK = [40, 44, 52, 255]
const GRAY = [150, 154, 162, 255]
const LIGHT = [235, 237, 240, 255]
const YELLOW = [244, 208, 63, 255]

function write(name, canvas) {
  const out = join(process.cwd(), 'scripts/content-bank/generated-media', name)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, canvas.toPng())
  console.log('generated', name, `${canvas.width}x${canvas.height}`)
}

function barChart({ titleWidth = 400, titleHeight = 300, bars, colors }) {
  const c = new Canvas(titleWidth, titleHeight)
  c.fillRect(0, 0, titleWidth, titleHeight, LIGHT)
  const axisY = titleHeight - 30
  c.drawLine(30, axisY, titleWidth - 20, axisY, DARK, 2)
  c.drawLine(30, axisY, 30, 20, DARK, 2)
  const n = bars.length
  const band = (titleWidth - 60) / n
  bars.forEach((height, i) => {
    const x0 = 30 + i * band + band * 0.25
    const bw = band * 0.5
    const top = axisY - height * (axisY - 30) / 100
    c.fillRect(Math.round(x0), Math.round(top), Math.round(bw), Math.round(axisY - top), colors[i % colors.length])
  })
  return c
}

// 1. mathematics/data-statistics/bar-chart-fruit.png (400x300) — tallest bar C
{
  const c = barChart({ titleWidth: 400, titleHeight: 300, bars: [30, 60, 75, 45, 20], colors: [BLUE, BLUE, RED, BLUE, BLUE] })
  write('mathematics/data-statistics/bar-chart-fruit.png', c)
}

// 2. mathematics/geometry-measurement/coordinate-grid-point.png (400x400) — point at 65%,30%
{
  const c = new Canvas(400, 400)
  c.fillRect(0, 0, 400, 400, [252, 252, 252, 255])
  for (let gx = 40; gx <= 400; gx += 40) c.drawLine(gx, 0, gx, 400, [224, 227, 232, 255], 1)
  for (let gy = 40; gy <= 400; gy += 40) c.drawLine(0, gy, 400, gy, [224, 227, 232, 255], 1)
  c.drawLine(200, 0, 200, 400, DARK, 2)
  c.drawLine(0, 200, 400, 200, DARK, 2)
  const px = Math.round(400 * 0.65)
  const py = Math.round(400 * 0.30)
  c.fillCircle(px, py, 6, RED)
  c.fillCircle(px, py, 12, [204, 51, 51, 70])
  c.drawLine(px - 18, py, px + 18, py, RED, 2)
  c.drawLine(px, py - 18, px, py + 18, RED, 2)
  write('mathematics/geometry-measurement/coordinate-grid-point.png', c)
}

// 3. mathematics/algebra/line-slope-intercept.png (400x400) — y-intercept at 12%,55%
{
  const c = new Canvas(400, 400)
  c.fillRect(0, 0, 400, 400, [252, 252, 252, 255])
  for (let gx = 40; gx <= 400; gx += 40) c.drawLine(gx, 0, gx, 400, [224, 227, 232, 255], 1)
  for (let gy = 40; gy <= 400; gy += 40) c.drawLine(0, gy, 400, gy, [224, 227, 232, 255], 1)
  c.drawLine(200, 0, 200, 400, DARK, 2)
  c.drawLine(0, 200, 400, 200, DARK, 2)
  c.drawLine(40, 340, 360, 60, BLUE, 3)
  const ix = 200
  const iy = 228
  c.fillCircle(ix, iy, 6, RED)
  c.fillCircle(ix, iy, 12, [204, 51, 51, 70])
  write('mathematics/algebra/line-slope-intercept.png', c)
}

// 4. mathematics/algebra/parabola-vertex.png (400x400) — vertex at 50%,62%
{
  const c = new Canvas(400, 400)
  c.fillRect(0, 0, 400, 400, [252, 252, 252, 255])
  for (let gx = 40; gx <= 400; gx += 40) c.drawLine(gx, 0, gx, 400, [224, 227, 232, 255], 1)
  for (let gy = 40; gy <= 400; gy += 40) c.drawLine(0, gy, 400, gy, [224, 227, 232, 255], 1)
  c.drawLine(200, 0, 200, 400, DARK, 2)
  c.drawLine(0, 200, 400, 200, DARK, 2)
  const scale = 40
  let prev = null
  for (let px = 0; px <= 400; px += 1) {
    const x = (px - 200) / scale
    const y = x * x - 1
    const py = 200 + y * scale
    if (prev) c.drawLine(prev[0], prev[1], px, Math.round(py), BLUE, 3)
    prev = [px, Math.round(py)]
  }
  const vx = 200
  const vy = 240
  c.fillCircle(vx, vy, 6, RED)
  c.fillCircle(vx, vy, 12, [204, 51, 51, 70])
  write('mathematics/algebra/parabola-vertex.png', c)
}

// 5. science/inquiry/rainfall-bar-chart.png (400x320) — July tallest at 52%,20%
{
  const c = new Canvas(400, 320)
  const heights = [45, 40, 50, 55, 60, 70, 90, 80, 65, 55, 50, 40]
  const axisY = 300
  c.fillRect(0, 0, 400, 320, LIGHT)
  c.drawLine(30, axisY, 380, axisY, DARK, 2)
  c.drawLine(30, axisY, 30, 20, DARK, 2)
  heights.forEach((height, i) => {
    const band = 340 / 12
    const x0 = 30 + i * band + band * 0.3
    const bw = band * 0.4
    const top = axisY - height * (axisY - 25) / 100
    const color = i === 6 ? RED : BLUE
    c.fillRect(Math.round(x0), Math.round(top), Math.round(bw), Math.round(axisY - top), color)
  })
  write('science/inquiry/rainfall-bar-chart.png', c)
}

// 6. science/earth-space/earth-layers.png (400x400) — crust ring at 50%,6%
{
  const c = new Canvas(400, 400)
  c.fillRect(0, 0, 400, 400, [248, 250, 252, 255])
  c.fillCircle(200, 200, 180, ORANGE)
  c.fillCircle(200, 200, 168, YELLOW)
  c.fillCircle(200, 200, 120, RED)
  c.fillCircle(200, 200, 70, PURPLE)
  c.fillCircle(200, 200, 34, [255, 140, 90, 255])
  write('science/earth-space/earth-layers.png', c)
}

// 7. science/life/food-web.png (400x320) — fox apex at 70%,18%
{
  const c = new Canvas(400, 320)
  c.fillRect(0, 0, 400, 320, [250, 250, 250, 255])
  const nodes = {
    grass: [90, 290],
    mouse: [180, 200],
    rabbit: [300, 200],
    owl: [330, 120],
    fox: [280, 58],
  }
  c.arrow(...nodes.grass, ...nodes.mouse, GRAY, 2)
  c.arrow(...nodes.grass, ...nodes.rabbit, GRAY, 2)
  c.arrow(...nodes.rabbit, ...nodes.fox, GRAY, 2)
  c.arrow(...nodes.mouse, ...nodes.fox, GRAY, 2)
  c.arrow(...nodes.mouse, ...nodes.owl, GRAY, 2)
  c.fillCircle(...nodes.grass, 14, GREEN)
  c.fillCircle(...nodes.mouse, 13, TEAL)
  c.fillCircle(...nodes.rabbit, 13, TEAL)
  c.fillCircle(...nodes.owl, 13, PURPLE)
  c.fillCircle(...nodes.fox, 15, RED)
  write('science/life/food-web.png', c)
}

// 8. science/life/plant-cell.png (400x400) — label mode
{
  const c = new Canvas(400, 400)
  c.fillRect(0, 0, 400, 400, [252, 252, 252, 255])
  c.strokeRect(20, 36, 360, 328, DARK, 3)
  c.fillRect(20, 36, 360, 328, [240, 248, 235, 255])
  c.strokeRect(26, 42, 348, 316, GREEN, 2)
  c.fillCircle(200, 200, 38, PURPLE)
  c.fillCircle(200, 200, 38, [0, 0, 0, 0])
  c.fillCircle(200, 200, 22, [160, 110, 200, 255])
  c.fillCircle(262, 118, 16, GREEN)
  c.fillRect(244, 112, 38, 14, GREEN)
  c.fillCircle(262, 118, 10, [120, 200, 120, 255])
  c.fillCircle(158, 300, 12, TEAL)
  c.fillRect(148, 294, 22, 14, TEAL)
  c.fillCircle(158, 300, 8, [160, 230, 220, 255])
  write('science/life/plant-cell.png', c)
}

// 9. technology/computing/hardware-parts.png (400x300) — tower at 15%,55%
{
  const c = new Canvas(400, 300)
  c.fillRect(0, 0, 400, 300, LIGHT)
  c.fillRect(0, 260, 400, 40, [205, 210, 218, 255])
  c.fillRect(150, 30, 230, 160, DARK)
  c.fillRect(158, 38, 214, 144, [110, 140, 190, 255])
  c.fillRect(255, 190, 20, 25, DARK)
  c.fillRect(235, 215, 60, 8, DARK)
  c.fillRect(20, 70, 70, 190, DARK)
  c.fillRect(32, 82, 46, 70, [80, 90, 110, 255])
  c.fillRect(32, 165, 46, 25, [80, 90, 110, 255])
  c.fillRect(110, 225, 220, 30, DARK)
  c.fillRect(118, 235, 200, 10, [90, 100, 120, 255])
  write('technology/computing/hardware-parts.png', c)
}

// 10. engineering/mechanisms-machines/lever-fulcrum.png (400x260) — fulcrum at 50%,78%
{
  const c = new Canvas(400, 260)
  c.fillRect(0, 0, 400, 260, [250, 250, 250, 255])
  c.fillRect(0, 230, 400, 30, [205, 210, 218, 255])
  c.triangle(200, 203, 185, 235, 215, 235, DARK)
  c.drawLine(80, 210, 320, 210, ORANGE, 6)
  c.strokeRect(50, 185, 55, 45, DARK, 3)
  c.fillRect(52, 187, 51, 43, [255, 230, 170, 255])
  c.arrow(330, 195, 355, 195, GREEN, 3)
  write('engineering/mechanisms-machines/lever-fulcrum.png', c)
}

console.log('DONE')