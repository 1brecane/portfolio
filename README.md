# portfolio

The personal page of **Samuele Ruaro**. It is a single screen. The browser ray-casts a celestial
body in real time and draws it as ASCII characters on a canvas. Which body depends on the day of
the week, because the days are named after them: Sunday the Sun, Monday the Moon, Tuesday Mars,
Wednesday Mercury, Thursday Jupiter, Friday Venus, Saturday Saturn. There is no image: surface,
light and shadows are computed per character. On top sit the name, two links (GitHub, LinkedIn)
and a faint label with the day and the body.

Built with Vite, vanilla TypeScript and Canvas 2D. It has **zero runtime dependencies**, and the
page itself is about 28 KB (about 12 KB gzipped). The build also emits a 13 KB link preview image.

## Features

- **ASCII grid**: a full-viewport canvas holds a character grid. The ramp is `" .:-=+*#%@"`.
  Each glyph takes a colour from the body's own palette, and brighter glyphs are more opaque.
  Cells are 5 to 10 px wide depending on the viewport, with at most 200 columns and 16,000 cells.
  The art stays crisp on HiDPI screens (DPR capped at 2, integer device-pixel cells).
- **Seven bodies**, one per weekday (the visitor's local day). `?body=jupiter` shows one directly.
  Each has its own framing, not just its own surface.
  - *Sun*: too big for the screen, an arc coming in from the top right. White-hot centre
    darkening to orange at a sharp edge, boiling granulation, sunspots, low prominences, a faint
    corona.
  - *Moon*: the near side with its maria and ray craters, going through its phases. The Earth is
    a small blue disc in its sky, with clouds and the same phase.
  - *Mars*: rust plains, the dark regions (Syrtis Major, Acidalia...), Valles Marineris, the four
    great volcanoes, both polar caps, a pale line of atmosphere along the edge. Phobos and Deimos
    orbit at their real distances; Deimos is in frame only for part of its orbit.
  - *Mercury*: warm grey-tan, cratered, lit hard from the right, where the Sun's edge glows at
    the side of the frame.
  - *Jupiter*: bigger than the screen and cut by its edges. Flattened, belts and zones that drift
    with its rotation, the Great Red Spot, and the four Galilean moons, which cross the disc and
    cast their shadows on it.
  - *Venus*: under its clouds, pale cream, never full, with the dark sideways "Y" of its cloud
    tops racing round backwards.
  - *Saturn*: flattened 9.8%, rings (C, B, Cassini division, A) rolled steeper on portrait
    screens, ring shadow on the planet and planet shadow on the rings, three inner moons.
- **Motion**: the light sweeps around the body, bodies turn at their own pace, moons orbit at
  their real distances and period ratios (one day takes 150 s), a few stars twinkle.
- **Edge glyphs**: a cell on a silhouette draws the glyph that follows the edge (`- _ ¯ / | \`)
  instead of a brightness glyph, so the outline of the rings and the limb stay sharp. A moon is one `o`;
  Phobos, Deimos and the Earth are tiny shaded discs of ordinary glyphs.
- **404**: `404.html` shows Pluto, the body with no day of the week, small and far with Charon
  beside it, one line of text and a link home. Hosts serve it at any address, so the build makes
  its addresses absolute: `/`, or the path of `SITE_URL` when the site lives in a sub-folder.
- **Outside the page**: the browser console prints the day's body in colour. Saturn, as the
  page's emblem, is also what link previews show and what visitors without JavaScript get as a
  still frame. All three come from the same scene code.
- **Reveal**: a 2.2 s diagonal "decoding" sweep plays first. Rendering is capped at 30 fps and
  redraws only the cells that changed.
- **Name and links**: static HTML (`h1` and two links, same tab). It works without JavaScript.
  The day label is filled in by the script. The text fades in over 600 ms on a soft scrim.
- **Accessibility**: the canvas is decorative (`aria-hidden`). Links have 44 px touch targets and a
  visible focus ring. `prefers-reduced-motion: reduce` shows a static frame. The loop pauses
  while the tab is hidden.
- **Responsive**: breakpoints at 768 / 1024 / 1440 / 1920 px. There is no horizontal scroll from
  320 px to 4K. Resizing rebuilds the grid and never replays the reveal.

## Tech stack

- **Vite 8**: dev server and static build
- **TypeScript 7**, `strict`, vanilla DOM (no framework)
- **HTML5 Canvas 2D**: pre-rendered glyph atlas, dirty-cell redraw
- **Plain CSS**: custom properties, system monospace font stack, no web fonts
- **Vitest 5**: unit tests (Node environment)
- Runtime dependencies: **none** (`package.json` has only 3 devDependencies)

## Prerequisites

- Node.js `>= 22.12` (developed on 22.22)
- npm 10+

## Getting started

```bash
npm install          # installs the 3 dev dependencies (vite, typescript, vitest)
npm run dev          # dev server with HMR (http://localhost:5173)
npm run build        # type-check (tsc --noEmit) + production build to dist/
npm run preview      # serve the built dist/ locally
npm test             # run the unit tests once (vitest run)
npm run test:watch   # vitest in watch mode
npm run typecheck    # tsc --noEmit only
```

No environment variables are needed.

## Project structure

```
index.html                 the page: canvas + name + two links (static HTML, works without JS)
vite.config.ts             base './', build target es2022, build-only CSP meta plugin, Vitest config
tsconfig.json              strict TypeScript, noEmit
src/
  main.ts                  bootstrap: picks the day's body, starts the art, fills the label
  styles.css               all styles and design tokens (colors, spacing, breakpoints)
  config.ts                every tunable constant (ramp, palette, breakpoints, scene, timings, caps)
  ascii/
    layout.ts              grid size per viewport and DPR (pure)
    bodies.ts              the seven bodies: palette, shape, light, moons, surface function (pure)
    scene.ts               the scene: fit to the grid, ray-cast shading, edges, moons, stars (pure)
    frame.ts               a frame as data, and as text / console arguments (pure)
    animation.ts           reveal schedule, ramp levels, per-frame levels (pure)
    atlas.ts               pre-rendered glyph tiles, one row per palette colour
    renderer.ts            draws changed (or all) cells to the canvas
    controller.ts          rAF loop, resize, visibility, reduced motion
build/
  plugins.ts               Vite plugins: <noscript> still frame, preview image
  og.ts                    link preview image: bitmap font and PNG writer, no dependencies
tests/
  layout.test.ts           grid layout invariants across viewports and DPRs
  scene.test.ts            every body: surface, fit per viewport, motion; Saturn, Sun, Moon, Jupiter in detail
  animation.test.ts        hashing, reveal schedule, level mapping, frame computation
  frame.test.ts            text / console output, preview PNG
  content.test.ts          index.html content (name, links) and package.json (no runtime deps)
public/robots.txt          allows all crawlers
references/                stack best-practice notes for contributors
```

## How the art works

1. `computeSceneFit` places the body: fitted in the free area above the text by default, or
   where the body's own `place` function says (Sun, Jupiter, Mars, Mercury). With rings it also
   picks the roll (18° to 56°) that lets the planet be largest for the viewport.
2. `renderScene` shades each cell that can touch the body, its glow or its rings with 2x2 rays:
   spheroid hit, the body's surface at that point (turned back by its spin), Lambert light,
   then shadows (rings on planet, planet on rings, moons on planet). Surfaces are built from
   value noise and from round patches placed at real coordinates, and drawn once into a 360x180
   map when the page starts; only the Sun, which boils, is computed live. Cells on an edge against
   space are sampled again (3x4) and the first moments of their luminance give the edge
   direction, which picks the edge glyph. The result is a luminance, a palette colour and a glyph
   shape per cell. The page shades every other frame.
3. The luminance maps to the 10-level ramp. Glyph alpha is `0.3 + 0.7 * level / 9`. After the
   reveal a cell moves at most one level per frame, and the renderer blits only the cells that
   changed, using tiles from the glyph atlas (one tile per colour, shape and level).

All tunables live in `src/config.ts`.

## Deploy

A push to `main` deploys the site: `.github/workflows/deploy.yml` runs on the self-hosted runner,
builds the Docker image (the build runs the tests first, so a failing test stops the deploy) and
replaces the `portfolio` container on port 8080, which Cloudflare fronts as samueleruaro.com.

- **Image**: `Dockerfile` builds `dist/` with `SITE_URL` set, so the link preview tags are
  absolute, and serves it with nginx. There is no backend, no secret and no environment variable
  at run time.
- **nginx** (`nginx/site.conf`): unknown addresses get `404.html` with a real 404 status; files
  under `/assets/` are cached for a year, everything else is revalidated.
- **Security headers** (`nginx/headers.conf`): the Content-Security-Policy as a response header
  with `frame-ancestors 'none'`, plus `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, HSTS and `Permissions-Policy`. The build also writes the CSP as a `<meta>`
  tag (`vite.config.ts`): keep the two in step.
- **Elsewhere**: `dist/` is fully static, so any static host works. Build with
  `SITE_URL=https://example.com npm run build`; without it `og.png` is built but not referenced.
- **The previous site** (Vue 3) is on the `v1` branch, tagged `v1-final`. To bring it back, run
  the workflow by hand on that branch.

## Credits

The first version converted a Pexels photo of Saturn by "zelch" (id 20337608). The Saturn scene
is modelled on it; the photo itself is neither shipped nor kept in the repository.

## Branch convention

`main` is the live site: a push to it deploys. `v1` is the previous site, kept for reference.
