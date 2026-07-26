#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// bake-planets.mjs — the AsciiPlanets.vue asset pipeline (spec §2/I1).
//
// @glyphcss/core ships parametric mesh generators (spherePolygons,
// ringPolygons — see node_modules/@glyphcss/core/dist/index.d.ts) and each
// returned Polygon carries its own `color` field. There is no need for GLB
// export/import or equirectangular PNG textures: the sphere/ring is built
// procedurally and each face's color is baked directly from the same
// tex(lon,lat) / bandTex(lon,lat) / PALETTES functions the old canvas
// AsciiPlanets.vue used — evaluated once at the face centroid instead of
// per-pixel every frame. No three.js, no gltf-transform, no image files.
//
// Run on demand (`npm run bake:planets`) when palette/texture logic changes;
// the committed JSON in src/assets/planets/ is the build input, not generated
// at build time. Deterministic — no randomness, so re-runs are byte-stable.
// ════════════════════════════════════════════════════════════════════════════
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spherePolygons, ringPolygons } from "@glyphcss/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "src", "assets", "planets");
mkdirSync(OUT_DIR, { recursive: true });

// ── ported verbatim from the old src/components/AsciiPlanets.vue ────────────
const PALETTES = {
  warm: [[0, [58, 16, 12]], [0.25, [200, 55, 30]], [0.5, [255, 110, 65]], [0.75, [255, 190, 140]], [1, [255, 250, 245]]],
  blue: [[0, [10, 28, 66]], [0.25, [22, 95, 185]], [0.5, [55, 175, 255]], [0.75, [170, 232, 255]], [1, [248, 252, 255]]],
  green: [[0, [10, 42, 16]], [0.25, [34, 140, 38]], [0.5, [95, 220, 85]], [0.75, [200, 255, 175]], [1, [248, 255, 248]]],
  // Python's two-tone identity: navy shadow → Python blue → azure, brightest
  // bands tipping into gold (case-study emblem for pygame projects).
  python: [[0, [12, 24, 54]], [0.3, [38, 86, 150]], [0.55, [80, 160, 220]], [0.8, [255, 208, 92]], [1, [255, 248, 225]]],
};

// The site's dark --background (globals.css oklch(0.15 0.005 250)), approximated
// in sRGB — used to bake a dimmed variant for the case-study "ambient" emblem
// worlds. There is no runtime color-alpha (S3 — see AsciiPlanets.vue header),
// so the old AMBIENT_ALPHA≈0.5 look is replaced by baking the blend in.
const BACKGROUND_RGB = [15, 17, 22];

function shadeColor(b, stops) {
  const x = b < 0 ? 0 : b > 1 ? 1 : b;
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const f = (x - t0) / (t1 - t0 || 1);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return stops[stops.length - 1][1];
}
function toHex([r, g, b]) {
  const h = (n) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
function dim([r, g, b], factor) {
  const [br, bg, bb] = BACKGROUND_RGB;
  return [r + (br - r) * factor, g + (bg - g) * factor, b + (bb - b) * factor];
}
function tex(lon, lat) {
  const v =
    0.5 +
    0.28 * Math.sin(lat * 3.0) +
    0.3 * Math.sin(lon * 2.0 + 1.3) * Math.cos(lat * 1.7) +
    0.18 * Math.sin(lon * 5.0 + lat * 3.0);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
// Jupiter-like gas giant: wavy latitudinal bands plus one bright "great spot".
function bandTex(lon, lat) {
  let v =
    0.52 +
    0.3 * Math.sin(lat * 6.0 + 0.5 * Math.sin(lon * 3.0 + lat * 2.0)) +
    0.14 * Math.sin(lat * 13.0 + 0.35 * Math.sin(lon * 2.0));
  const dLon = Math.atan2(Math.sin(lon - 0.9), Math.cos(lon - 0.9));
  const spot = (dLon * dLon) / 0.36 + ((lat - 0.38) * (lat - 0.38)) / 0.055;
  if (spot < 1) v = Math.max(v, 0.95 - 0.55 * spot);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Face-centroid → object-space lon/lat (deterministic, no RNG). Object-space
// (not view-space, unlike the old canvas which re-derived lon from the live
// rotation angle every frame) because the mesh itself is rotated per-frame by
// AsciiPlanets.vue now — the texture only needs to be baked once, in the
// mesh's own rest frame.
function faceLonLat(vertices) {
  let cx = 0, cy = 0, cz = 0;
  for (const [x, y, z] of vertices) { cx += x; cy += y; cz += z; }
  const n = vertices.length;
  cx /= n; cy /= n; cz /= n;
  const r = Math.hypot(cx, cy, cz) || 1;
  const nx = cx / r, ny = cy / r, nz = cz / r;
  return { lon: Math.atan2(nx, nz), lat: Math.asin(Math.max(-1, Math.min(1, ny))) };
}

// Round to 4dp — well below one glyph cell's screen precision at any grid
// size we render at, and shrinks the committed JSON substantially.
function roundVerts(vertices) {
  return vertices.map((v) => v.map((n) => Math.round(n * 1e4) / 1e4));
}

function bakeSphere(paletteName, textureFn, { dimFactor = 0 } = {}) {
  const stops = PALETTES[paletteName];
  const polygons = spherePolygons({ center: [0, 0, 0], size: 1, subdivisions: 2 });
  for (const p of polygons) {
    const { lon, lat } = faceLonLat(p.vertices);
    const albedo = textureFn ? 0.55 + 0.45 * textureFn(lon, lat) : 0.72;
    let rgb = shadeColor(albedo, stops);
    if (dimFactor > 0) rgb = dim(rgb, dimFactor);
    p.color = toHex(rgb);
    p.vertices = roundVerts(p.vertices);
  }
  return polygons;
}

function bakeRing(paletteName) {
  const stops = PALETTES[paletteName];
  const polygons = ringPolygons({ axis: 1, radius: 1.6, halfThickness: 0.22, segments: 96 });
  for (const p of polygons) {
    const { lon } = faceLonLat(p.vertices);
    // Same 3-tone banding feel as the old drawRing()'s per-radius chars,
    // expressed as a subtle brightness ripple around the ring instead.
    const albedo = 0.55 + 0.25 * Math.sin(lon * 5.0);
    p.color = toHex(shadeColor(albedo, stops));
    p.vertices = roundVerts(p.vertices);
  }
  return polygons;
}

// sphere-warm/crescent-warm/ring-warm: the three journey worlds (full
// brightness). sphere-green/bands-python: case-study "ambient" emblems only
// (portfolio, cattenheimer) — baked dimmed toward --background (replaces the
// old runtime AMBIENT_ALPHA≈0.5, no longer possible without color-alpha).
const assets = {
  "sphere-warm": bakeSphere("warm", tex),
  "sphere-green": bakeSphere("green", tex, { dimFactor: 0.5 }),
  "bands-python": bakeSphere("python", bandTex, { dimFactor: 0.5 }),
  // Was flat albedo (textureFn null) — read as a smooth, featureless gradient
  // ("too linear") next to sphere-warm's rocky relief. Same tex() surface
  // detail now; the crescent silhouette still comes from CRESCENT_LIGHT's
  // strong directional + low ambient, not from this texture.
  "crescent-warm": bakeSphere("warm", tex),
  "ring-warm": bakeRing("warm"),
};

let totalBytes = 0;
for (const [name, polygons] of Object.entries(assets)) {
  const json = JSON.stringify(polygons.map((p) => ({ vertices: p.vertices, color: p.color })));
  const path = join(OUT_DIR, `${name}.json`);
  writeFileSync(path, json);
  totalBytes += Buffer.byteLength(json);
  console.log(`wrote ${path} (${polygons.length} faces, ${(Buffer.byteLength(json) / 1024).toFixed(1)} KB)`);
}
console.log(`\ntotal uncompressed: ${(totalBytes / 1024).toFixed(1)} KB`);
