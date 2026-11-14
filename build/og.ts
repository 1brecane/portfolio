import { SATURN } from '../src/ascii/bodies.ts'
import { createFrameRenderer, cellRgb, glyphFor } from '../src/ascii/frame.ts'
import { BG_RGB, NAME, OG_CELL_W, OG_HEIGHT, OG_WIDTH, TEXT_RGB } from '../src/config.ts'

// The link preview image, drawn with no dependencies: the scene on a character grid, a 5x7
// bitmap font for the glyphs, and a hand-rolled PNG writer.

const FONT: Record<string, string[]> = {
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.####'],
  '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '¯': ['#####', '.....', '.....', '.....', '.....', '.....', '.....'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '\\': ['#....', '.#...', '.#...', '..#..', '...#.', '...#.', '....#'],
  '|': ['..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  a: ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
  l: ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  o: ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
  r: ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....'],
  u: ['.....', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
}

type Rgb = readonly [number, number, number]

function drawGlyph(px: Uint8Array, ch: string, x0: number, y0: number, scale: number, rgb: Rgb): void {
  const rows = FONT[ch]
  if (!rows) return
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 5; c++) {
      if (rows[r][c] !== '#') continue
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = x0 + c * scale + dx
          const y = y0 + r * scale + dy
          if (x < 0 || x >= OG_WIDTH || y < 0 || y >= OG_HEIGHT) continue
          px.set(rgb, (y * OG_WIDTH + x) * 3)
        }
      }
    }
  }
}

// RGB pixels of the preview: Saturn on the grid, the name bottom-left as on the page.
export function renderOgPixels(): Uint8Array {
  const px = new Uint8Array(OG_WIDTH * OG_HEIGHT * 3)
  for (let i = 0; i < px.length; i += 3) px.set(BG_RGB, i)

  const cellW = OG_CELL_W
  const cellH = 2 * cellW
  const cols = Math.floor(OG_WIDTH / cellW)
  const rows = Math.floor(OG_HEIGHT / cellH)
  const f = createFrameRenderer(cols, rows, SATURN, 0.8)(0)
  const top = Math.floor((OG_HEIGHT - rows * cellH) / 2)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      const n = f.level[i]
      if (n === 0) continue
      drawGlyph(px, glyphFor(n, f.shape[i]), x * cellW + 1, top + y * cellH + 5, 2, cellRgb(f.palette[f.tint[i]], n))
    }
  }

  const scale = 5
  const margin = 48
  for (let k = 0; k < NAME.length; k++) {
    drawGlyph(px, NAME[k], margin + k * 6 * scale, OG_HEIGHT - margin - 7 * scale, scale, TEXT_RGB)
  }
  return px
}

const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c >>> 0
}

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

async function deflate(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function encodePng(rgb: Uint8Array, width: number, height: number): Promise<Uint8Array> {
  const header = new Uint8Array(13)
  const view = new DataView(header.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  header[8] = 8 // bits per channel
  header[9] = 2 // truecolour
  const stride = width * 3
  const raw = new Uint8Array((stride + 1) * height) // each row starts with filter type 0
  for (let y = 0; y < height; y++) raw.set(rgb.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1)
  const parts = [
    Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    chunk('IHDR', header),
    chunk('IDAT', await deflate(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const p of parts) {
    png.set(p, offset)
    offset += p.length
  }
  return png
}

export function renderOgPng(): Promise<Uint8Array> {
  return encodePng(renderOgPixels(), OG_WIDTH, OG_HEIGHT)
}
