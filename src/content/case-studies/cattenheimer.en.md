# Building Cattenheimer

## Context

Cattenheimer is a 2D pixel-art platformer written in **Python** with
**pygame-ce**: an explorer cat armed with grenades, a stamina bar, and a world
to cross. The name is exactly what it sounds like — *cat* plus *Oppenheimer* —
because the entire combat system revolves around throwing grenades.

It was my first real game-development project. I had just studied the basics of
Python and wanted to put them to work on something more alive than exercises, so
I spent my free time building a game. It also doubled as the exam project for one
of my ITS courses, but honestly the exam was the excuse: I was building it for
myself. I started from a YouTube tutorial to learn the fundamentals, then walked
away from it step by step — my own tileset, my own map, my own game mechanics,
and a protagonist of my own: a small cat from a well-made free asset pack I found
on itch.io, which felt like the right hero for the tone of the game.

![The opening meadow of Cattenheimer, with the tutorial sign explaining the controls](/case-studies/cattenheimer-tutorial.png)

## Challenges

Three things turned out to be much harder than the tutorial made them look:

- **Collisions.** At first I simply didn't know how to handle them. Tiles are not
  full squares — grass has ragged edges, slopes are diagonal — so naive
  rectangle-vs-rectangle checks made the cat float above the ground or snag on
  invisible corners.
- **Performance.** An early version recalculated far too much every frame, and
  the whole game lagged. A platformer that stutters is unplayable, so this had
  to be fixed, not tolerated.
- **Versions.** Before this project my idea of version control was folders on
  Google Drive. That stopped scaling almost immediately.

## Technical solutions

For collisions I ended up building the terrain geometry **from the pixels of the
tiles themselves**. At load time the game scans each terrain tile once: tiles
with a flat top profile get an exact hitbox cropped to their visible pixels,
while slanted tiles get a **per-column heightmap** — the surface height under
every pixel column — so characters genuinely follow the slope profile instead of
stair-stepping over it. Grenades use the full tile rectangles instead, which
suits a bouncing projectile. Collision checks only look at the handful of grid
cells an entity actually overlaps, never the whole map.

The performance fix was classic and satisfying: instead of scaling and drawing
every tile every frame, the entire map is **pre-rendered once onto a single
surface** (with a cache of scaled tiles), and each frame just blits that surface
at the camera offset. Behind it, a four-layer parallax background scrolls at
different speeds for depth.

![Deep inside the cave, dodging projectiles from a skeleton enemy](/case-studies/cattenheimer-cave.png)

Around that core the project grew a real structure: modular packages
(`core` for the game loop and assets, `world` for camera and collisions,
`entities` for characters and weapons, `ui` for menus). Levels are built in
**Tiled**, with object layers placing the player spawn, enemies, items and the
tutorial signs; enemies carry per-instance properties like health and chase
speed, so difficulty is tuned in the editor, not in code. Combat offers three
grenade types with a hold-to-aim throw — the longer you aim, the farther it
flies — and movement runs on a stamina pool drained by sprinting and jumping.
Settings (volume, difficulty, fullscreen) persist to a JSON file.

This is also the project that taught me **why version control exists**. The
first commit of my first ever Git repository is Cattenheimer's initial commit,
and the history after it — refactors into modules, collision fixes, feature
commits — is the story of the project in a way a Drive folder never was.

## Outcome

The project sat still for quite a while, then I picked it back up with more
experience and it showed: I refactored the weakest parts, translated the whole
codebase to English, made the AI smarter and added knockback, grenade aiming and
settings persistence. Today Cattenheimer is one big, complete level — effectively
one long tutorial — and that's the honest current state: a foundation. The plan
is to grow it into a proper multi-level game, redesigning what I now know how to
do better.

![The floating islands near the end of the level, with a red planet on the horizon](/case-studies/cattenheimer-islands.png)

More than the game itself, what I keep from this project is the jump it forced:
from Python exercises to a living codebase with real constraints — frame budget,
collision edge cases, an editor pipeline — and from folders on Drive to Git. The
full source is on [GitHub](https://github.com/1brecane/cattenheimer).
