export const RAMP = ' .:-=+*#%@' // dark → light, 10 levels; index 0 (space) is never drawn
export const LEVELS = RAMP.length // 10
export const BREAKPOINTS = [
  { minWidth: 1920, cellW: 10 },
  { minWidth: 1440, cellW: 9 },
  { minWidth: 1024, cellW: 7 },
  { minWidth: 768, cellW: 6 },
  { minWidth: 0, cellW: 5 },
] as const
export const MAX_COLS = 200
export const MAX_CELLS = 16_000
export const MAX_DPR = 2
export const ALPHA_MIN = 0.3

// Edge glyphs. A cell on a silhouette draws the glyph that follows the edge instead of a ramp
// glyph. Index 0 means "use the ramp".
export const SHAPE_GLYPHS = ['', '-', '_', '/', '|', '\\', '¯', 'o'] as const
export const SHAPE_FLAT = 1
export const SHAPE_LOW = 2
export const SHAPE_RISE = 3
export const SHAPE_WALL = 4
export const SHAPE_FALL = 5
export const SHAPE_HIGH = 6
export const SHAPE_MOON = 7 // not an edge: a moon too small for a disc, drawn as one glyph
export const EDGE_CONTRAST = 0.22 // min spread between a cell's samples to count as an edge
export const EDGE_DARK = 0.02 // ...and its darkest sample must be empty space or night side
export const EDGE_SS_X = 3 // edge cells are sampled again, finer, to find the edge direction
export const EDGE_SS_Y = 4
export const EDGE_MIN_COVER = 0.18
export const GLYPH_EM_ADVANCE = 0.6
export const FONT_STACK =
  'ui-monospace, "SF Mono", "Cascadia Mono", "JetBrains Mono", Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace'

// Scene, in planet radii. What differs between bodies lives in src/ascii/bodies.ts.
export const RING_INNER = 1.24
export const RING_OUTER = 2.27
export const MOON_DAY_MS = 150_000 // one day of moon motion takes this long on screen
export const MOON_LUM = 0.86
export const OPEN_PERIOD_MS = 53_000
export const ROLL_MIN_DEG = 18 // with rings, the fit picks the roll in this range that lets the planet be largest
export const ROLL_MAX_DEG = 56
export const SCENE_MARGIN_X = 0.05
export const SCENE_TOP = 0.05 // fractions of the viewport height left free for the scene
export const SCENE_BOTTOM = 0.7
export const SCENE_SS_X = 2
export const SCENE_SS_Y = 2
export const STAR_DENSITY = 0.005
export const STAR_MIN = 0.03
export const STAR_MAX = 0.27
export const STAR_SEED = 0x57a2

// Standalone frames: the same scene outside the page.
export const FRAME_BOTTOM = 0.95
export const CONSOLE_COLS = 72 // printed in the browser console
export const CONSOLE_ROWS = 22
export const STATIC_COLS = 120 // <noscript> fallback in the HTML
export const STATIC_ROWS = 40
export const OG_WIDTH = 1200 // link preview image
export const OG_HEIGHT = 630
export const OG_CELL_W = 12

export const NAME = 'Samuele Ruaro'
export const BG_RGB = [11, 12, 14] as const
export const TEXT_RGB = [242, 239, 232] as const

export const REVEAL_TOTAL_MS = 2200
export const DECODE_MS = 120
export const DECODE_STEP_MS = 40
export const REVEAL_SWEEP_MS = REVEAL_TOTAL_MS - DECODE_MS
export const REVEAL_JITTER = 0.15
export const REVEAL_SEED = 0x5a17
export const FRAME_INTERVAL_MS = 1000 / 30
export const SCENE_EVERY = 2 // the scene moves slowly: shade it every other frame
export const MAX_FRAME_DT_MS = 100
export const RESIZE_DEBOUNCE_MS = 150
export const HEIGHT_SHRINK_REBUILD_RATIO = 0.75
