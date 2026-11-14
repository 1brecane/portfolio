import { describe, it, expect } from 'vitest'
import { computeSceneFit, createScene, renderScene, ringProfile } from '../src/ascii/scene.ts'
import { computeGridLayout } from '../src/ascii/layout.ts'
import {
  BODIES, bodyByName, bodyForDay, DAY_NAMES, JUPITER, MARS, MERCURY, MOON, PLUTO, SATURN, SUN, TINT_MOON, TINT_RING_B, TINT_STAR,
  VENUS,
} from '../src/ascii/bodies.ts'
import type { Body } from '../src/ascii/bodies.ts'
import {
  RING_INNER, RING_OUTER, SCENE_BOTTOM, SCENE_TOP, SHAPE_GLYPHS, SHAPE_HIGH, STAR_MAX,
} from '../src/config.ts'

const viewports: [number, number][] = [
  [375, 812], [390, 844], [812, 375], [768, 1024], [1366, 768], [1440, 900], [1920, 1080], [3840, 2160],
]

function grid(vw: number, vh: number): { cols: number; rows: number } {
  const l = computeGridLayout(vw, vh, 1)
  return { cols: l.cols, rows: l.rows }
}

// Renders one body on the 1440x900 grid and gives helpers to read cells by position.
function stage(body: Body) {
  const { cols, rows } = grid(1440, 900)
  const scene = createScene(cols, rows, body)
  const lum = new Float32Array(cols * rows)
  const tint = new Uint8Array(cols * rows)
  const shape = new Uint8Array(cols * rows)
  const f = scene.fit
  return {
    cols, rows, scene, lum, tint, shape,
    at(t: number): Float32Array {
      renderScene(scene, t, lum, tint, shape)
      return lum
    },
    // (u, v) in body radii, in the unrolled frame (u along the equator, v along the pole)
    index(u: number, v: number): number {
      const c = Math.cos(f.roll)
      const s = Math.sin(f.roll)
      const x = Math.floor(f.cx + (u * c - v * s) * f.radius)
      const y = Math.floor((f.cy - (u * s + v * c) * f.radius) / 2)
      return y * cols + x
    },
  }
}

describe('bodies', () => {
  it('one per weekday, named after it', () => {
    expect(BODIES).toHaveLength(7)
    for (let day = 0; day < 7; day++) expect(bodyForDay(day).day).toBe(day)
    expect(bodyForDay(6)).toBe(SATURN)
    expect(bodyForDay(1)).toBe(MOON)
    expect(bodyForDay(0)).toBe(SUN)
    expect(bodyForDay(7)).toBe(SUN)
    expect(DAY_NAMES[JUPITER.day]).toBe('Thursday')
    expect(bodyByName('JUPITER')).toBe(JUPITER)
    expect(bodyByName('pluto')).toBeUndefined()
    expect(bodyByName(null)).toBeUndefined()
  })

  it('moons obey Kepler\'s third law around their planet', () => {
    for (const body of BODIES) {
      const k = body.moons.map((m) => m.days ** 2 / m.a ** 3)
      for (const v of k) expect(Math.abs(v / k[0] - 1)).toBeLessThan(0.02)
    }
  })

  for (const body of BODIES) {
    it(`${body.name}: surface is bounded and uses its own palette`, () => {
      let min = Infinity
      let max = -Infinity
      for (let i = 0; i < 4000; i++) {
        // points spread over the sphere
        const z = 1 - (2 * (i + 0.5)) / 4000
        const r = Math.sqrt(1 - z * z)
        const a = i * 2.399963
        const l = body.surface(r * Math.cos(a), r * Math.sin(a), z, 12_345, 0.7)
        expect(Number.isFinite(l)).toBe(true)
        if (l < min) min = l
        if (l > max) max = l
      }
      expect(min).toBeGreaterThan(0.1)
      expect(max).toBeLessThan(1.3)
      expect(max - min).toBeGreaterThan(0.1) // not a featureless ball
    })

    it(`${body.name}: renders in range, deterministically, and moves`, () => {
      const s = stage(body)
      const a = s.at(0).slice()
      const tints = new Set<number>()
      for (let i = 0; i < a.length; i++) {
        expect(a[i]).toBeGreaterThanOrEqual(0)
        expect(a[i]).toBeLessThanOrEqual(1)
        expect(s.tint[i]).toBeLessThan(body.palette.length)
        expect(s.shape[i]).toBeLessThan(SHAPE_GLYPHS.length)
        if (a[i] > 0.3) tints.add(s.tint[i])
      }
      expect(tints.size).toBeGreaterThanOrEqual(3) // several colours on screen
      expect([...s.at(0)]).toEqual([...a])
      const b = s.at(12_000)
      let changed = 0
      for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 0.1) changed++
      expect(changed).toBeGreaterThan(40)
    })

    for (const [vw, vh] of viewports) {
      it(`${body.name}: has a sensible size at ${vw}x${vh}`, () => {
        const { cols, rows } = grid(vw, vh)
        const f = computeSceneFit(cols, rows, body)
        expect(f.radius).toBeGreaterThan(4)
        expect(f.radius).toBeLessThan(Math.max(cols, 2 * rows))
        if (body.place) return // placed by hand, and allowed to run off the screen
        let hx = f.radius * body.extent
        let hy = hx
        if (body.rings) {
          const sinOpen = Math.sin(body.open + body.openSwing)
          const c = Math.cos(f.roll)
          const s = Math.sin(f.roll)
          hx = f.radius * Math.max(1, RING_OUTER * Math.hypot(c, sinOpen * s))
          hy = f.radius * Math.max(1, RING_OUTER * Math.hypot(s, sinOpen * c))
        }
        const e = 1e-6
        expect(f.cx - hx).toBeGreaterThanOrEqual(-e)
        expect(f.cx + hx).toBeLessThanOrEqual(cols + e)
        expect(f.cy - hy).toBeGreaterThanOrEqual(2 * rows * SCENE_TOP - e)
        expect(f.cy + hy).toBeLessThanOrEqual(2 * rows * SCENE_BOTTOM + e)
      })
    }
  }
})

describe('scene fit', () => {
  it('rolls Saturn\'s rings steeper on a portrait screen', () => {
    const p = grid(390, 844)
    const l = grid(1440, 900)
    expect(Math.abs(computeSceneFit(p.cols, p.rows, SATURN).roll)).toBeGreaterThan(
      Math.abs(computeSceneFit(l.cols, l.rows, SATURN).roll),
    )
  })
  it('handles an empty grid', () => {
    for (const body of BODIES) expect(computeSceneFit(0, 0, body).radius).toBe(0)
    const tiny = createScene(1, 1, SATURN)
    expect(() => renderScene(tiny, 0, new Float32Array(1), new Uint8Array(1), new Uint8Array(1))).not.toThrow()
  })
})

describe('Saturn', () => {
  it('ring profile: empty outside, dark in the Cassini division', () => {
    expect(ringProfile(RING_INNER - 0.01)).toBe(0)
    expect(ringProfile(RING_OUTER + 0.01)).toBe(0)
    expect(ringProfile(1.99)).toBeLessThan(0.1)
    expect(ringProfile(1.7)).toBeGreaterThan(ringProfile(2.1))
    expect(ringProfile(2.1)).toBeGreaterThan(ringProfile(1.3))
  })

  it('lights the planet and the rings at t=0', () => {
    const s = stage(SATURN)
    const a = s.at(0)
    expect(a[s.index(0.45, 0.3)]).toBeGreaterThan(0.4) // day side
    expect(a[s.index(-0.9, 0.2)]).toBeLessThan(0.1) // night side
    expect(a[s.index(1.75, 0)]).toBeGreaterThan(0.4) // B ring, lit ansa
    expect(a[s.index(-1.75, 0)]).toBeGreaterThan(0.4)
    expect(s.tint[s.index(1.75, 0)]).toBe(TINT_RING_B)
  })

  it('is flattened at the poles', () => {
    const s = stage(SATURN)
    const a = s.at(0)
    expect(a[s.index(0.3, 0.8)]).toBeGreaterThan(0.1)
    expect(a[s.index(0.3, 0.97 * Math.sqrt(1 - 0.09))]).toBeLessThan(0.1) // inside a sphere, outside the spheroid
  })

  it('draws edge glyphs on silhouettes only', () => {
    const s = stage(SATURN)
    const a = s.at(0)
    let edges = 0
    for (let i = 0; i < a.length; i++) {
      if (s.shape[i] > 0 && s.shape[i] <= SHAPE_HIGH) {
        edges++
        expect(a[i]).toBeGreaterThan(0.1)
      }
    }
    expect(edges).toBeGreaterThan(100)
    expect(edges).toBeLessThan(a.length * 0.1)
  })

  it('leaves space dark except for faint stars', () => {
    const s = stage(SATURN)
    const a = s.at(0)
    let lit = 0
    for (let x = 0; x < s.cols; x++) {
      expect(a[x]).toBeLessThanOrEqual(STAR_MAX + 1e-6) // top row is always clear of the rings
      if (a[x] > 0) {
        lit++
        expect(s.tint[x]).toBe(TINT_STAR)
      }
    }
    expect(lit).toBeLessThan(s.cols * 0.05)
    expect(s.scene.stars.length).toBeGreaterThan(0)
  })

  it('shows a moon somewhere in the frame over an orbit', () => {
    const s = stage(SATURN)
    let seen = 0
    for (let t = 0; t < 150_000; t += 5000) {
      s.at(t)
      if (s.tint.includes(TINT_MOON)) seen++
    }
    expect(seen).toBeGreaterThan(5)
  })
})

describe('other bodies', () => {
  it('the Sun has no night side and glows past its edge', () => {
    const s = stage(SUN)
    const a = s.at(0)
    // Only its lower left is on screen: walk from deep inside out through the edge.
    const dir = [-Math.SQRT1_2, -Math.SQRT1_2]
    const along = (r: number): number => a[s.index(dir[0] * r, dir[1] * r)]
    expect(along(0.3)).toBeGreaterThan(0.6)
    expect(along(0.9)).toBeGreaterThan(0.3)
    expect(along(0.9)).toBeLessThan(along(0.3)) // limb darkening
    let glow = 0
    for (let r = 1.03; r < 1.35; r += 0.02) glow = Math.max(glow, along(r))
    expect(glow).toBeGreaterThan(0.02) // corona
    expect(glow).toBeLessThan(along(0.3))
  })

  it('the Moon goes through phases', () => {
    const s = stage(MOON)
    const litFraction = (t: number): number => {
      const a = s.at(t)
      let lit = 0
      let disc = 0
      for (let v = -0.9; v <= 0.9; v += 0.1) {
        for (let u = -0.9; u <= 0.9; u += 0.1) {
          if (u * u + v * v > 0.8) continue
          disc++
          if (a[s.index(u, v)] > 0.15) lit++
        }
      }
      return lit / disc
    }
    const phases = [0, 6000, 12_000, 18_000, 24_000, 30_000, 36_000, 42_000].map(litFraction)
    expect(Math.max(...phases)).toBeGreaterThan(0.9) // near full
    expect(Math.min(...phases)).toBeLessThan(0.35) // a crescent
  })

  it('the Earth is a small blue disc of ramp glyphs in the Moon\'s sky, on wide and tall screens', () => {
    for (const [vw, vh] of [[1440, 900], [390, 844], [812, 375]]) {
      const { cols, rows } = grid(vw, vh)
      const scene = createScene(cols, rows, MOON)
      const lum = new Float32Array(cols * rows)
      const tint = new Uint8Array(cols * rows)
      const shape = new Uint8Array(cols * rows)
      renderScene(scene, 0, lum, tint, shape)
      const blue = MOON.companion!.tint
      let cells = 0
      let brightest = 0
      let x0 = cols
      let x1 = -1
      let y0 = rows
      let y1 = -1
      for (let i = 0; i < tint.length; i++) {
        if (tint[i] !== blue) continue
        cells++
        brightest = Math.max(brightest, lum[i])
        expect(shape[i]).toBe(0) // plain ramp glyphs, like everything else
        x0 = Math.min(x0, i % cols)
        x1 = Math.max(x1, i % cols)
        y0 = Math.min(y0, Math.floor(i / cols))
        y1 = Math.max(y1, Math.floor(i / cols))
      }
      expect(cells).toBeGreaterThanOrEqual(3)
      expect(cells).toBeLessThan(40)
      expect(x1 - x0).toBeLessThan(9) // one small disc, wholly in frame
      expect(y1 - y0).toBeLessThan(5)
      expect(x0).toBeGreaterThan(0)
      expect(x1).toBeLessThan(cols - 1)
      expect(y0).toBeGreaterThan(0)
      expect(brightest).toBeGreaterThan(0.4)
      expect(MOON.palette[blue]).toBe('#5B9BFF')
    }
  })

  it('Mars has Phobos and Deimos in frame at the start', () => {
    const s = stage(MARS)
    s.at(0)
    // Two tiny discs of ramp glyphs: Phobos to the left of the planet, Deimos further out.
    let cells = 0
    for (let i = 0; i < s.tint.length; i++) {
      if (s.tint[i] !== TINT_MOON) continue
      cells++
      expect(s.shape[i]).toBe(0)
    }
    expect(cells).toBeGreaterThanOrEqual(4)
    expect(cells).toBeLessThan(30)
    expect(MARS.moons).toHaveLength(2)
  })

  it('Pluto is small and far, with Charon beside it and a crowded sky', () => {
    expect(BODIES).not.toContain(PLUTO)
    expect(bodyByName('pluto')).toBeUndefined()
    for (const [vw, vh] of [[1440, 900], [390, 844], [812, 375]]) {
      const { cols, rows } = grid(vw, vh)
      const scene = createScene(cols, rows, PLUTO)
      expect(scene.fit.radius * 2).toBeLessThan(Math.min(cols, rows * 2) * 0.35)
      expect(scene.stars.length).toBeGreaterThan(createScene(cols, rows, MOON).stars.length * 1.8)
      const lum = new Float32Array(cols * rows)
      const tint = new Uint8Array(cols * rows)
      const shape = new Uint8Array(cols * rows)
      renderScene(scene, 0, lum, tint, shape)
      let charon = 0
      let heart = 0
      for (let i = 0; i < tint.length; i++) {
        if (tint[i] === PLUTO.companion!.tint) charon++
        if (tint[i] === 6) heart++
      }
      expect(charon).toBeGreaterThanOrEqual(4)
      expect(heart).toBeGreaterThanOrEqual(3) // the pale heart faces the viewer
    }
  })

  it('Jupiter and the Sun do not fit on the screen', () => {
    for (const body of [JUPITER, SUN]) {
      const s = stage(body)
      const f = s.scene.fit
      expect(f.cx + f.radius).toBeGreaterThan(s.cols)
      expect(f.radius * 2).toBeGreaterThan(s.rows) // more than half the height
    }
  })

  it('Mercury has the Sun at the right edge of the frame', () => {
    const s = stage(MERCURY)
    const a = s.at(0)
    let edge = 0
    for (let y = 0; y < s.rows; y++) if (a[y * s.cols + s.cols - 1] > 0.3) edge++
    expect(edge).toBeGreaterThan(s.rows * 0.5)
    expect(a[s.index(0.8, 0)]).toBeGreaterThan(a[s.index(-0.8, 0)]) // lit from that side
  })

  it('Venus is always less than full', () => {
    const s = stage(VENUS)
    for (const t of [0, 12_000, 24_000, 36_000]) {
      const a = s.at(t)
      expect(a[s.index(0.7, 0)]).toBeGreaterThan(0.35)
      expect(a[s.index(-0.85, 0)]).toBeLessThan(0.1)
    }
  })

  it('a Galilean moon casts a shadow on Jupiter when it crosses the disc', () => {
    const s = stage(JUPITER)
    let shadowed = 0
    // Compare against the same scene with the moons taken away.
    const bare = stage({ ...JUPITER, moons: [] })
    for (let t = 0; t < 300_000; t += 2500) {
      const a = s.at(t)
      const b = bare.at(t)
      for (let i = 0; i < a.length; i++) {
        if (s.tint[i] !== TINT_MOON && b[i] > 0.4 && a[i] < b[i] - 0.15) {
          shadowed++
          break
        }
      }
    }
    expect(shadowed).toBeGreaterThan(0)
  })
})
