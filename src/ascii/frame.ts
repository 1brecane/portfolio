import { ALPHA_MIN, BG_RGB, LEVELS, RAMP, SCENE_BOTTOM, SHAPE_GLYPHS } from '../config.ts'
import { levelFor } from './animation.ts'
import type { Body } from './bodies.ts'
import { createScene, renderScene } from './scene.ts'

// A finished frame of the scene as plain data, for anything that is not the page's canvas:
// the browser console, the <noscript> fallback, the link preview image.
export interface Frame {
  cols: number
  rows: number
  level: Uint8Array
  shape: Uint8Array
  tint: Uint8Array
  palette: readonly string[]
}

// The glyph for a cell: an edge glyph if it has a shape, otherwise the ramp glyph of its level.
export function glyphFor(level: number, shape: number): string {
  return level === 0 ? ' ' : shape > 0 ? SHAPE_GLYPHS[shape] : RAMP[level]
}

export function alphaFor(level: number): number {
  return ALPHA_MIN + ((1 - ALPHA_MIN) * level) / (LEVELS - 1)
}

// The colour a cell ends up on the dark background: its palette colour ("#RRGGBB") at its level's alpha.
export function cellRgb(hex: string, level: number): [number, number, number] {
  const a = alphaFor(level)
  const c = [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16))
  return [0, 1, 2].map((k) => Math.round(BG_RGB[k] + (c[k] - BG_RGB[k]) * a)) as [number, number, number]
}

// Returns a function that renders the scene at time t. The Frame it returns is reused between calls.
export function createFrameRenderer(
  cols: number,
  rows: number,
  body: Body,
  bottomFrac = SCENE_BOTTOM,
): (t: number) => Frame {
  const scene = createScene(cols, rows, body, bottomFrac)
  const lum = new Float32Array(cols * rows)
  const frame: Frame = {
    cols, rows,
    level: new Uint8Array(cols * rows),
    shape: new Uint8Array(cols * rows),
    tint: new Uint8Array(cols * rows),
    palette: body.palette,
  }
  return (t) => {
    renderScene(scene, t, lum, frame.tint, frame.shape)
    for (let i = 0; i < lum.length; i++) frame.level[i] = levelFor(lum[i], LEVELS)
    return frame
  }
}

// Calls `run(text, tint, level)` for each stretch of same-coloured glyphs in a row, left to right.
// Blank cells join the stretch they are in; trailing blanks are dropped.
function eachRun(f: Frame, y: number, run: (text: string, tint: number, level: number) => void): void {
  const { cols, level, shape, tint } = f
  let end = cols
  while (end > 0 && level[y * cols + end - 1] === 0) end--
  let text = ''
  let curTint = -1
  let curLevel = -1
  for (let x = 0; x < end; x++) {
    const i = y * cols + x
    const n = level[i]
    if (n > 0 && (tint[i] !== curTint || n !== curLevel)) {
      if (text) run(text, curTint, curLevel)
      text = ''
      curTint = tint[i]
      curLevel = n
    }
    text += glyphFor(n, shape[i])
  }
  if (text) run(text, curTint, curLevel)
}

export function frameToText(f: Frame): string {
  const lines: string[] = []
  for (let y = 0; y < f.rows; y++) {
    let line = ''
    eachRun(f, y, (text) => (line += text))
    lines.push(line)
  }
  return lines.join('\n')
}

// Arguments for console.log: a %c format string followed by one CSS colour per stretch.
export function frameToConsole(f: Frame): string[] {
  let format = ''
  const styles: string[] = []
  for (let y = 0; y < f.rows; y++) {
    eachRun(f, y, (text, tint, level) => {
      format += '%c' + text.replaceAll('%', '%%')
      styles.push(tint < 0 ? '' : `color:rgb(${cellRgb(f.palette[tint], level).join(',')})`)
    })
    format += '\n'
  }
  return [format, ...styles]
}
