import { hash32 } from './animation.ts'

// One definition per celestial body. The scene asks a body for its surface: given a point on
// the unit sphere in the body's own frame (x to the right, y towards the viewer when the body
// has not turned, z to its north pole) it returns how bright that point is and sets
// `surfaceTint` to the palette colour there.

export const TINT_STAR = 0
export const TINT_MOON = 1
// Saturn's ring colours, used by the scene when a body has rings.
export const TINT_RING_B = 7
export const TINT_RING_A = 8
export const TINT_RING_C = 9
export const TINT_CASSINI = 10

export interface Moon {
  a: number // orbit radius, in planet radii
  days: number // orbital period
  phase: number // where it starts on its orbit, radians
  radius: number // its own radius in planet radii, for the shadow it casts
  lum?: number // how bright its glyph is, when not the default
  disc?: number // drawn as a small shaded disc of this radius (in planet radii) instead of one glyph
}

// Another world in the sky near the body: a small disc, lit by the same light. Offsets are from
// the body's centre in its radii (x right, y up): one for wide frames, one for tall ones.
export interface Companion {
  wide: readonly [number, number]
  tall: readonly [number, number]
  radius: number // in the body's radii
  tint: number
  cloudTint: number // -1 for a world without clouds
  lum: number
}

export interface Body {
  name: string
  day: number // Date.getDay(): 0 Sunday .. 6 Saturday, or -1 for a body with no day
  stars?: number // how many times the usual number of stars its sky has
  palette: readonly string[] // 0 stars, 1 moons, 2.. the body's own colours
  flattening: number // how much shorter the polar radius is
  open: number // how far the north pole is tipped towards the viewer, radians
  openSwing: number
  roll: number // tilt of the pole on screen, radians (ignored with rings: the fit picks it)
  extent: number // half-size of the frame the body needs, in radii (ignored with rings)
  rings: boolean
  emissive: boolean // it is the light: no night side
  corona: number // outer radius of its glow in radii, 0 for none
  coronaTint: number
  spinMs: number // time on screen for one turn; 0 = always the same face, negative = backwards
  spinStart: number // how far it has already turned at t = 0, in turns
  companion?: Companion
  // Where the body goes on a w x h frame (cell widths; rows are 2 high). `bottom` is where the
  // free area ends, as a fraction of h. Without it the body is fitted and centred in the free area.
  place?(w: number, h: number, bottom: number): { cx: number; cy: number; radius: number }
  baked: boolean // the surface never changes, so it is drawn once into a map
  haze: number // how far an atmosphere carries light past the terminator
  limbGlow: number // how much an atmosphere brightens the edge of the disc
  limbTint: number
  sunTints?: readonly [number, number, number] // palette colours of the Sun's edge at the right of the frame
  lightBase: number // where the light sits, radians to the right of the viewer
  lightSwing: number // ...and how far it sweeps to each side of that
  lightPhase: number
  lightPeriodMs: number
  lightElevation: number
  moons: readonly Moon[]
  moonShadows: boolean
  // t is the scene time in ms; mu is how directly the point faces the viewer (1 centre, 0 limb).
  surface(x: number, y: number, z: number, t: number, mu: number): number
}

export let surfaceTint = 2

const DEG = Math.PI / 180
const STAR = '#CDD8F2'
const ICE = '#EEF0F2'

function lattice(x: number, y: number, z: number): number {
  return hash32((Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0, z) / 4294967296
}

// Smooth value noise in 0..1.
export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  let fx = x - xi
  let fy = y - yi
  let fz = z - zi
  fx = fx * fx * (3 - 2 * fx)
  fy = fy * fy * (3 - 2 * fy)
  fz = fz * fz * (3 - 2 * fz)
  const a = lattice(xi, yi, zi)
  const b = lattice(xi + 1, yi, zi)
  const c = lattice(xi, yi + 1, zi)
  const d = lattice(xi + 1, yi + 1, zi)
  const e = lattice(xi, yi, zi + 1)
  const f = lattice(xi + 1, yi, zi + 1)
  const g = lattice(xi, yi + 1, zi + 1)
  const h = lattice(xi + 1, yi + 1, zi + 1)
  const lo = a + (b - a) * fx + (c - a + (a - b - c + d) * fx) * fy
  const hi = e + (f - e) * fx + (g - e + (e - f - g + h) * fx) * fy
  return lo + (hi - lo) * fz
}

function fbm(x: number, y: number, z: number): number {
  return 0.57 * noise3(x, y, z) + 0.29 * noise3(2 * x + 17, 2 * y + 5, 2 * z + 3) + 0.14 * noise3(4 * x + 7, 4 * y + 31, 4 * z + 11)
}

// A round patch on the sphere: its centre, the cosine of its angular radius, and 1 / (1 - cos).
interface Spot {
  x: number
  y: number
  z: number
  cos: number
  inv: number
}

// Latitude north, longitude east (to the right as seen by the viewer), radius: all in degrees.
function spot(lat: number, lon: number, radius: number): Spot {
  const c = Math.cos(lat * DEG)
  const cos = Math.cos(radius * DEG)
  return { x: c * Math.sin(lon * DEG), y: c * Math.cos(lon * DEG), z: Math.sin(lat * DEG), cos, inv: 1 / (1 - cos) }
}

// 0 outside every spot, rising to 1 towards a centre. `feather` is how much of a spot's radius
// the rise takes (1 = all the way in), `bend` moves the border in or out, to make it irregular.
function inside(spots: readonly Spot[], x: number, y: number, z: number, feather: number, bend: number): number {
  let best = 0
  for (const s of spots) {
    const t = (x * s.x + y * s.y + z * s.z - s.cos) * s.inv + bend
    if (t > best) best = t
  }
  best /= feather
  return best > 1 ? 1 : best
}

const base = {
  flattening: 0,
  open: 0.12,
  openSwing: 0,
  roll: 0,
  extent: 1.3,
  rings: false,
  emissive: false,
  corona: 0,
  coronaTint: 0,
  spinMs: 0,
  spinStart: 0,
  baked: true,
  haze: 0,
  limbGlow: 0,
  limbTint: 0,
  lightBase: 0,
  lightSwing: 1.1,
  lightPhase: 0.69,
  lightPeriodMs: 48_000,
  lightElevation: 0.2,
  moons: [] as readonly Moon[],
  moonShadows: false,
}

// --- Sunday: the Sun -------------------------------------------------------------------------

const SUNSPOTS = [spot(14, -30, 5), spot(17, -22, 3), spot(-11, 40, 4.5), spot(-19, 150, 5), spot(9, 200, 4), spot(-15, 265, 3.5)]

export const SUN: Body = {
  ...base,
  name: 'Sun',
  day: 0,
  palette: [STAR, ICE, '#FFF8DC', '#FFE48F', '#FFC14A', '#F58B25', '#C9501A', '#8E3A14'],
  open: 0.12,
  roll: -0.13,
  extent: 1.6,
  // Too big for the screen: an arc coming in from the top right corner.
  place(w, h) {
    return w >= h ? { cx: 0.9 * w, cy: 0.08 * h, radius: 0.62 * h } : { cx: w, cy: 0.28 * h, radius: 0.8 * w }
  },
  baked: false,
  emissive: true,
  corona: 1.4,
  coronaTint: 6,
  spinMs: 260_000,
  surface(x, y, z, t, mu) {
    // Granulation: small cells that boil over time.
    const gran = noise3(x * 16, y * 16, z * 16 + t * 0.0005)
    const slow = noise3(x * 5 + 9, y * 5, z * 5 + t * 0.00006)
    // Limb darkening is what makes it a ball: white-hot in the middle, orange at the edge. As on
    // the real Sun the edge stays about half as bright as the centre, so the disc ends sharply.
    const depth = mu ** 0.6
    let l = (0.5 + 0.5 * depth) * (0.8 + 0.16 * gran + 0.1 * slow)
    const dark = inside(SUNSPOTS, x, y, z, 0.5, 0.3 * (gran - 0.5))
    if (dark > 0) {
      l *= 1 - 0.42 * dark
      if (dark > 0.5) {
        surfaceTint = 6
        return l
      }
    }
    const heat = depth + 0.2 * (gran - 0.5)
    surfaceTint = heat > 0.9 ? 2 : heat > 0.72 ? 3 : heat > 0.45 ? 4 : 5
    return l
  },
}

// --- Monday: the Moon ------------------------------------------------------------------------

const MARIA = [
  spot(33, -16, 17), // Imbrium
  spot(28, 18, 10), // Serenitatis
  spot(8, 31, 12), // Tranquillitatis
  spot(17, 59, 7), // Crisium
  spot(-8, 51, 9), // Fecunditatis
  spot(-15, 35, 5), // Nectaris
  spot(-21, -17, 10), // Nubium
  spot(-24, -39, 6), // Humorum
  spot(18, -57, 21), // Oceanus Procellarum
  spot(2, -42, 14),
  spot(-10, -23, 6), // Cognitum
  spot(56, 0, 5), // Frigoris
  spot(57, -25, 5),
  spot(55, 25, 5),
  spot(13, 4, 4), // Vaporum
]
const RAY_CRATERS = [
  spot(-43, -11, 3.5), // Tycho
  spot(10, -20, 3), // Copernicus
  spot(8, -38, 2), // Kepler
  spot(24, -47, 2.2), // Aristarchus
  spot(16, 47, 1.6), // Proclus
]

export const MOON: Body = {
  ...base,
  name: 'Moon',
  day: 1,
  palette: [STAR, ICE, '#E6E3DC', '#C6C3BC', '#A0A2A8', '#83868E', '#F6F4EE', '#5B9BFF'],
  open: 0.03,
  // The Earth, small and blue in the Moon's sky, with its clouds and its own phase.
  companion: { wide: [-2.3, 0.62], tall: [0.72, 1.36], radius: 0.13, tint: 7, cloudTint: 6, lum: 1 },
  lightSwing: 2.25, // far enough round to show crescents
  lightPhase: 0.2,
  lightPeriodMs: 120_000,
  extent: 1.15,
  lightElevation: 0.05,
  surface(x, y, z) {
    const n = fbm(x * 3, y * 3, z * 3)
    const mare = inside(MARIA, x, y, z, 0.35, 0.7 * (n - 0.5))
    const ray = inside(RAY_CRATERS, x, y, z, 0.6, 0)
    let l = 0.84 + 0.16 * n
    l += (0.5 + 0.12 * n - l) * mare
    if (ray > 0) l += (1.08 - l) * ray
    surfaceTint = ray > 0.5 ? 6 : mare > 0.65 ? (n < 0.45 ? 5 : 4) : mare > 0.2 ? 3 : n > 0.5 ? 2 : 3
    return l
  },
}

// --- Tuesday: Mars ---------------------------------------------------------------------------

const MARS_DARK = [
  spot(10, 70, 9), // Syrtis Major
  spot(-2, 72, 6),
  spot(45, -30, 12), // Acidalia
  spot(-8, 0, 6), // Meridiani and Sabaeus
  spot(-10, 20, 6),
  spot(-12, 40, 6),
  spot(-25, -40, 10), // Erythraeum
  spot(-20, 140, 12), // Cimmerium
  spot(-30, -150, 10), // Sirenum
  spot(-15, 105, 8), // Tyrrhenum
  spot(-26, -90, 5), // Solis Lacus
  spot(48, 110, 9), // Utopia
]
// Valles Marineris: a canyon a quarter of the way round the planet, drawn as a chain.
const MARS_CANYON = [-96, -88, -80, -72, -64, -56, -48, -41].map((lon, i) => spot(-6 - i * 1.1, lon, 4.2))
const MARS_BRIGHT = [spot(-42, 70, 9), spot(4, -108, 12)] // Hellas, the Tharsis rise
// The four great volcanoes: Olympus Mons and the three Tharsis Montes in a row.
const MARS_PEAKS = [spot(18, -134, 3.2), spot(11, -104, 2.2), spot(1, -113, 2.2), spot(-9, -120, 2.2)]

export const MARS: Body = {
  ...base,
  name: 'Mars',
  day: 2,
  palette: [STAR, '#E8E0D6', '#EBA466', '#D98447', '#BF6833', '#8E4C2E', '#6A3B2B', '#F4F0EA', '#F3D3BC'],
  // Tipped only a little: seen from nearer the pole, Deimos' orbit would leave the frame entirely.
  open: 0.14,
  roll: -0.3,
  // Large, and starting on the face with Valles Marineris and the volcanoes.
  place(w, h) {
    return w >= h ? { cx: 0.56 * w, cy: 0.4 * h, radius: 0.33 * h } : { cx: 0.5 * w, cy: 0.36 * h, radius: 0.42 * w }
  },
  spinMs: 200_000,
  spinStart: 0.21,
  haze: 0.04,
  limbGlow: 0.5, // its thin air shows as a pale line along the edge
  limbTint: 8,
  lightSwing: 0.8,
  // Phobos and Deimos at their real distances and periods. Both are far too small to see at this
  // scale: they are drawn as two tiny shaded discs (Phobos the larger), and their shadows are
  // drawn larger than life.
  moons: [
    { a: 2.76, days: 0.3189, phase: 1.15, radius: 0.035, lum: 1.5, disc: 0.08 }, // Phobos
    { a: 6.92, days: 1.2624, phase: 1.58, radius: 0.02, lum: 1.5, disc: 0.055 }, // Deimos
  ],
  moonShadows: true,
  surface(x, y, z) {
    const n = fbm(x * 2.5, y * 2.5, z * 2.5)
    if (z > 0.9 + 0.04 * (n - 0.5) || z < -0.955 + 0.02 * (n - 0.5)) {
      surfaceTint = 7
      return 1.1
    }
    const canyon = inside(MARS_CANYON, x, y, z, 0.6, 0)
    const dark = Math.max(canyon, inside(MARS_DARK, x, y, z, 0.4, 0.8 * (n - 0.5)))
    const bright = inside(MARS_BRIGHT, x, y, z, 0.6, 0.4 * (n - 0.5))
    const peak = inside(MARS_PEAKS, x, y, z, 0.5, 0)
    let l = 0.8 + 0.16 * n
    l += (0.36 - l) * dark
    l += (1.02 - l) * bright * (1 - dark)
    if (peak > 0) {
      // A pale summit with a dark flank, so each volcano reads as a mark.
      l = peak > 0.55 ? 1.08 : l * (1 - 0.4 * peak)
      surfaceTint = peak > 0.55 ? 2 : 5
      return l
    }
    surfaceTint = dark > 0.65 ? 6 : dark > 0.25 ? 5 : bright > 0.5 || n > 0.62 ? 2 : n > 0.42 ? 3 : 4
    return l
  },
}

// --- Wednesday: Mercury ----------------------------------------------------------------------

// Bright young craters with ray haloes, scattered over the globe.
const MERCURY_RAYS = Array.from({ length: 14 }, (_, i) =>
  spot(lattice(i, 1, 7) * 150 - 75, lattice(i, 2, 7) * 360, 9 + 9 * lattice(i, 3, 7)),
)
const CALORIS = [spot(30, 160, 16)]

export const MERCURY: Body = {
  ...base,
  name: 'Mercury',
  day: 3,
  palette: [STAR, ICE, '#DCC7A6', '#C2A985', '#A38B6E', '#86705A', '#F3E6CF', '#FFF1B8', '#FFC24D', '#F08A24'],
  open: 0.05,
  roll: -0.1,
  spinMs: 300_000,
  // The planet closest to the Sun: lit hard from the right, where the Sun's edge comes into the frame.
  sunTints: [7, 8, 9],
  place(w, h, bottom) {
    const top = 0.05
    return {
      cx: 0.45 * w,
      cy: (h * (top + bottom)) / 2,
      radius: Math.max(0, Math.min(0.8 * w, h * (bottom - top)) / 2.2),
    }
  },
  lightBase: 1.15,
  lightSwing: 0.15,
  lightElevation: 0.05,
  surface(x, y, z) {
    const n = fbm(x * 4, y * 4, z * 4)
    const pits = noise3(x * 17, y * 17, z * 17)
    let l = 0.6 + 0.3 * n + 0.14 * (pits - 0.5)
    l += 0.12 * inside(CALORIS, x, y, z, 0.5, 0.5 * (n - 0.5))
    // A bright crater, and around it a halo broken into streaks that fades on the way out.
    const halo = inside(MERCURY_RAYS, x, y, z, 1, 0)
    const streak = noise3(x * 26, y * 26, z * 26) > 0.52 ? 1 : 0.2
    const ray = halo > 0.75 ? 1 : halo * halo * 1.6 * streak
    l += (1.08 - l) * ray
    surfaceTint = ray > 0.45 ? 6 : l > 0.9 ? 2 : l > 0.8 ? 3 : l > 0.7 ? 4 : 5
    return l
  },
}

// --- Thursday: Jupiter -----------------------------------------------------------------------

// Jupiter's bands from north to south: [southern edge in degrees, palette colour, brightness].
const BELTS: readonly (readonly [number, number, number])[] = [
  [62, 8, 0.7], // polar haze
  [48, 3, 0.82],
  [40, 4, 0.78],
  [31, 2, 1],
  [24, 5, 0.72], // North Temperate Belt
  [18, 2, 1],
  [7, 6, 0.64], // North Equatorial Belt
  [1.5, 2, 0.98], // Equatorial Zone, with a faint band along the equator
  [-1.5, 3, 0.98],
  [-7, 2, 0.98],
  [-20, 5, 0.7], // South Equatorial Belt
  [-27, 2, 1],
  [-34, 4, 0.78], // South Temperate Belt
  [-48, 3, 0.86],
  [-62, 3, 0.82],
  [-Infinity, 8, 0.7],
]
const RED_SPOT_LAT = -22
const RED_SPOT_LON = 0.4 // radians east of the centre at t = 0

export const JUPITER: Body = {
  ...base,
  name: 'Jupiter',
  day: 4,
  palette: [STAR, '#E8E2D4', '#F1E7CF', '#E0C9A0', '#C99A6A', '#A8683F', '#8A4E32', '#D0573A', '#A9A093'],
  flattening: 0.065,
  open: 0.05,
  roll: -0.1,
  extent: 1.2,
  // Bigger than the screen: most of the disc, cut by the edges.
  place(w, h) {
    return w >= h ? { cx: 0.66 * w, cy: 0.44 * h, radius: 0.6 * h } : { cx: 0.6 * w, cy: 0.4 * h, radius: 0.72 * w }
  },
  spinMs: 110_000,
  lightBase: 0.2,
  lightSwing: 0.2,
  lightElevation: 0.05,
  // The Galilean moons. From the plane of their orbits they cross the disc, and so do their shadows.
  moons: [
    { a: 5.9, days: 1.769, phase: 1.25, radius: 0.026 }, // Io
    { a: 9.4, days: 3.551, phase: 4.3, radius: 0.022 }, // Europa
    { a: 15, days: 7.155, phase: 1.45, radius: 0.038 }, // Ganymede
    { a: 26.3, days: 16.689, phase: 4.75, radius: 0.034 }, // Callisto
  ],
  moonShadows: true,
  surface(x, y, z) {
    const lon = Math.atan2(x, y)
    const lat = Math.asin(z < -1 ? -1 : z > 1 ? 1 : z) / DEG
    const turb = fbm(x * 5, y * 5, z * 9)
    // The belts' edges wander with longitude, which is what makes the rotation visible.
    const L = lat + 1.4 * Math.sin(lon * 6 + lat * 0.25) + 4.5 * (turb - 0.5)
    let dLon = lon - RED_SPOT_LON
    if (dLon > Math.PI) dLon -= 2 * Math.PI
    else if (dLon < -Math.PI) dLon += 2 * Math.PI
    const sx = dLon / DEG / 11
    const sy = (lat - RED_SPOT_LAT) / 6.5
    const spotR = sx * sx + sy * sy
    const detail = 0.93 + 0.07 * noise3(x * 16, y * 16, z * 30)
    if (spotR < 1) {
      surfaceTint = 7
      return 0.8 * detail
    }
    if (spotR < 1.7) {
      surfaceTint = 2 // the pale hollow the spot sits in
      return detail
    }
    let belt = 0
    while (L <= BELTS[belt][0]) belt++
    surfaceTint = BELTS[belt][1]
    return BELTS[belt][2] * detail
  },
}

// --- Friday: Venus ---------------------------------------------------------------------------

export const VENUS: Body = {
  ...base,
  name: 'Venus',
  day: 5,
  palette: [STAR, ICE, '#FFF9E3', '#F8EDC6', '#EBDAA3', '#D6C083'],
  open: 0.08,
  roll: -0.12,
  extent: 1,
  spinMs: -150_000, // the cloud tops race round backwards
  haze: 0.16, // the thick atmosphere stretches the horns of the crescent
  limbGlow: 0.25,
  limbTint: 2,
  // Seen from Earth it is brightest as a crescent.
  lightBase: 1.15,
  lightSwing: 0.3,
  lightElevation: 0.1,
  surface(x, y, z) {
    const lon = Math.atan2(x, y)
    const lat = Math.abs(Math.asin(z < -1 ? -1 : z > 1 ? 1 : z))
    const n = fbm(x * 2.5, y * 2.5, z * 4)
    // Dark streaks swept back from the equator towards both poles: the sideways "Y" of its clouds.
    const wave = Math.sin(lon * 2 + lat * 3.4 + 3 * (n - 0.5))
    const fade = lat > 1.05 ? 0 : 1 - lat / 1.05
    const dark = wave < 0.1 ? 0 : ((wave - 0.1) / 0.9) * fade
    surfaceTint = dark > 0.6 ? 5 : dark > 0.32 ? 4 : dark > 0.1 ? 3 : 2
    return 1.04 - 0.5 * dark - 0.06 * noise3(x * 9, y * 9, z * 14)
  },
}

// --- Saturday: Saturn ------------------------------------------------------------------------

export const SATURN: Body = {
  ...base,
  name: 'Saturn',
  day: 6,
  palette: [
    STAR,
    ICE,
    '#F3E5BC', // 2 pale cream zones
    '#E8D096', // 3 butterscotch
    '#D6B67A', // 4 golden tan
    '#C09A64', // 5 darker belts
    '#B9AD93', // 6 grey-tan poles
    '#E6DCCB', // 7 B ring: bright off-white
    '#C6B8A1', // 8 A ring: grey-tan
    '#A08D78', // 9 C ring: dim brown
    '#7C6E60', // 10 Cassini division
  ],
  flattening: 0.098,
  open: 0.37, // the rings are tipped about 21° towards the viewer
  openSwing: 0.07,
  rings: true,
  lightElevation: 0.31,
  // Inner moons at their real distances and periods. Titan, at 20 radii, never enters the frame.
  moons: [
    { a: 3.08, days: 0.942, phase: 2.2, radius: 0.003 }, // Mimas
    { a: 3.95, days: 1.37, phase: 5.6, radius: 0.004 }, // Enceladus
    { a: 4.89, days: 1.888, phase: 0.9, radius: 0.009 }, // Tethys
  ],
  surface(_x, _y, z) {
    const band = Math.sin(z * 11 + 1.3 * Math.sin(z * 5))
    surfaceTint = z > 0.86 || z < -0.86 ? 6 : band > 0.5 ? 2 : band > 0 ? 3 : band > -0.5 ? 4 : 5
    return 0.86 + 0.14 * band
  },
}

// --- No day at all: Pluto, for the page that is not there ---------------------------------------

// Tombaugh Regio, the pale heart: two lobes and a point.
const PLUTO_HEART = [spot(27, -13, 15), spot(25, 13, 14), spot(9, 1, 13), spot(-7, 3, 8)]
const PLUTO_DARK = [spot(-10, -62, 22), spot(-6, -100, 18), spot(-14, 78, 20), spot(-2, 118, 14)] // Cthulhu and its like

export const PLUTO: Body = {
  ...base,
  name: 'Pluto',
  day: -1,
  stars: 2.4,
  palette: [STAR, '#B4AEA6', '#E2CDB0', '#C9A988', '#A9805F', '#70493A', '#F6F1E6'],
  open: 0.1,
  roll: -0.35,
  extent: 2.8, // small and far away
  // Charon, half its size and always in the same place in its sky.
  companion: { wide: [-3.9, 1.5], tall: [1.7, 2.3], radius: 0.5, tint: 1, cloudTint: -1, lum: 0.95 },
  lightBase: 0.25,
  lightSwing: 0.75,
  lightPeriodMs: 64_000,
  lightElevation: 0.1,
  surface(x, y, z) {
    const n = fbm(x * 2.5, y * 2.5, z * 2.5)
    const heart = inside(PLUTO_HEART, x, y, z, 0.3, 0.25 * (n - 0.5))
    const dark = inside(PLUTO_DARK, x, y, z, 0.4, 0.7 * (n - 0.5)) * (1 - heart)
    let l = 0.74 + 0.16 * n
    l += (0.4 - l) * dark
    l += (1.08 - l) * heart
    surfaceTint = heart > 0.5 ? 6 : dark > 0.6 ? 5 : dark > 0.25 ? 4 : z > 0.72 || n > 0.55 ? 2 : 3
    return l
  },
}

export const BODIES: readonly Body[] = [SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN]
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export function bodyForDay(day: number): Body {
  return BODIES[((day % 7) + 7) % 7]
}

export function bodyByName(name: string | null): Body | undefined {
  return name ? BODIES.find((b) => b.name.toLowerCase() === name.toLowerCase()) : undefined
}
