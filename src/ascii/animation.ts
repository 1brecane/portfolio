import { DECODE_MS, DECODE_STEP_MS, LEVELS, REVEAL_JITTER, REVEAL_SWEEP_MS } from '../config.ts'

export type ArtMode = 'reveal' | 'live' | 'static'

export interface ArtBuffers {
  cols: number
  rows: number
  count: number
  lum: Float32Array
  tint: Uint8Array // palette index wanted for each cell
  shape: Uint8Array // edge glyph wanted for each cell, 0 = ramp glyph
  drawn: Uint16Array // cellKey of what is on the canvas
  revealStart: Float32Array
  levels: Uint8Array
  next: Uint8Array
}

export function hash32(a: number, b: number): number {
  let h = Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 12
  h = Math.imul(h, 0x297a2d39)
  h ^= h >>> 15
  return h >>> 0
}

export function hashUnit(a: number, b: number): number {
  return hash32(a, b) / 4294967296
}

export function levelFor(l: number, levels: number): number {
  const c = l < 0 ? 0 : l > 1 ? 1 : l
  return Math.min(levels - 1, Math.floor(c * levels))
}

// Everything that decides how a cell looks, in one number. Empty cells are all alike.
export function cellKey(level: number, shape: number, tint: number): number {
  return level === 0 ? 0 : (tint << 8) | (shape << 4) | level
}

export function createArtBuffers(cols: number, rows: number): ArtBuffers {
  const count = cols * rows
  return {
    cols, rows, count,
    lum: new Float32Array(count),
    tint: new Uint8Array(count),
    shape: new Uint8Array(count),
    drawn: new Uint16Array(count),
    revealStart: new Float32Array(count),
    levels: new Uint8Array(count),
    next: new Uint8Array(count),
  }
}

export function buildRevealSchedule(cols: number, rows: number, seed: number, out: Float32Array): void {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      const d = ((cols > 1 ? x / (cols - 1) : 0) + (rows > 1 ? y / (rows - 1) : 0)) / 2
      let p = d + (hashUnit(i, seed) * 2 - 1) * REVEAL_JITTER
      p = p < 0 ? 0 : p > 1 ? 1 : p
      out[i] = REVEAL_SWEEP_MS * (1 - Math.sqrt(1 - p))
    }
  }
}

export function revealLevel(i: number, t: number, start: number, finalLevel: number): number {
  if (t < start) return 0
  if (t < start + DECODE_MS) {
    const slot = Math.floor((t - start) / DECODE_STEP_MS)
    const maxL = Math.max(2, finalLevel)
    return 1 + (hash32(i, slot + 1) % maxL)
  }
  return finalLevel
}

// Turns b.lum into b.next and returns how many cells need a redraw (level, glyph or colour changed).
// `t` is only read in 'reveal' mode; 'live' moves each cell at most one level per frame.
export function computeFrame(b: ArtBuffers, mode: ArtMode, t: number): number {
  const { count, lum, next, levels, tint, shape, drawn } = b
  let diff = 0
  if (mode === 'static') {
    for (let i = 0; i < count; i++) {
      const n = levelFor(lum[i], LEVELS)
      next[i] = n
      if (cellKey(n, shape[i], tint[i]) !== drawn[i]) diff++
    }
  } else if (mode === 'reveal') {
    const { revealStart } = b
    for (let i = 0; i < count; i++) {
      const n = revealLevel(i, t, revealStart[i], levelFor(lum[i], LEVELS))
      next[i] = n
      if (cellKey(n, shape[i], tint[i]) !== drawn[i]) diff++
    }
  } else {
    for (let i = 0; i < count; i++) {
      let n = levelFor(lum[i], LEVELS)
      const cur = levels[i]
      if (n > cur + 1) n = cur + 1
      else if (n < cur - 1) n = cur - 1
      next[i] = n
      if (cellKey(n, shape[i], tint[i]) !== drawn[i]) diff++
    }
  }
  return diff
}
