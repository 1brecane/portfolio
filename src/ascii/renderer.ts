import { LEVELS } from '../config.ts'
import { cellKey } from './animation.ts'
import type { ArtBuffers } from './animation.ts'
import type { GridLayout } from './layout.ts'

export function drawChanges(
  ctx: CanvasRenderingContext2D,
  atlas: HTMLCanvasElement,
  layout: GridLayout,
  b: ArtBuffers,
): void {
  const { cols, rows, deviceCellW: dcw, deviceCellH: dch } = layout
  const { next, levels, tint, shape, drawn } = b
  for (let y = 0; y < rows; y++) {
    const dy = y * dch
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      const n = next[i]
      const key = cellKey(n, shape[i], tint[i])
      levels[i] = n
      if (key === drawn[i]) continue
      const dx = x * dcw
      ctx.clearRect(dx, dy, dcw, dch)
      if (n > 0) {
        ctx.drawImage(atlas, (shape[i] * LEVELS + n) * dcw, tint[i] * dch, dcw, dch, dx, dy, dcw, dch)
      }
      drawn[i] = key
    }
  }
}

export function drawFull(
  ctx: CanvasRenderingContext2D,
  atlas: HTMLCanvasElement,
  layout: GridLayout,
  b: ArtBuffers,
): void {
  ctx.clearRect(0, 0, layout.canvasWidth, layout.canvasHeight)
  b.levels.fill(0)
  b.drawn.fill(0)
  drawChanges(ctx, atlas, layout, b)
}
