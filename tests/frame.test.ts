import { describe, it, expect } from 'vitest'
import { alphaFor, cellRgb, createFrameRenderer, frameToConsole, frameToText, glyphFor } from '../src/ascii/frame.ts'
import { encodePng, renderOgPixels } from '../build/og.ts'
import { BODIES, SATURN } from '../src/ascii/bodies.ts'
import { BG_RGB, OG_HEIGHT, OG_WIDTH, RAMP, SHAPE_GLYPHS } from '../src/config.ts'

const frame = createFrameRenderer(80, 21, SATURN, 0.95)(0)

describe('glyphs and colours', () => {
  it('picks edge glyphs over ramp glyphs', () => {
    expect(glyphFor(0, 3)).toBe(' ')
    expect(glyphFor(5, 0)).toBe(RAMP[5])
    expect(glyphFor(5, 3)).toBe(SHAPE_GLYPHS[3])
  })
  it('fades towards the background at low levels', () => {
    expect(alphaFor(9)).toBe(1)
    expect(cellRgb('#F3E5BC', 9)).toEqual([0xf3, 0xe5, 0xbc])
    const dim = cellRgb('#F3E5BC', 1)
    for (let k = 0; k < 3; k++) {
      expect(dim[k]).toBeGreaterThan(BG_RGB[k])
      expect(dim[k]).toBeLessThan(0xbc)
    }
    for (const body of BODIES) {
      for (const hex of body.palette) {
        expect(hex).toMatch(/^#[0-9A-F]{6}$/)
        for (const c of cellRgb(hex, 5)) expect(c).toBeLessThanOrEqual(255)
      }
    }
  })
})

describe('frame output', () => {
  it('text has one line per row, no trailing blanks, only known glyphs', () => {
    const lines = frameToText(frame).split('\n')
    expect(lines).toHaveLength(21)
    const known = new Set([...RAMP, ...SHAPE_GLYPHS.join('')])
    let ink = 0
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(80)
      expect(line).toBe(line.trimEnd())
      for (const ch of line) {
        expect(known.has(ch)).toBe(true)
        if (ch !== ' ') ink++
      }
    }
    expect(ink).toBeGreaterThan(200)
  })
  it('console arguments match: one style per %c, percent signs escaped', () => {
    const [format, ...styles] = frameToConsole(frame)
    expect(format.match(/%c/g)?.length).toBe(styles.length)
    expect(format.replaceAll('%c', '').replaceAll('%%', '%')).toBe(frameToText(frame) + '\n')
  })
})

describe('link preview image', () => {
  it('is a valid PNG of the right size with something drawn on it', async () => {
    const px = renderOgPixels()
    expect(px.length).toBe(OG_WIDTH * OG_HEIGHT * 3)
    let lit = 0
    for (let i = 0; i < px.length; i += 3) if (px[i] !== BG_RGB[0]) lit++
    expect(lit).toBeGreaterThan(5000)

    const png = await encodePng(px, OG_WIDTH, OG_HEIGHT)
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const view = new DataView(png.buffer)
    expect(view.getUint32(16)).toBe(OG_WIDTH)
    expect(view.getUint32(20)).toBe(OG_HEIGHT)
    // Inflate the IDAT chunk back and compare with the pixels.
    const idatLen = view.getUint32(33)
    expect(String.fromCharCode(...png.subarray(37, 41))).toBe('IDAT')
    const stream = new Blob([png.slice(41, 41 + idatLen)]).stream().pipeThrough(new DecompressionStream('deflate'))
    const raw = new Uint8Array(await new Response(stream).arrayBuffer())
    expect(raw.length).toBe((OG_WIDTH * 3 + 1) * OG_HEIGHT)
    expect([...raw.subarray(1, 1 + 30)]).toEqual([...px.subarray(0, 30)])
    expect(png.length).toBeLessThan(200_000)
  })
})
