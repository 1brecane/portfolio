import {
  EDGE_CONTRAST, EDGE_DARK, EDGE_MIN_COVER, EDGE_SS_X, EDGE_SS_Y, MOON_DAY_MS,
  MOON_LUM, OPEN_PERIOD_MS, RING_INNER, RING_OUTER, ROLL_MAX_DEG, ROLL_MIN_DEG, SCENE_BOTTOM,
  SCENE_MARGIN_X, SCENE_SS_X, SCENE_SS_Y, SCENE_TOP, SHAPE_FALL, SHAPE_FLAT, SHAPE_HIGH, SHAPE_LOW,
  SHAPE_MOON, SHAPE_RISE, SHAPE_WALL, STAR_DENSITY, STAR_MAX, STAR_MIN, STAR_SEED,
} from '../config.ts'
import { hashUnit } from './animation.ts'
import {
  noise3, surfaceTint, TINT_CASSINI, TINT_MOON, TINT_RING_A, TINT_RING_B, TINT_RING_C, TINT_STAR,
} from './bodies.ts'
import type { Body } from './bodies.ts'

// Units: one cell width. A cell is 1 wide and 2 tall, so row y spans [2y, 2y + 2).
// The body is an oblate spheroid with equatorial radius 1 at the origin, seen by an
// orthographic camera looking down -z. Shading happens in the "unrolled" frame, where the
// equator's long axis is horizontal and the pole is (0, cos(open), sin(open)).

export interface SceneFit {
  cx: number
  cy: number
  radius: number
  roll: number
}

export interface Scene {
  cols: number
  rows: number
  body: Body
  fit: SceneFit
  stars: Uint32Array
  starPhase: Float32Array
  starOmega: Float32Array
  map: SurfaceMap | null
}

// A body's surface drawn once: brightness and palette colour per (longitude, height along the pole).
interface SurfaceMap {
  light: Float32Array
  tint: Uint8Array
}

const TAU = 2 * Math.PI
const NIGHT = 0.001 // below level 1, but non-zero so stars never show through the body
const MAX_MOONS = 8
const MAP_W = 360
const MAP_H = 180

const maps = new Map<Body, SurfaceMap>()

function surfaceMap(body: Body): SurfaceMap | null {
  if (!body.baked) return null
  let map = maps.get(body)
  if (!map) {
    map = { light: new Float32Array(MAP_W * MAP_H), tint: new Uint8Array(MAP_W * MAP_H) }
    for (let row = 0; row < MAP_H; row++) {
      const z = ((row + 0.5) / MAP_H) * 2 - 1
      const r = Math.sqrt(1 - z * z)
      for (let col = 0; col < MAP_W; col++) {
        const lon = ((col + 0.5) / MAP_W - 0.5) * TAU
        map.light[row * MAP_W + col] = body.surface(r * Math.sin(lon), r * Math.cos(lon), z, 0, 1)
        map.tint[row * MAP_W + col] = surfaceTint
      }
    }
    maps.set(body, map)
  }
  return map
}

// `bottomFrac` is where the free area ends, as a fraction of the height: the page keeps the
// bottom for the name and links, a standalone frame can use almost all of it.
export function computeSceneFit(cols: number, rows: number, body: Body, bottomFrac = SCENE_BOTTOM): SceneFit {
  const w = cols
  const h = rows * 2
  const availW = w * (1 - 2 * SCENE_MARGIN_X)
  if (body.place) return { ...body.place(w, h, bottomFrac), roll: body.roll }
  const top = h * SCENE_TOP
  const bottom = h * bottomFrac
  let radius = 0
  let roll = body.roll
  if (body.rings) {
    const sinOpen = Math.sin(body.open + body.openSwing)
    for (let deg = ROLL_MIN_DEG; deg <= ROLL_MAX_DEG; deg += 2) {
      const p = (deg * Math.PI) / 180
      const c = Math.cos(p)
      const s = Math.sin(p)
      const hx = Math.max(1, RING_OUTER * Math.hypot(c, sinOpen * s))
      const hy = Math.max(1, RING_OUTER * Math.hypot(s, sinOpen * c))
      const r = Math.min(availW / (2 * hx), (bottom - top) / (2 * hy))
      if (r > radius + 1e-9) {
        radius = r
        roll = -p
      }
    }
  } else {
    radius = Math.max(0, Math.min(availW, bottom - top) / (2 * body.extent))
  }
  return { cx: w / 2, cy: (top + bottom) / 2, radius, roll }
}

export function createScene(cols: number, rows: number, body: Body, bottomFrac = SCENE_BOTTOM): Scene {
  const count = cols * rows
  const density = STAR_DENSITY * (body.stars ?? 1)
  const idx: number[] = []
  for (let i = 0; i < count; i++) if (hashUnit(i, STAR_SEED) < density) idx.push(i)
  const stars = Uint32Array.from(idx)
  const starPhase = new Float32Array(stars.length)
  const starOmega = new Float32Array(stars.length)
  for (let k = 0; k < stars.length; k++) {
    starPhase[k] = hashUnit(stars[k], STAR_SEED + 1) * TAU
    starOmega[k] = TAU / (3000 + 6000 * hashUnit(stars[k], STAR_SEED + 2))
  }
  return {
    cols, rows, body,
    fit: computeSceneFit(cols, rows, body, bottomFrac),
    stars, starPhase, starOmega,
    map: surfaceMap(body),
  }
}

// Brightness of Saturn's rings by distance from the axis: C, B, Cassini division, A.
export function ringProfile(r: number): number {
  if (r < RING_INNER || r > RING_OUTER) return 0
  if (r < 1.52) return 0.18 + 0.36 * (r - RING_INNER)
  if (r < 1.95) return 0.72 + 0.4 * (r - 1.52)
  if (r < 2.03) return 0.04
  return 0.6
}

function ringTint(r: number): number {
  if (r < 1.52) return TINT_RING_C
  if (r < 1.95) return TINT_RING_B
  if (r < 2.03) return TINT_CASSINI
  return TINT_RING_A
}

// Per-frame state, set by renderScene before shading.
let body: Body
let time = 0
let cB = 1
let sB = 0
let lx = 0
let ly = 0
let lz = 1
let nl = 1 // pole · light
let lightLen2 = 1 // squared length of the light direction in the stretched (sphere) space
let ringLit = 1
let stretch = 0 // along the pole, turns the spheroid into a sphere
let qa = 1
let qh = 0
let qc = 1
let k1 = 1
let k2 = 0
let k3 = 1
let cr = 1
let sr = 0
let spinC = 1
let spinS = 0
let spinTurns = 0 // the spin as a fraction of a turn
let map: SurfaceMap | null = null
let moonCount = 0
const moonX = new Float64Array(MAX_MOONS) // moon centres in the unrolled frame
const moonY = new Float64Array(MAX_MOONS)
const moonZ = new Float64Array(MAX_MOONS)
const moonR2 = new Float64Array(MAX_MOONS)
let solo = false // the body glows evenly enough that one ray per cell will do away from its edge
let sTint = 0 // palette index of the last shaded sample

// Depth of the body's surface under the screen point (u, v), or -Infinity if the ray misses.
function planetZ(u: number, v: number): number {
  if (u * u + v * v >= 1) return -Infinity
  const h = v * qh
  const disc = h * h - qa * (u * u + v * v * qc - 1)
  return disc < 0 ? -Infinity : (-h + Math.sqrt(disc)) / qa
}

// How lit a point at squared distance r2 from the centre is: 0 inside the body's shadow, 1 outside.
// `towardsLight` is the point's position along the light direction.
function shadowDepth(r2: number, towardsLight: number): number {
  if (towardsLight >= 0) return 1
  const k = (r2 - (towardsLight * towardsLight) / lightLen2 - 0.94) / 0.12
  return k < 0 ? 0 : k > 1 ? 1 : k
}

function shadePlanet(u: number, v: number, z: number): number {
  // Same point on the unit sphere, its latitude, and the spheroid's normal there.
  const py = v * k1 + z * k2
  const pz = v * k2 + z * k3
  const lat = py * cB + pz * sB
  const ny = py + stretch * lat * cB
  const nz = pz + stretch * lat * sB
  const len = Math.sqrt(u * u + ny * ny + nz * nz)
  // The point in the body's own frame, turned back by its spin.
  const ex = u
  const ey = pz * cB - py * sB
  const bx = ex * spinC + ey * spinS
  const by = ey * spinC - ex * spinS
  if (body.emissive) {
    const glow = body.surface(bx, by, lat, time, nz > 0 ? nz / len : 0)
    sTint = surfaceTint
    return glow
  }
  const d = ((u * lx + ny * ly + nz * lz) / len + body.haze) / (1 + body.haze)
  if (d <= 0) return NIGHT
  let l = 0.5 * (d + Math.sqrt(d))
  if (map) {
    let turn = Math.atan2(ex, ey) / TAU + 0.5 - spinTurns
    turn -= Math.floor(turn)
    let row = ((lat * 0.5 + 0.5) * MAP_H) | 0
    if (row < 0) row = 0
    else if (row >= MAP_H) row = MAP_H - 1
    const i = row * MAP_W + ((turn * MAP_W) | 0)
    l *= map.light[i]
    sTint = map.tint[i]
  } else {
    l *= body.surface(bx, by, lat, time, nz / len)
    sTint = surfaceTint
  }
  if (body.rings) {
    // Ring shadow: walk from the surface towards the light until the ring plane.
    const s = (-lat * (1 - body.flattening)) / nl
    if (s > 0) {
      const qx = u + s * lx
      const qy = v + s * ly
      const qz = z + s * lz
      l *= 1 - 0.85 * Math.min(1, 1.2 * ringProfile(Math.sqrt(qx * qx + qy * qy + qz * qz)))
    }
  }
  if (body.limbGlow > 0) {
    // A thin atmosphere catches the light along the edge of the disc.
    const edge = 1 - nz / len / 0.28
    if (edge > 0) {
      l += body.limbGlow * edge * d
      if (edge > 0.45) sTint = body.limbTint
    }
  }
  if (body.moonShadows) {
    // A moon between this point and the light: is the light's ray within the moon's radius?
    for (let k = 0; k < moonCount; k++) {
      const wx = moonX[k] - u
      const wy = moonY[k] - v
      const wz = moonZ[k] - z
      const along = wx * lx + wy * ly + wz * lz
      if (along > 0 && wx * wx + wy * wy + wz * wz - along * along < moonR2[k]) l *= 0.12
    }
  }
  return l > NIGHT ? l : NIGHT
}

function shade(u: number, v: number): number {
  let ring = 0
  let alpha = 0
  let rTint = 0
  let zr = 0
  if (body.rings) {
    zr = (-cB * v) / sB
    const rr2 = u * u + v * v + zr * zr
    if (rr2 > RING_INNER * RING_INNER && rr2 < RING_OUTER * RING_OUTER) {
      const rr = Math.sqrt(rr2)
      const p = ringProfile(rr)
      rTint = ringTint(rr)
      alpha = Math.min(1, 1.2 * p)
      ring = p * ringLit * (0.04 + 0.96 * shadowDepth(rr2, u * lx + v * ly + zr * lz))
    }
  }
  const zs = planetZ(u, v)
  if (zs === -Infinity) {
    if (body.corona > 0) {
      const r = Math.sqrt(u * u + v * v)
      if (r >= body.corona) return 0
      const k = (body.corona - r) / (body.corona - 1)
      const dx = u / r
      const dy = v / r
      sTint = body.coronaTint
      // Prominences: here and there a low flame leaves the edge, bright at its foot and fading.
      const lift = noise3(dx * 9 + 3, dy * 9, time * 0.00006)
      if (lift > 0.62) {
        const top = (lift - 0.62) * 0.4
        const height = r - 1
        if (height < top) {
          const fade = 1 - height / top
          if (fade > 0.5) sTint = body.coronaTint - 1
          return 0.22 + 0.45 * fade
        }
      }
      // A faint glow that fades quickly outwards, in streamers that drift slowly.
      return 0.2 * k * k * k * (0.5 + 0.5 * noise3(dx * 3.2, dy * 3.2, time * 0.00015))
    }
    sTint = rTint
    return ring
  }
  const planet = shadePlanet(u, v, zs)
  if (alpha <= 0 || zr <= zs) return planet
  const through = (1 - alpha) * planet
  if (ring >= through) sTint = rTint
  return ring + through
}

// Shade a point given in screen radii (x right, y up).
function shadeScreen(us: number, vs: number): number {
  return shade(us * cr + vs * sr, vs * cr - us * sr)
}

// Which glyph follows an edge whose luminance gradient is (gx, gy), y up, in screen units.
// `cover` is how much of the cell is lit.
function edgeShape(gx: number, gy: number, cover: number): number {
  // Direction of the edge itself, 0..180° from the x axis.
  let a = (Math.atan2(gx, -gy) * 180) / Math.PI
  if (a < 0) a += 180
  if (a < 31 || a >= 149) {
    if (cover > 0.6) return SHAPE_FLAT
    return gy < 0 ? SHAPE_LOW : SHAPE_HIGH
  }
  if (a < 77) return SHAPE_RISE
  if (a < 103) return SHAPE_WALL
  return SHAPE_FALL
}

// The Sun's edge at the right of the frame: a disc far too big to fit, and its glow.
function sunEdge(
  cols: number,
  rows: number,
  t: number,
  tints: readonly [number, number, number],
  out: Float32Array,
  tint: Uint8Array,
): void {
  const h = rows * 2
  const radius = 1.3 * h
  const sx = 0.95 * cols + radius
  const sy = 0.45 * h
  const glow = 0.05 * h
  const from = Math.max(0, Math.floor(0.95 * cols - 4 * glow))
  for (let y = 0; y < rows; y++) {
    const dy = 2 * y + 1 - sy
    for (let x = from; x < cols; x++) {
      const dx = x + 0.5 - sx
      const d = Math.sqrt(dx * dx + dy * dy)
      const i = y * cols + x
      if (d < radius) {
        const depth = (1 - (d * d) / (radius * radius)) ** 0.35
        const gran = noise3(x * 0.35, y * 0.7, t * 0.0005)
        out[i] = Math.min(1, (0.3 + 0.9 * depth) * (0.8 + 0.3 * gran))
        tint[i] = depth > 0.45 ? tints[0] : depth > 0.3 ? tints[1] : tints[2]
      } else {
        const l = 0.3 * Math.exp(-(d - radius) / glow) * (0.6 + 0.4 * noise3(x * 0.12, y * 0.24, t * 0.0002))
        if (l < 0.03) continue
        out[i] = l
        tint[i] = tints[2]
      }
    }
  }
}

// A small world drawn as a disc of ramp glyphs, lit by the scene's light: centre and radius in
// cell widths. `air` carries the light a little past the terminator; `clouds` is the palette
// colour of its clouds, or -1 for none; `over` lets it cover what is already drawn.
function drawDisc(
  cols: number,
  rows: number,
  ex: number,
  ey: number,
  er: number,
  base: number,
  clouds: number,
  lum: number,
  air: number,
  over: boolean,
  t: number,
  out: Float32Array,
  tint: Uint8Array,
  shape: Uint8Array,
): void {
  const ya = Math.max(0, Math.floor((ey - er) / 2))
  const yb = Math.min(rows - 1, Math.floor((ey + er) / 2))
  const xa = Math.max(0, Math.floor(ex - er))
  const xb = Math.min(cols - 1, Math.floor(ex + er))
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) {
      const i = y * cols + x
      if (!over && out[i] !== 0) continue
      let sum = 0
      let white = 0
      for (let j = 0; j < 2; j++) {
        const v = -(2 * (y + (j + 0.5) / 2) - ey) / er
        for (let k = 0; k < 2; k++) {
          const u = (x + (k + 0.5) / 2 - ex) / er
          const r2 = u * u + v * v
          if (r2 >= 1) continue
          const d = (u * lx + v * ly + Math.sqrt(1 - r2) * lz + air) / (1 + air)
          if (d <= 0) continue
          const cloud = clouds >= 0 && noise3(u * 2.4 + 5, v * 2.4, t * 0.00002) > 0.62
          if (cloud) white++
          sum += 0.5 * (d + Math.sqrt(d)) * (cloud || clouds < 0 ? 1 : 0.8)
        }
      }
      if (sum === 0) continue
      const l = (sum / 4) * lum
      out[i] = l > 1 ? 1 : l
      tint[i] = white >= 3 ? clouds : base
      shape[i] = 0
    }
  }
}

// Fills, per cell: `out` with a luminance, `tint` with the palette index of its brightest sample,
// `shape` with the edge glyph to use (0 = pick the glyph from the luminance ramp).
export function renderScene(
  scene: Scene,
  t: number,
  out: Float32Array,
  tint: Uint8Array,
  shape: Uint8Array,
): void {
  const { cols, rows, fit, stars, starPhase, starOmega } = scene
  out.fill(0)
  tint.fill(TINT_STAR)
  shape.fill(0)

  body = scene.body
  time = t
  const open = body.open + body.openSwing * Math.sin((TAU * t) / OPEN_PERIOD_MS)
  cB = Math.cos(open)
  sB = Math.sin(open)
  const az = body.lightBase + body.lightSwing * Math.sin((TAU * t) / body.lightPeriodMs + body.lightPhase)
  lx = Math.sin(az) * Math.cos(body.lightElevation)
  ly = Math.sin(body.lightElevation)
  lz = Math.cos(az) * Math.cos(body.lightElevation)
  nl = cB * ly + sB * lz
  stretch = 1 / (1 - body.flattening) - 1
  const e = 2 * stretch + stretch * stretch
  lightLen2 = 1 + e * nl * nl
  ringLit = 0.5 + 0.5 * Math.min(1, nl / 0.6)
  qa = 1 + e * sB * sB
  qh = sB * cB * e
  qc = 1 + e * cB * cB
  k1 = 1 + stretch * cB * cB
  k2 = stretch * sB * cB
  k3 = 1 + stretch * sB * sB
  cr = Math.cos(fit.roll)
  sr = Math.sin(fit.roll)
  const spin = TAU * (body.spinStart + (body.spinMs === 0 ? 0 : t / body.spinMs))
  spinC = Math.cos(spin)
  spinS = Math.sin(spin)
  spinTurns = spin / TAU
  map = scene.map
  moonCount = Math.min(body.moons.length, MAX_MOONS)
  for (let k = 0; k < moonCount; k++) {
    const moon = body.moons[k]
    const th = moon.phase + (TAU * t) / (moon.days * MOON_DAY_MS)
    moonX[k] = moon.a * Math.cos(th)
    moonY[k] = -moon.a * sB * Math.sin(th)
    moonZ[k] = moon.a * cB * Math.sin(th)
    moonR2[k] = moon.radius * moon.radius
  }

  if (fit.radius <= 0) return
  if (body.sunTints) sunEdge(cols, rows, t, body.sunTints, out, tint)
  const inv = 1 / fit.radius
  const far = body.rings ? RING_OUTER : Math.max(1, body.corona)
  const reach = far * fit.radius + 1
  const x0 = Math.max(0, Math.floor(fit.cx - reach))
  const x1 = Math.min(cols - 1, Math.ceil(fit.cx + reach))
  const y0 = Math.max(0, Math.floor((fit.cy - reach) / 2))
  const y1 = Math.min(rows - 1, Math.ceil((fit.cy + reach) / 2))
  const norm = 1 / (SCENE_SS_X * SCENE_SS_Y)
  const edgeNorm = 1 / (EDGE_SS_X * EDGE_SS_Y)
  // Skip cells that cannot touch the body, its glow or its rings: a cell reaches at most `m`
  // radii from its centre on screen, and 1 / sin(open) times that on the foreshortened ring plane.
  const m = 1.2 * inv
  const round2 = (far > 1 && !body.rings ? far + m : 1 + m) ** 2
  solo = body.emissive
  const calm = 1 - 2 * m
  const calm2 = calm > 0 ? calm * calm : 0
  const mr = body.rings ? m / sB : 0
  const outer2 = (RING_OUTER + mr) ** 2
  const inner = RING_INNER - mr
  const inner2 = inner > 0 ? inner * inner : 0
  for (let y = y0; y <= y1; y++) {
    const vc = -(2 * y + 1 - fit.cy) * inv
    for (let x = x0; x <= x1; x++) {
      const uc = (x + 0.5 - fit.cx) * inv
      const r2 = uc * uc + vc * vc
      if (r2 > round2) {
        if (!body.rings) continue
        const zr = (cB * (vc * cr - uc * sr)) / sB
        const rr2 = r2 + zr * zr
        if (rr2 > outer2 || rr2 < inner2) continue
      }
      if (solo && (r2 < calm2 || r2 > 1)) {
        // Deep inside a glowing disc, or out in its glow: nothing sharp to resolve.
        const l = shadeScreen(uc, vc)
        if (l === 0) continue
        out[y * cols + x] = l > 1 ? 1 : l
        tint[y * cols + x] = sTint
        continue
      }
      let sum = 0
      let lo = Infinity
      let hi = 0
      let hiTint = TINT_STAR
      for (let j = 0; j < SCENE_SS_Y; j++) {
        const vs = -(2 * (y + (j + 0.5) / SCENE_SS_Y) - fit.cy) * inv
        for (let k = 0; k < SCENE_SS_X; k++) {
          const l = shadeScreen((x + (k + 0.5) / SCENE_SS_X - fit.cx) * inv, vs)
          sum += l
          if (l < lo) lo = l
          if (l > hi) {
            hi = l
            hiTint = sTint
          }
        }
      }
      if (hi === 0) continue // nothing of the body in this cell: leave what is behind it
      const i = y * cols + x
      let l = sum * norm
      tint[i] = hiTint
      shape[i] = 0
      if (hi - lo > EDGE_CONTRAST && lo < EDGE_DARK) {
        // An edge against space: sample finer and take the first moments of the luminance,
        // which point across the edge.
        let total = 0
        let mx = 0
        let my = 0
        let top = 0
        for (let j = 0; j < EDGE_SS_Y; j++) {
          const oy = 1 - (2 * (j + 0.5)) / EDGE_SS_Y // +1 top of the cell, -1 bottom
          const vs = vc + oy * inv
          for (let k = 0; k < EDGE_SS_X; k++) {
            const ox = (k + 0.5) / EDGE_SS_X - 0.5
            const s = shadeScreen(uc + ox * inv, vs)
            total += s
            mx += s * ox
            my += s * oy
            if (s > top) top = s
          }
        }
        const cover = top > 0 ? (total * edgeNorm) / top : 0
        if (cover >= EDGE_MIN_COVER && cover < 0.92) {
          // Moments divided by the variance of the offsets (1/12 across, 4/12 up).
          shape[i] = edgeShape(mx * 4, my, cover)
          l = top * 0.9
        } else {
          l = total * edgeNorm
        }
      }
      out[i] = l > 1 ? 1 : l
    }
  }

  for (let k = 0; k < moonCount; k++) {
    const moon = body.moons[k]
    const u = moonX[k]
    const v = moonY[k]
    const z = moonZ[k]
    if (shadowDepth(moon.a * moon.a, u * lx + v * ly + z * lz) < 0.5) continue // eclipsed
    if (planetZ(u, v) > z) continue // behind the body
    const mx = fit.cx + (u * cr - v * sr) * fit.radius
    const my = fit.cy - (u * sr + v * cr) * fit.radius
    const lum = moon.lum ?? MOON_LUM
    if (moon.disc) {
      drawDisc(cols, rows, mx, my, Math.max(1.1, moon.disc * fit.radius), TINT_MOON, -1, lum, 0.1, true, t, out, tint, shape)
      continue
    }
    const x = Math.floor(mx)
    const y = Math.floor(my / 2)
    if (x < 0 || x >= cols || y < 0 || y >= rows) continue
    const i = y * cols + x
    out[i] = lum
    tint[i] = TINT_MOON
    shape[i] = SHAPE_MOON
  }

  const near = body.companion
  if (near) {
    const [du, dv] = cols >= rows * 2 ? near.wide : near.tall
    const er = Math.max(1.8, near.radius * fit.radius)
    drawDisc(cols, rows, fit.cx + du * fit.radius, fit.cy - dv * fit.radius, er, near.tint, near.cloudTint, near.lum, 0.2, false, t, out, tint, shape)
  }

  for (let k = 0; k < stars.length; k++) {
    const i = stars[k]
    if (out[i] !== 0) continue
    out[i] = STAR_MIN + (STAR_MAX - STAR_MIN) * (0.5 + 0.5 * Math.sin(starOmega[k] * t + starPhase[k]))
  }
}
