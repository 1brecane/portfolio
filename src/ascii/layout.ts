import { BREAKPOINTS, MAX_CELLS, MAX_COLS, MAX_DPR } from '../config.ts'

export interface GridLayout {
  cols: number
  rows: number
  count: number
  cellW: number
  cellH: number
  dpr: number
  deviceCellW: number
  deviceCellH: number
  canvasWidth: number
  canvasHeight: number
  cssWidth: number
  cssHeight: number
}

export function computeGridLayout(vw: number, vh: number, dpr: number): GridLayout {
  const effDpr = Math.min(Math.max(dpr, 1), MAX_DPR)
  if (vw <= 0 || vh <= 0) {
    return {
      cols: 0, rows: 0, count: 0, cellW: 0, cellH: 0, dpr: effDpr,
      deviceCellW: 0, deviceCellH: 0, canvasWidth: 0, canvasHeight: 0, cssWidth: 0, cssHeight: 0,
    }
  }
  let cellW = 5
  for (const bp of BREAKPOINTS) {
    if (vw >= bp.minWidth) {
      cellW = bp.cellW
      break
    }
  }
  let cols = Math.ceil(vw / cellW)
  let rows = Math.ceil(vh / (2 * cellW))
  while (cols > MAX_COLS || cols * rows > MAX_CELLS) {
    cellW += 1
    cols = Math.ceil(vw / cellW)
    rows = Math.ceil(vh / (2 * cellW))
  }
  const deviceCellW = Math.ceil(cellW * effDpr - 1e-6)
  const deviceCellH = 2 * deviceCellW
  const canvasWidth = cols * deviceCellW
  const canvasHeight = rows * deviceCellH
  return {
    cols, rows, count: cols * rows, cellW, cellH: 2 * cellW, dpr: effDpr,
    deviceCellW, deviceCellH, canvasWidth, canvasHeight,
    cssWidth: canvasWidth / effDpr, cssHeight: canvasHeight / effDpr,
  }
}
