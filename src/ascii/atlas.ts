import { FONT_STACK, GLYPH_EM_ADVANCE, LEVELS, SHAPE_GLYPHS } from '../config.ts'
import { alphaFor, glyphFor } from './frame.ts'

// One row of tiles per palette colour; one column per (shape, level) pair, at shape * LEVELS + level.
export function buildGlyphAtlas(
  deviceCellW: number,
  deviceCellH: number,
  palette: readonly string[],
): HTMLCanvasElement {
  const atlas = document.createElement('canvas')
  atlas.width = SHAPE_GLYPHS.length * LEVELS * deviceCellW
  atlas.height = palette.length * deviceCellH
  const ctx = atlas.getContext('2d')
  if (!ctx) return atlas
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `400 ${deviceCellW / GLYPH_EM_ADVANCE}px ${FONT_STACK}`
  for (let tint = 0; tint < palette.length; tint++) {
    ctx.fillStyle = palette[tint]
    for (let shape = 0; shape < SHAPE_GLYPHS.length; shape++) {
      for (let level = 1; level < LEVELS; level++) {
        ctx.globalAlpha = alphaFor(level)
        ctx.fillText(
          glyphFor(level, shape),
          (shape * LEVELS + level + 0.5) * deviceCellW,
          (tint + 0.5) * deviceCellH,
        )
      }
    }
  }
  return atlas
}
