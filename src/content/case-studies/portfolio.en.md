# Building this portfolio

## Context

This site is the project you are looking at right now. I wanted a portfolio that
did more than list jobs and repositories — something that felt like a place, not a
CV in disguise. The idea I kept coming back to was a journey: you don't scroll down
a page, you fly a camera through space, and each section is a stop along the way.

It is a single-page **Vue 3** app built with **Vite** and **Tailwind CSS 4**. Content
is bilingual (English and Italian), and everything animated has to gracefully become
static when a visitor's device or preferences ask it to. I built it with heavy
AI-assisted tooling — **Claude Code** and **Cursor** — which is listed openly in the
project's own tags. That is part of the story: the interesting work was the design and
the wiring, not typing every line by hand.

## Challenges

A few things made this harder than a normal marketing page:

- **The background had to move, but never get in the way.** An animated ASCII starfield
  behind live text is a readability trap and a performance trap at the same time.
- **The scroll had to feel cinematic without breaking accessibility.** Pinned,
  camera-driven sections are exactly the kind of thing that hurts users who prefer
  reduced motion, or who are on a small phone or a metered connection.
- **Two languages, no heavy framework.** I didn't want to pull in a large i18n library
  for what is, ultimately, a personal site.
- **A downloadable CV I could gate** without standing up a real backend server.

## Technical solutions

The background is **two fixed Canvas 2D layers** sitting behind the page. The first,
`StarfieldBackground`, is a pseudo-3D depth-starfield: stars live in a `x, y, z` space
and project outward from the screen centre, so you genuinely fly *through* the field
rather than past a flat one. Glyphs like `. : · * + = % @` keep the ASCII identity, and
a rare comet crosses the sky every 15–30 seconds as a small reward for anyone watching.
The second layer, `AsciiPlanets`, renders three slowly rotating ASCII worlds — a ringed
planet at the start, a crescent glimpsed mid-flight, a full sphere at the destination —
drawn with a luminance glyph ramp so they have real depth.

The motion is driven by a scroll "camera" (`useGalaxyJourney`). Each section is a zone
with a target zoom and centre; while a section is on screen the camera *holds* that zone
so the backdrop is stable to read against, and in the empty gaps between sections it
interpolates toward the next one with a mid-gap pull-back arc — the camera dezooms to
reveal more, then pushes back in. Sections themselves are **pinned slides**: a small
composable (`useScrollPresentation`) turns scroll position into a `0→1` progress value,
and pure CSS custom properties stage the reveal of each block. Even the section titles
decode letter-by-letter out of glyphs as the slide arrives.

Crucially, all of this has an off-switch built in. Both canvases bake their fade into
each glyph's alpha (never a CSS `opacity` on the canvas, which would blur the text), pause
their animation loop when the tab is hidden, and fall back to a **single static frame**
under `prefers-reduced-motion`, on screens under 768px, or under `prefers-reduced-data`.
The whole pinned journey flattens into a normal scrolling page in those same cases, and a
manual "simple view" toggle lets repeat visitors opt out too.

For the two languages I wrote a **tiny custom i18n layer**: two plain message objects and
a shared reactive `locale` ref persisted to `localStorage` — no external dependency. The
contact form sends through **EmailJS**, imported only at send time, and is protected by
**hCaptcha**. The CV download is gated by a **Cloudflare Worker** that verifies the hCaptcha
token server-side before letting `/cv.pdf` through, with Nginx rate-limiting the same path
as a second line of defence.

Deployment is a **multi-stage Docker build** (Node build stage → Nginx runtime) shipped by
a **GitHub Actions** workflow to a **self-hosted runner** on every push to `main`. Nginx
serves pre-compressed assets and sets a strict CSP and the usual security headers.

## Outcome

The result is a portfolio that reads as a deliberate experience and still behaves for
everyone: crisp text over a living background, a cinematic flight for those who want it,
and a plain, fast, fully static page for those who don't. It taught me a lot about the
Canvas 2D API, about `prefers-reduced-motion` as a design constraint rather than an
afterthought, and about how far a small amount of custom code can go before you reach for
a framework. The full source is on
[GitHub](https://github.com/1brecane/portfolio).
