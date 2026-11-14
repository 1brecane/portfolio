import { describe, it, expect } from 'vitest'
import { computeGridLayout } from '../src/ascii/layout.ts'

describe('computeGridLayout', () => {
  it('matches breakpoint examples', () => {
    const l = computeGridLayout(375, 812, 1)
    expect(l.cellW).toBe(5)
    expect(l.cols).toBe(75)
    expect(l.rows).toBe(82)
    expect(computeGridLayout(768, 1024, 1).cellW).toBe(6)
    expect(computeGridLayout(1024, 768, 1).cellW).toBe(7)
    expect(computeGridLayout(1440, 900, 1).cellW).toBe(9)
    expect(computeGridLayout(1920, 1080, 1).cellW).toBe(10)
  })

  const sizes: [number, number][] = [
    [375, 812], [812, 375], [1366, 768], [1920, 1080], [2560, 1440], [3840, 2160], [320, 568],
  ]
  for (const [vw, vh] of sizes) {
    for (const dpr of [1, 1.25, 1.5, 2, 3]) {
      it(`invariants ${vw}x${vh} @${dpr}`, () => {
        const l = computeGridLayout(vw, vh, dpr)
        expect(l.cssWidth).toBeGreaterThanOrEqual(vw)
        expect(l.cssHeight).toBeGreaterThanOrEqual(vh)
        expect(l.cols).toBeLessThanOrEqual(200)
        expect(l.count).toBeLessThanOrEqual(16000)
        expect(l.count).toBe(l.cols * l.rows)
        expect(Number.isInteger(l.deviceCellW)).toBe(true)
        expect(l.deviceCellH).toBe(2 * l.deviceCellW)
        expect(l.dpr).toBeLessThanOrEqual(2)
      })
    }
  }

  it('grows cells on 4K', () => {
    expect(computeGridLayout(3840, 2160, 1).cellW).toBeGreaterThan(10)
  })

  it('returns empty layout for zero viewport', () => {
    expect(computeGridLayout(0, 800, 1).count).toBe(0)
    expect(computeGridLayout(800, 0, 1).count).toBe(0)
  })
})
