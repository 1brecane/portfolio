# Hero Terminal Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the hero terminal into a real-feeling shell: growing scrollback with `help`/history/`clear`, content commands (`neofetch`, `ls`, `cat`, `sudo`), a human typewriter rhythm with instant skip + reduced-motion support, and a `samuele@portfolio:~$` prompt with a live window title.

**Architecture:** Shell state and command dispatch move out of `HeroSection.vue` into a new `useTerminalShell.js` composable (the component keeps template, window chrome, typewriter wiring, focus). `useTypewriter.js` is extended in place. All user-visible localized strings go in BOTH `src/i18n/en.js` and `src/i18n/it.js` (same shapes, same commit); raw ASCII art stays unlocalized.

**Tech Stack:** Vue 3.5 `<script setup>`, Tailwind CSS 4 utility classes, custom i18n. **No test suite** — per CLAUDE.md the verify gate is `npm run lint` (must be **0 errors**; 3 pre-existing warnings in ProjectsSection ×2 / CvCaptchaModal ×1 are baseline) + `npm run build`. Not TDD.

**Spec:** `docs/superpowers/specs/2026-06-13-hero-terminal-design.md`

**Rules for every task:** branch `development` (verify with `git branch --show-current`), stage ONLY the listed files (never `git add -A`), never run `prettier --write` on whole pre-existing files, do NOT push.

---

### Task 1: Human typewriter rhythm + `finish()` + reduced motion (`useTypewriter.js`)

**Files:**
- Modify: `src/composables/useTypewriter.js` (full replacement below)

- [ ] **Step 1: Replace the file content**

```js
import { ref, computed, watch, onMounted, onUnmounted } from "vue";

// ── typing rhythm (TUNABLE) ─────────────────────────────────────────────────────
const CHAR_MIN_MS = 18; // fastest keystroke
const CHAR_JITTER_MS = 28; // random extra per char → 18–46ms
const PUNCT_PAUSE_MS = 140; // extra pause after , . ; : ! ?
const SPACE_PAUSE_MS = 90; // occasional hesitation on a space
const SPACE_PAUSE_CHANCE = 0.12;
const LINE_PAUSE_MS = 320; // pause between lines
const PUNCT = ",.;:!?";

/**
 * Simulates a terminal typewriter effect over an array of strings, with a
 * human rhythm (jittered per-char delay, longer pauses after punctuation).
 * Restarts when `lines` changes (e.g. locale switch). `finish()` reveals
 * everything instantly — used for click/key skip; reduced-motion users get
 * the finished state from the start (and on a live media-query flip).
 */
export function useTypewriter(lines) {
  const displayedLines = ref([]);
  const currentLineIndex = ref(0);
  const currentCharIndex = ref(0);
  let timerId = null;
  let reducedQuery = null;

  // Clears the active timeout to prevent overlapping ticks
  function stop() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  // Processes the next character or line in the sequence
  function tick() {
    const src = lines.value;
    if (currentLineIndex.value >= src.length) return;

    const line = src[currentLineIndex.value];

    if (currentCharIndex.value < line.length) {
      if (displayedLines.value.length <= currentLineIndex.value) {
        displayedLines.value.push("");
      }
      const ch = line[currentCharIndex.value];
      displayedLines.value[currentLineIndex.value] = line.slice(
        0,
        currentCharIndex.value + 1,
      );
      currentCharIndex.value++;

      let delay = CHAR_MIN_MS + Math.random() * CHAR_JITTER_MS;
      if (PUNCT.includes(ch)) delay += PUNCT_PAUSE_MS;
      else if (ch === " " && Math.random() < SPACE_PAUSE_CHANCE) delay += SPACE_PAUSE_MS;
      timerId = setTimeout(tick, delay);
    } else {
      currentLineIndex.value++;
      currentCharIndex.value = 0;
      timerId = setTimeout(tick, LINE_PAUSE_MS);
    }
  }

  // Reveal all lines instantly (skip, reduced motion). Idempotent.
  function finish() {
    stop();
    displayedLines.value = lines.value.slice();
    currentLineIndex.value = lines.value.length;
    currentCharIndex.value = 0;
  }

  // Resets state and restarts the typewriter effect
  function restart() {
    stop();
    if (reducedQuery?.matches) {
      finish();
      return;
    }
    displayedLines.value = [];
    currentLineIndex.value = 0;
    currentCharIndex.value = 0;
    tick();
  }

  function onMotionChange(e) {
    if (e.matches) finish();
  }

  // Restart effect when source lines change (locale switch)
  watch(lines, restart);

  onMounted(() => {
    reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedQuery.addEventListener("change", onMotionChange);
    restart();
  });
  onUnmounted(() => {
    stop();
    reducedQuery?.removeEventListener("change", onMotionChange);
  });

  const isFinished = computed(() => currentLineIndex.value >= lines.value.length);

  return { displayedLines, isFinished, finish };
}
```

Contract notes (do not break): `displayedLines`/`isFinished` semantics are unchanged —
`HeroSection.vue`'s `shownLines` drops the last line (`"$ _"`) once `isFinished` is true,
and `finish()` must produce exactly the full `lines.value` array so that keeps working.

- [ ] **Step 2: Verify**

Run: `npm run lint` → 0 errors (3 baseline warnings). Run: `npm run build` → success.

- [ ] **Step 3: Commit**

```bash
git add src/composables/useTypewriter.js
git commit -m "Feat: human typewriter rhythm, instant finish(), reduced-motion support"
```

---

### Task 2: Shell composable + i18n strings (`useTerminalShell.js`, `en.js`, `it.js`)

**Files:**
- Create: `src/composables/useTerminalShell.js`
- Modify: `src/i18n/en.js` (hero section: `terminalHint` + new `shell` object)
- Modify: `src/i18n/it.js` (same shapes — read the file first to mirror its phrasing style)

- [ ] **Step 1: Create `src/composables/useTerminalShell.js`**

```js
import { ref } from "vue";
import easterEggs from "@/data/terminalEasterEggs.json";

// ── shell knobs (TUNABLE) ───────────────────────────────────────────────────────
const MAX_ENTRIES = 50; // scrollback cap — oldest entries dropped

const PALETTE_NAMES = { 1: "amber", 2: "cyan", 3: "green" };

// Output line constructors. `kind` maps to a theme class in HeroSection.vue.
const plain = (text) => ({ text, kind: "plain" });
const accent = (text) => ({ text, kind: "accent" });
const error = (text) => ({ text, kind: "error" });
const dim = (text) => ({ text, kind: "dim" });

// neofetch art column — fixed-width rows; the info column is appended per row.
const NEOFETCH_ART = [
  "     ▄▄▄▄▄▄       ",
  "   ▄█▀▀▀▀▀▀█▄     ",
  "  ██  ▀  ▀  ██    ",
  "  ██   ▄▄   ██    ",
  "   ▀█▄▄▄▄▄▄█▀     ",
  "                  ",
];

/**
 * useTerminalShell({ t, setColorScheme, onClear })
 *
 * Interactive-shell brain for the hero terminal: scrollback entries, ↑/↓
 * command history (session-only) and command dispatch. The component renders
 * `entries` and forwards keys; this composable owns no DOM.
 *
 * @returns {{ entries, lastCmd, run, historyPrev, historyNext }}
 */
export function useTerminalShell({ t, setColorScheme, onClear }) {
  const entries = ref([]); // [{ id, cmd, output: [{ text, kind }] }]
  const lastCmd = ref(""); // drives the window title ("" → "~")
  const cmdHistory = [];
  let histIdx = 0; // === cmdHistory.length when not navigating
  let nextId = 0;

  function shellT() {
    return t.value.hero.shell;
  }

  // The intro's `cat ./about.txt` body: lines after the cat command up to the
  // next "$" line — single source of truth with the typewriter intro.
  function aboutLines() {
    const src = t.value.hero.terminal;
    const start = src.findIndex((l) => l.includes("about.txt"));
    if (start === -1) return [error("cat: about.txt: No such file or directory")];
    const out = [];
    for (let i = start + 1; i < src.length && !src[i].startsWith("$"); i++) {
      out.push(plain(src[i]));
    }
    return out;
  }

  function projectsLines() {
    const items = t.value.projects.items.map((p) => plain(p.title));
    return [accent(shellT().projectsIntro), ...items, dim(shellT().projectsHint)];
  }

  function neofetchLines() {
    const info = [
      "samuele@portfolio",
      "─────────────────",
      "OS: Fedora (btw)",
      shellT().neofetchRole,
      "Stack: Node.js · Proxmox",
      shellT().neofetchUptime,
    ];
    return NEOFETCH_ART.map((art, i) => accent(art + (info[i] ?? "")));
  }

  function catFile(cmd) {
    const file = cmd.replace(/^cat\s*/, "").replace(/^\.\//, "");
    if (!file) return [plain(shellT().catUsage)];
    if (file === "about.txt") return aboutLines();
    if (file === "projects.txt") return projectsLines();
    if (file === "starwars.txt") return easterEggs["cat ./starwars.txt"].map(accent);
    return [error(`cat: ${file}: No such file or directory`)];
  }

  function dispatch(cmd) {
    if (cmd === "help") return shellT().help.map(accent);
    if (cmd === "whoami") return [plain("samuele_ruaro")];
    if (cmd === "ls") return [plain("about.txt  projects.txt  starwars.txt")];
    if (cmd === "neofetch") return neofetchLines();
    if (easterEggs[cmd]) return easterEggs[cmd].map(accent);
    if (/^cat(\s|$)/.test(cmd)) return catFile(cmd);
    if (/^sudo(\s|$)/.test(cmd)) return [error(shellT().sudo)];
    if (/^color\s+[1-3]$/.test(cmd)) {
      const n = parseInt(cmd.split(/\s+/)[1]);
      setColorScheme(n);
      return [accent(`> hover palette: #${n} (${PALETTE_NAMES[n]})`)];
    }
    if (cmd === "color") {
      return [accent("> usage: color <1|2|3>"), accent("> 1: amber  2: cyan  3: green")];
    }
    // `command not found` stays literal-English (authentic shell speak); the
    // hint below it is localized.
    return [error(`bash: ${cmd}: command not found`), dim(shellT().notFoundHint)];
  }

  function run(raw) {
    const cmd = raw.trim();
    if (!cmd) return;
    cmdHistory.push(cmd);
    histIdx = cmdHistory.length;
    if (cmd === "clear") {
      entries.value = [];
      lastCmd.value = "";
      onClear?.();
      return;
    }
    lastCmd.value = cmd;
    entries.value.push({ id: nextId++, cmd, output: dispatch(cmd) });
    if (entries.value.length > MAX_ENTRIES) entries.value.shift();
  }

  // ↑ — older command, or null when there is nothing to recall.
  function historyPrev() {
    if (cmdHistory.length === 0) return null;
    histIdx = Math.max(0, histIdx - 1);
    return cmdHistory[histIdx];
  }

  // ↓ — newer command, "" when back at the empty prompt, null when not navigating.
  function historyNext() {
    if (histIdx >= cmdHistory.length) return null;
    histIdx++;
    return histIdx === cmdHistory.length ? "" : cmdHistory[histIdx];
  }

  return { entries, lastCmd, run, historyPrev, historyNext };
}
```

- [ ] **Step 2: Add the i18n strings**

In `src/i18n/en.js`, inside `hero`, replace the `terminalHint` value and add the
`shell` object after it:

```js
    terminalHint: "tip: this terminal is interactive — try `help`",
    shell: {
      help: [
        "help            this list",
        "whoami          who I am",
        "ls              list files",
        "cat <file>      print a file",
        "neofetch        profile card",
        "color <1|2|3>   galaxy hover palette",
        "clear           wipe the terminal",
      ],
      notFoundHint: "type `help` for commands",
      catUsage: "usage: cat <file>",
      neofetchRole: "Role: Backend developer",
      neofetchUptime: "Uptime: since 2003",
      projectsIntro: "Featured:",
      projectsHint: "scroll down to see them in action ↓",
      sudo: "[sudo] permission denied: this incident will be reported ☕",
    },
```

In `src/i18n/it.js` (read the file first; mirror the existing `terminalHint`
phrasing, swapping the suggested command for `help`), add the same shape:

```js
    shell: {
      help: [
        "help            questa lista",
        "whoami          chi sono",
        "ls              elenca i file",
        "cat <file>      stampa un file",
        "neofetch        scheda profilo",
        "color <1|2|3>   palette hover galassia",
        "clear           pulisce il terminale",
      ],
      notFoundHint: "digita `help` per i comandi",
      catUsage: "uso: cat <file>",
      neofetchRole: "Ruolo: Backend developer",
      neofetchUptime: "Uptime: dal 2003",
      projectsIntro: "In evidenza:",
      projectsHint: "scorri in basso per vederli in azione ↓",
      sudo: "[sudo] permesso negato: l'incidente verrà segnalato ☕",
    },
```

(Command names and the `help`/`color` usage columns stay in English in both —
they are commands, not copy. Only descriptions/jokes are localized.)

- [ ] **Step 3: Verify**

Run: `npm run lint` → 0 errors (the new composable is not imported yet — that's
fine, no unused-import error exists because nothing references it). Run:
`npm run build` → success.

- [ ] **Step 4: Commit**

```bash
git add src/composables/useTerminalShell.js src/i18n/en.js src/i18n/it.js
git commit -m "Feat: terminal shell composable — scrollback, help, history, content commands"
```

---

### Task 3: Wire the shell into `HeroSection.vue` (scrollback UI, skip, history keys)

**Files:**
- Modify: `src/components/HeroSection.vue`

Read the whole file first. It currently holds `lastCommand`/`commandOutput`/
`PALETTE_NAMES` easter-egg state and imports `terminalEasterEggs.json` directly —
all of that is replaced by the composable.

- [ ] **Step 1: Script changes**

Remove from the script: the `easterEggs` import, `PALETTE_NAMES`, `lastCommand`,
`commandOutput`, and the whole easter-egg branch of `handleKey`. Add:

```js
import { ref, computed, nextTick } from "vue";
import { useTerminalShell } from "@/composables/useTerminalShell";
```

(`nextTick` joins the existing vue import; keep everything else.)

```js
const { displayedLines, isFinished, finish } = useTypewriter(terminalLines);

// `clear` wipes the intro lines too, like a real terminal clear.
const hideIntro = ref(false);
const { entries, lastCmd, run, historyPrev, historyNext } = useTerminalShell({
  t,
  setColorScheme,
  onClear: () => {
    hideIntro.value = true;
  },
});

// Output `kind` → theme class (see useTerminalShell line constructors).
const LINE_CLASS = {
  plain: "text-foreground",
  accent: "text-chart-2",
  error: "text-destructive",
  dim: "text-muted-foreground/70 italic",
};

const termBodyEl = ref(null);
async function scrollToBottom() {
  await nextTick();
  if (termBodyEl.value) termBodyEl.value.scrollTop = termBodyEl.value.scrollHeight;
}
```

Replace `handleKey` with:

```js
function handleKey(e) {
  if (e.key === "Tab" || e.ctrlKey || e.metaKey) return;
  e.preventDefault();
  // Any key during the intro fast-forwards it (the keystroke is consumed).
  if (!isFinished.value) {
    finish();
    return;
  }
  if (e.key === "Backspace") {
    userInput.value = userInput.value.slice(0, -1);
  } else if (e.key === "ArrowUp") {
    const c = historyPrev();
    if (c !== null) userInput.value = c;
  } else if (e.key === "ArrowDown") {
    const c = historyNext();
    if (c !== null) userInput.value = c;
  } else if (e.key === "Enter") {
    run(userInput.value);
    userInput.value = "";
    scrollToBottom();
  } else if (e.key.length === 1 && !e.altKey) {
    if (userInput.value.length < 200) userInput.value += e.key;
  }
}
```

Extend `focusTerminal` (body click) to skip the intro too:

```js
function focusTerminal() {
  if (!isFinished.value) finish();
  cmdInputEl.value?.focus({ preventScroll: true });
}
```

- [ ] **Step 2: Template changes (terminal body)**

On the terminal-body `div`, add the ref and the containment classes:

```html
<div
  v-if="!isMinimized"
  ref="termBodyEl"
  class="terminal-body relative max-h-[22rem] overflow-y-auto p-6 text-left font-mono text-sm outline-none"
  @click="focusTerminal"
>
```

Wrap the intro `v-for` in a `<template v-if="!hideIntro">` (eslint forbids
`v-if` + `v-for` on the same element):

```html
<template v-if="!hideIntro">
  <div
    v-for="(line, index) in shownLines"
    :key="`line-${index}-${line}`"
    :class="line.startsWith('$') ? 'text-primary' : 'text-foreground'"
  >
    {{ line }}
    <span
      v-if="!isFinished && index === shownLines.length - 1"
      class="inline-block w-2 h-4 bg-white ml-0.5 cursor-blink"
    />
  </div>
</template>
```

Replace the old `<template v-if="isFinished && lastCommand">` block with the
scrollback (entries are append-only with stable ids):

```html
<template v-for="entry in entries" :key="entry.id">
  <div class="text-primary">$ {{ entry.cmd }}</div>
  <div
    v-for="(l, li) in entry.output"
    :key="`${entry.id}-${li}`"
    class="whitespace-pre"
    :class="LINE_CLASS[l.kind]"
  >{{ l.text }}</div>
</template>
```

Update the idle hint condition (`lastCommand` no longer exists):

```html
<div
  v-if="isFinished && !userInput && entries.length === 0"
  ...
>
```

(The prompt line `$ {{ userInput }}` block stays as-is — Task 4 restyles it.)

- [ ] **Step 3: Verify**

Run: `npm run lint` → 0 errors (3 baseline warnings — note: one HeroSection
warning may have existed historically; the current baseline is ProjectsSection ×2 +
CvCaptchaModal ×1 — do not introduce new ones). Run: `npm run build` → success.
Manual smoke (dev server on :5174): intro skips on click/key; `help`, `ls`,
`neofetch`, `cat ./projects.txt`, `sudo rm -rf /`, `xyz` (not found), ↑/↓ recall,
`clear` wipes intro + scrollback, `color 2` still recolors galaxy hover, long
output scrolls inside the body without growing the hero.

- [ ] **Step 4: Commit**

```bash
git add src/components/HeroSection.vue
git commit -m "Feat: real shell scrollback, history and intro skip in the hero terminal"
```

---

### Task 4: Realistic prompt + live window title (`TerminalPrompt.vue`, `HeroSection.vue`)

**Files:**
- Create: `src/components/ui/TerminalPrompt.vue`
- Modify: `src/components/HeroSection.vue`

- [ ] **Step 1: Create the prompt component**

```vue
<template>
  <!-- Classic user@host:path$ prompt, in theme tokens. select-none keeps copied
       commands clean-ish; the prompt is decorative repetition, not content. -->
  <span class="select-none"
    ><span class="text-chart-2">samuele@portfolio</span
    ><span class="text-foreground">:</span><span class="text-primary">~</span
    ><span class="text-foreground">$&nbsp;</span></span
  >
</template>
```

(No script needed. The odd `><span` line-wrapping avoids whitespace text nodes
between spans.)

- [ ] **Step 2: Use it in `HeroSection.vue`**

Import it:

```js
import TerminalPrompt from "@/components/ui/TerminalPrompt.vue";
```

Add the title computed (after the `LINE_CLASS` block):

```js
// Window title mirrors the last command, like a real terminal emulator.
const TITLE_MAX = 24; // TUNABLE — truncation length
const windowTitle = computed(() => {
  const c = lastCmd.value;
  const suffix = c ? (c.length > TITLE_MAX ? `${c.slice(0, TITLE_MAX - 1)}…` : c) : "~";
  return `samuele@portfolio: ${suffix}`;
});
```

Template — title bar: replace `>bash<` with the computed:

```html
<span class="ml-4 font-mono text-xs text-muted-foreground select-none">{{ windowTitle }}</span>
```

Intro lines: render the prompt in place of the `"$ "` prefix (i18n strings are
unchanged — the prefix is stripped at render time):

```html
<template v-if="!hideIntro">
  <div
    v-for="(line, index) in shownLines"
    :key="`line-${index}-${line}`"
    class="text-foreground"
  >
    <template v-if="line.startsWith('$')"><TerminalPrompt />{{ line.slice(2) }}</template>
    <template v-else>{{ line }}</template>
    <span
      v-if="!isFinished && index === shownLines.length - 1"
      class="inline-block w-2 h-4 bg-white ml-0.5 cursor-blink"
    />
  </div>
</template>
```

Scrollback command lines:

```html
<div class="text-foreground"><TerminalPrompt />{{ entry.cmd }}</div>
```

Interactive prompt line (replace the `$&nbsp;` span):

```html
<div v-if="isFinished" class="text-foreground flex items-baseline gap-0.5">
  <TerminalPrompt />
  <span class="text-foreground">{{ userInput }}</span>
  <span class="inline-block w-2 h-4 bg-white cursor-blink" />
</div>
```

- [ ] **Step 3: Verify**

Run: `npm run lint` → 0 errors. Run: `npm run build` → success. Manual smoke:
prompt colors on intro/scrollback/input lines; title shows `samuele@portfolio: ~`,
follows commands, truncates a >24-char command with `…`, resets to `~` after
`clear`; locale flip mid-session keeps everything coherent.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/TerminalPrompt.vue src/components/HeroSection.vue
git commit -m "Feat: samuele@portfolio prompt and live window title in the hero terminal"
```

---

### Task 5: Document in features.md + final review

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Add a "Hero terminal" subsection**

Read the doc's structure first and document what was BUILT (read the source if
anything below disagrees). Place the subsection near the hero/micro-interactions
material, covering:

1. The interactive shell: scrollback (`useTerminalShell`, cap `MAX_ENTRIES = 50`),
   `help`, literal-English `command not found` + localized hint, session-only ↑/↓
   history, `clear` (wipes intro too via `hideIntro`), body `max-h` + auto-scroll.
2. The command table: `help`, `whoami`, `ls`, `cat ./about.txt` (re-prints the
   intro about lines), `cat ./projects.txt` (project titles from
   `t.projects.items` + invite), `cat ./starwars.txt` (egg, JSON), `neofetch`
   (art + localized profile card), `sudo <anything>` (joke), `color <1|2|3>`
   (unchanged galaxy hover palette).
3. Typewriter: human rhythm constants, `finish()` skip (click on the body or any
   key during the intro), `prefers-reduced-motion` → instant (incl. live flip).
4. Prompt/title: `TerminalPrompt` component (`samuele@portfolio:~$` in
   chart-2/primary tokens), window title mirrors `lastCmd` (TITLE_MAX 24, `~` at
   rest/after clear).
5. Tunables table rows: `CHAR_MIN_MS` / `CHAR_JITTER_MS` / `PUNCT_PAUSE_MS` /
   `SPACE_PAUSE_MS` / `SPACE_PAUSE_CHANCE` / `LINE_PAUSE_MS` (useTypewriter.js),
   `MAX_ENTRIES` (useTerminalShell.js), `TITLE_MAX` (HeroSection.vue) — matching
   the table's existing format.

- [ ] **Step 2: Verify**

Run: `npm run lint` → 0 errors. Run: `npm run build` → success.

- [ ] **Step 3: Commit**

```bash
git add docs/features.md
git commit -m "Docs: hero terminal shell, commands, typewriter and prompt in features.md"
```

- [ ] **Step 4: Final whole-implementation review**

Dispatch the final reviewer over the full range (plan-commit → HEAD): cross-task
coherence (shell ↔ typewriter skip ↔ prompt), spec coverage, docs accuracy,
i18n EN/IT shape parity, a11y (hidden input aria-label intact, no aria-live
chattiness), reduced-motion paths, and the verify gate.
