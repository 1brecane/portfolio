import { describe, it, expect } from 'vitest'
import {
  hash32, hashUnit, levelFor, cellKey, createArtBuffers, buildRevealSchedule, revealLevel, computeFrame,
} from '../src/ascii/animation.ts'
import type { ArtBuffers } from '../src/ascii/animation.ts'
import { REVEAL_SEED, LEVELS } from '../src/config.ts'

const COLS = 160
const ROWS = 50

// What the renderer does after drawing: the canvas now shows b.next.
function settle(b: ArtBuffers): void {
  b.levels.set(b.next)
  for (let i = 0; i < b.count; i++) b.drawn[i] = cellKey(b.next[i], b.shape[i], b.tint[i])
}

function fixture(): ArtBuffers {
  const b = createArtBuffers(COLS, ROWS)
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      b.lum[y * COLS + x] = y >= 20 && y < 30 ? 0 : x / (COLS - 1)
    }
  }
  buildRevealSchedule(COLS, ROWS, REVEAL_SEED, b.revealStart)
  return b
}

describe('hash32', () => {
  it('is deterministic, integer, in range', () => {
    expect(hash32(5, 7)).toBe(hash32(5, 7))
    for (let i = 0; i < 100; i++) {
      const h = hash32(i, 3)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThan(2 ** 32)
      const u = hashUnit(i, 3)
      expect(u).toBeGreaterThanOrEqual(0)
      expect(u).toBeLessThan(1)
    }
    expect(hash32(1, 0)).not.toBe(hash32(2, 0))
  })
})

describe('createArtBuffers', () => {
  it('zero-filled with right sizes', () => {
    const b = createArtBuffers(4, 3)
    expect(b.count).toBe(12)
    expect(b.lum.length).toBe(12)
    expect(b.levels.every((v) => v === 0)).toBe(true)
  })
})

describe('buildRevealSchedule', () => {
  it('range and diagonal ordering', () => {
    const out = new Float32Array(COLS * ROWS)
    buildRevealSchedule(COLS, ROWS, REVEAL_SEED, out)
    for (const v of out) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(2080) }
    const mean = (x0: number, y0: number): number => {
      let s = 0
      for (let y = y0; y < y0 + 10; y++) for (let x = x0; x < x0 + 10; x++) s += out[y * COLS + x]
      return s / 100
    }
    expect(mean(0, 0)).toBeLessThan(mean(COLS - 10, ROWS - 10))
  })
})

describe('revealLevel', () => {
  it('phases', () => {
    expect(revealLevel(3, 99, 100, 5)).toBe(0)
    expect(revealLevel(3, 220, 100, 5)).toBe(5)
    expect(revealLevel(3, 5000, 100, 0)).toBe(0)
    for (let t = 100; t < 220; t += 7) {
      const v = revealLevel(3, t, 100, 0)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(2)
      expect(revealLevel(3, t, 100, 0)).toBe(v)
      const w = revealLevel(3, t, 100, 7)
      expect(w).toBeGreaterThanOrEqual(1)
      expect(w).toBeLessThanOrEqual(7)
    }
  })
})

describe('computeFrame', () => {
  it('static', () => {
    const b = fixture()
    const diff = computeFrame(b, 'static', 0)
    let expected = 0
    for (let i = 0; i < b.count; i++) {
      expect(b.next[i]).toBe(levelFor(b.lum[i], LEVELS))
      if (b.next[i] !== b.levels[i]) expected++
    }
    expect(diff).toBe(expected)
  })

  it('reveal at end equals static; at 0 hides delayed cells', () => {
    const b = fixture()
    computeFrame(b, 'reveal', 2200)
    for (let i = 0; i < b.count; i++) expect(b.next[i]).toBe(levelFor(b.lum[i], LEVELS))
    computeFrame(b, 'reveal', 0)
    for (let i = 0; i < b.count; i++) if (b.revealStart[i] > 0) expect(b.next[i]).toBe(0)
  })

  it('live on settled levels equals static', () => {
    const b = fixture()
    computeFrame(b, 'static', 0)
    settle(b)
    expect(computeFrame(b, 'live', 0)).toBe(0)
    for (let i = 0; i < b.count; i++) expect(b.next[i]).toBe(levelFor(b.lum[i], LEVELS))
  })

  it('live moves one level per frame and converges', () => {
    const b = fixture()
    computeFrame(b, 'static', 0)
    settle(b)
    for (let i = 0; i < b.count; i++) b.lum[i] = 1 - b.lum[i]
    let frames = 0
    while (computeFrame(b, 'live', 0) > 0) {
      for (let i = 0; i < b.count; i++) expect(Math.abs(b.next[i] - b.levels[i])).toBeLessThanOrEqual(1)
      settle(b)
      frames++
      expect(frames).toBeLessThan(LEVELS)
    }
    expect(frames).toBeGreaterThan(1)
    for (let i = 0; i < b.count; i++) expect(b.levels[i]).toBe(levelFor(b.lum[i], LEVELS))
  })
})

describe('levelFor', () => {
  it('maps values', () => {
    expect(levelFor(0, 10)).toBe(0)
    expect(levelFor(0.0999, 10)).toBe(0)
    expect(levelFor(0.1, 10)).toBe(1)
    expect(levelFor(0.95, 10)).toBe(9)
    expect(levelFor(1, 10)).toBe(9)
    expect(levelFor(-0.5, 10)).toBe(0)
    expect(levelFor(1.5, 10)).toBe(9)
  })
})

describe('tint and shape', () => {
  it('a colour or glyph change on a drawn cell counts as a redraw, on an empty cell it does not', () => {
    const b = createArtBuffers(2, 1)
    b.lum[0] = 0.5
    b.lum[1] = 0
    computeFrame(b, 'static', 0)
    settle(b)
    expect(computeFrame(b, 'live', 0)).toBe(0)
    b.tint[0] = 3
    b.tint[1] = 3
    expect(computeFrame(b, 'live', 0)).toBe(1)
    expect(computeFrame(b, 'static', 0)).toBe(1)
    settle(b)
    b.shape[0] = 2
    b.shape[1] = 2
    expect(computeFrame(b, 'live', 0)).toBe(1)
  })
})
