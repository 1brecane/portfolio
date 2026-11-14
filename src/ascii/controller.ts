import {
  FRAME_INTERVAL_MS, HEIGHT_SHRINK_REBUILD_RATIO, MAX_FRAME_DT_MS, REVEAL_SEED, REVEAL_TOTAL_MS,
  RESIZE_DEBOUNCE_MS, SCENE_EVERY,
} from '../config.ts'
import { buildRevealSchedule, computeFrame, createArtBuffers } from './animation.ts'
import type { ArtBuffers } from './animation.ts'
import { buildGlyphAtlas } from './atlas.ts'
import { computeGridLayout } from './layout.ts'
import type { GridLayout } from './layout.ts'
import { drawChanges, drawFull } from './renderer.ts'
import type { Body } from './bodies.ts'
import { createScene, renderScene } from './scene.ts'
import type { Scene } from './scene.ts'

export function startAsciiArt(canvas: HTMLCanvasElement, body: Body): void {
  try {
    run(canvas, body)
  } catch {
    // Decorative layer: any failure leaves background + text only.
  }
}

function run(canvas: HTMLCanvasElement, body: Body): void {
  const reducedMql = window.matchMedia('(prefers-reduced-motion: reduce)')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let layout: GridLayout | null = null
  let buffers: ArtBuffers | null = null
  let scene: Scene | null = null
  let atlas: HTMLCanvasElement | null = null
  let elapsed = 0
  let tick = 0
  let lastFrame: number | null = null
  let rafId = 0
  let resizeTimer = 0
  let lastW = 0
  let lastDpr = 0
  let maxH = 0
  let reduced = reducedMql.matches

  const rebuild = (): boolean => {
    const dpr = window.devicePixelRatio || 1
    const l = computeGridLayout(window.innerWidth, window.innerHeight, dpr)
    if (l.count === 0) return false
    canvas.width = l.canvasWidth
    canvas.height = l.canvasHeight
    canvas.style.width = `${l.cssWidth}px`
    canvas.style.height = `${l.cssHeight}px`
    const b = createArtBuffers(l.cols, l.rows)
    buildRevealSchedule(l.cols, l.rows, REVEAL_SEED, b.revealStart)

    layout = l
    buffers = b
    scene = createScene(l.cols, l.rows, body)
    atlas = buildGlyphAtlas(l.deviceCellW, l.deviceCellH, body.palette)
    lastW = window.innerWidth
    lastDpr = dpr
    maxH = window.innerHeight
    return true
  }

  // Full repaint of the scene at time t, with no transition.
  const paintAt = (t: number): void => {
    if (!layout || !buffers || !scene || !atlas) return
    renderScene(scene, t, buffers.lum, buffers.tint, buffers.shape)
    computeFrame(buffers, 'static', 0)
    drawFull(ctx, atlas, layout, buffers)
  }

  const frame = (now: number): void => {
    rafId = requestAnimationFrame(frame)
    if (lastFrame === null) lastFrame = now
    if (now - lastFrame < FRAME_INTERVAL_MS - 1) return
    elapsed += Math.min(now - lastFrame, MAX_FRAME_DT_MS)
    lastFrame = now
    if (!layout || !buffers || !scene || !atlas) return
    if (tick++ % SCENE_EVERY === 0) renderScene(scene, elapsed, buffers.lum, buffers.tint, buffers.shape)
    const changed =
      elapsed < REVEAL_TOTAL_MS
        ? computeFrame(buffers, 'reveal', elapsed)
        : computeFrame(buffers, 'live', 0)
    if (changed > 0) drawChanges(ctx, atlas, layout, buffers)
  }

  function startLoop(): void {
    if (rafId !== 0) return
    rafId = requestAnimationFrame(frame)
  }

  function stopLoop(): void {
    if (rafId !== 0) cancelAnimationFrame(rafId)
    rafId = 0
  }

  const onResize = (): void => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      try {
        const h = window.innerHeight
        const needs =
          window.innerWidth !== lastW ||
          (window.devicePixelRatio || 1) !== lastDpr ||
          h > maxH ||
          h < maxH * HEIGHT_SHRINK_REBUILD_RATIO
        if (!needs || !rebuild()) return
        // A resize never replays the reveal.
        if (!reduced) elapsed = Math.max(elapsed, REVEAL_TOTAL_MS)
        paintAt(reduced ? 0 : elapsed)
      } catch {
        // Keep the previous frame; the next resize tries again.
      }
    }, RESIZE_DEBOUNCE_MS)
  }

  // A zero-size viewport at load builds nothing; the resize listener picks it up later.
  rebuild()
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopLoop()
    } else if (!reduced) {
      lastFrame = null
      startLoop()
    }
  })
  reducedMql.addEventListener('change', (e: MediaQueryListEvent) => {
    reduced = e.matches
    if (reduced) {
      stopLoop()
      paintAt(0)
    } else {
      elapsed = Math.max(elapsed, REVEAL_TOTAL_MS)
      lastFrame = null
      startLoop()
    }
  })

  if (reduced) paintAt(0)
  else if (!document.hidden) startLoop()
}
