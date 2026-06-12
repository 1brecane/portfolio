# Hero & Terminal Enhancements — Design

**Date:** 2026-06-13
**Branch:** `development`
**Status:** Approved by Samuele (visual companion session: all four options A–D selected). Implementation on hold until Samuele gives the go.

## Goal

Make the hero terminal feel like a real shell and a second content channel: persistent
scrollback with `help`/history, more content commands (`neofetch`, `ls`, `cat`, `sudo`),
a human typewriter rhythm with instant skip and reduced-motion support, and a realistic
`samuele@portfolio:~$` prompt with a live window title. No changes to the drag /
minimize / close window chrome, and no regression of the existing `color N` palette
command or the hidden-input mobile keyboard model.

## Architecture

- **New composable `src/composables/useTerminalShell.js`** — owns all interactive-shell
  state and logic: scrollback entries, command history, command dispatch. Extracted from
  `HeroSection.vue` (which is ~390 lines and growing): the component keeps only template,
  window chrome (drag/minimize/close), typewriter wiring, and focus handling. The
  composable receives what it needs (i18n `t`, `setColorScheme`) and exposes:
  - `entries` — array of `{ cmd, output }` scrollback entries, where `output` is an
    array of `{ text, kind }` lines (`kind` ∈ `"plain" | "accent" | "error" | "dim"`,
    mapped to theme classes by the template). Capped at **50** entries (oldest dropped).
  - `run(cmd)` — dispatches a command line, pushes the entry.
  - `historyPrev()` / `historyNext()` — returns the command string to put in the input
    (↑/↓ recall; session-only, no persistence).
  - `clear()` — empties `entries` (used by the `clear` command internally).
- **`useTypewriter.js`** is extended in place (rhythm, skip, reduced motion — see C).
- **i18n:** every user-visible localized string goes in BOTH `en.js` and `it.js`
  (same shapes). Pure ASCII art stays unlocalized in `terminalEasterEggs.json`.
- The existing keydown model is unchanged: a visually hidden `<input>` receives keys;
  `handleKey` in `HeroSection.vue` forwards Enter/Backspace/chars as today, plus
  ArrowUp/ArrowDown to the history functions.

## A — Real shell: scrollback, help, not-found, history, clear

- **Scrollback:** every executed command appends an entry; entries render in order
  above the prompt line (replacing today's single `lastCommand`/`commandOutput` pair,
  which gets overwritten on each command).
- **Layout containment:** the terminal body gets `max-height` (≈ `22rem`) with
  `overflow-y: auto`; after each command the body auto-scrolls to the bottom
  (`nextTick`). The hero layout no longer grows with output.
- **`help`:** lists available commands with one-line descriptions (localized i18n
  strings). Listed commands: `help`, `whoami`, `ls`, `cat <file>`, `neofetch`,
  `color <1|2|3>`, `clear` — `sudo` and `starwars` stay undocumented (eggs).
- **Unknown command:** `bash: <cmd>: command not found` (kept in literal English —
  authentic shell speak, not localized) followed by a localized dim hint line
  ("type `help` for commands" / "digita `help` per i comandi").
- **History:** ↑ recalls older commands, ↓ moves back toward the empty prompt.
  Session-only (no localStorage). Behaves like bash: history index resets after Enter.
- **`clear`:** clears everything visible in the body — the intro lines AND the
  scrollback — like a real `clear`. (A `hideIntro` flag in the component skips
  rendering the typewriter lines after a clear; re-running is not possible, which is
  fine — a real `clear` doesn't bring scrollback back either.)
- **`whoami`** becomes a real command (`samuele_ruaro`) since users will try it after
  seeing the intro.
- **Hint update:** the idle hint (`t.hero.terminalHint`) now suggests `help`
  (e.g. "tip: this terminal is interactive — try `help`"). Both locales.

## B — Content commands

All exact-match lowercase except the `sudo` prefix. Outputs use the `kind` palette.

- **`neofetch`** — ASCII art block (unlocalized, stored inline in the composable or in
  `terminalEasterEggs.json`) next to a profile card with localized field labels/values:
  user line `samuele@portfolio`, OS: `Fedora (btw)`, Role (localized), Stack
  (`Node.js · Proxmox`), Uptime (localized "since 2003" / "dal 2003").
- **`ls`** — `about.txt  projects.txt  starwars.txt` (one line, plain).
- **`cat ./about.txt`** (and bare `cat about.txt`) — re-prints the about lines from the
  intro (`t.hero.terminal` content lines, reused — single source of truth).
- **`cat ./projects.txt`** (and `cat projects.txt`) — 2–3 localized lines naming the
  highlighted projects + a dim invitation to scroll to the projects section.
- **`cat ./starwars.txt`** (and `cat starwars.txt`) — existing ASCII art from
  `terminalEasterEggs.json`, unchanged.
- **`cat`** with a missing/unknown file — `cat: <file>: No such file or directory`
  (literal English, like not-found).
- **`sudo <anything>`** — localized joke, e.g. EN
  `[sudo] permission denied: this incident will be reported ☕` /
  IT `[sudo] permesso negato: l'incidente verrà segnalato ☕` (error kind).
- **`color` / `color <1|2|3>`** — existing behavior preserved verbatim (usage lines,
  palette switch through `useColorScheme`).

## C — Human typewriter + skip + reduced motion

`useTypewriter(lines)` keeps its API (`displayedLines`, `isFinished`) and adds:

- **Rhythm:** per-char delay random in **18–46 ms**; **+140 ms** after `,.;:!?`;
  occasionally (+~12% of spaces) +90 ms; between lines **320 ms** (was constant
  30 ms / 500 ms). Constants commented TUNABLE.
- **`finish()`** — new exported function: cancels timers and reveals all lines
  instantly (sets `displayedLines` to the full source, marks finished).
- **Reduced motion:** if `prefers-reduced-motion: reduce` at mount (or on media-query
  change), render everything instantly — equivalent to `finish()` on start. Today the
  typewriter ignores the preference.
- **Skip wiring in `HeroSection.vue`:** while the intro is typing, a click on the
  terminal body or any key in the hidden input calls `finish()` instead of being
  ignored (today `handleKey` returns early until `isFinished`). The skip keypress is
  consumed (does not also become input).
- Locale switch still restarts the typewriter (existing `watch`), unless it already
  finished — restart behavior unchanged.

## D — Realistic prompt + live window title

- **Prompt:** the bare `$` becomes `samuele@portfolio:~$` rendered as colored spans:
  `samuele@portfolio` in the green chart token, `:` and `$` in foreground, `~` in
  primary. Applied to: the interactive prompt line, each scrollback entry's command
  line, and the intro lines that start with `"$ "` (the `$` prefix is stripped and the
  prompt prefix is rendered in its place — i18n intro strings are unchanged).
- **Window title:** the static `bash` in the title bar becomes `samuele@portfolio: ~`;
  after a command runs it shows `samuele@portfolio: <cmd>` (truncated with ellipsis
  past ~24 chars). Resets to `~` on `clear`.
- A `<span aria-hidden>` is NOT needed: the prompt is real text; screen readers read
  "samuele@portfolio:~$ whoami" which is acceptable and authentic. The hidden input
  keeps its existing `aria-label`.

## Accessibility & guards

- Reduced motion: typewriter instant (C); cursor blink already covered by the global
  reduced-motion override.
- The scrollback is plain text divs — no live region needed (the user typed the
  command themselves); no `aria-live` to avoid chatty screen-reader output.
- Touch/mobile: unchanged hidden-input model; scrollback max-height keeps the hero
  compact on phones.
- All new user-visible strings in both `en.js` and `it.js` in the same commit.

## Out of scope

Tab-completion, simulated filesystem beyond the three fixed files, history
persistence, drag/minimize/close changes, terminal resize, sound, any change to
`AsciiStarfield`/galaxy, new sections.

## Verification

`npm run lint` (0 errors; 3 pre-existing warnings baseline) + `npm run build`, plus a
visual pass on :5174: intro skip by click/key, reduced-motion instant intro, `help`,
unknown command, history ↑/↓, `clear`, scrollback overflow scrolling, `neofetch`/`ls`/
`cat` variants, `sudo` joke, `color 2` still works, prompt/title rendering, both
locales, mobile emulation.

`docs/features.md` gains a "Hero terminal" subsection documenting the shell behavior,
commands table, typewriter tunables, and prompt/title — in the same change.
