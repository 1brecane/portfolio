import { ref } from "vue";
import { terminalEasterEggs as easterEggs } from "@/data/terminalEasterEggs";
import { NEOFETCH_ART } from "@/data/terminalAsciiArt";
import { STARWARS_ASCII } from "@/data/starwarsAscii";

// ── shell knobs (TUNABLE) ───────────────────────────────────────────────────────
const MAX_ENTRIES = 50; // scrollback cap — oldest entries dropped

// const PALETTE_NAMES = { 1: "amber", 2: "cyan", 3: "green" }; // for the dormant `color` command (see dispatch)

// Output line constructors. `kind` maps to a theme class in HeroSection.vue.
const plain = (text) => ({ text, kind: "plain" });
const accent = (text) => ({ text, kind: "accent" });
const error = (text) => ({ text, kind: "error" });
const dim = (text) => ({ text, kind: "dim" });

/**
 * useTerminalShell({ t, onClear })
 *
 * Interactive-shell brain for the hero terminal: scrollback entries, ↑/↓
 * command history (session-only) and command dispatch. The component renders
 * `entries` and forwards keys; this composable owns no DOM.
 *
 * @returns {{ entries, lastCmd, run, historyPrev, historyNext }}
 */
export function useTerminalShell({ t, onClear }) {
  const entries = ref([]); // [{ id, cmd, output: [{ text, kind }] }]
  const lastCmd = ref(""); // drives the window title ("" → "~")
  const cmdHistory = []; // session-only, intentionally uncapped (a real session won't overflow)
  let histIdx = 0; // === cmdHistory.length when not navigating
  let nextId = 0;

  function shellT() {
    return t.value.hero.shell;
  }

  // The intro's `cat ./about.txt` body: lines after the cat command up to the
  // next "$" line — single source of truth with the typewriter intro.
  function aboutLines() {
    const src = t.value.hero.terminal;
    const start = src.findIndex((l) => l === "$ cat ./about.txt");
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
    if (file === "starwars.txt") return STARWARS_ASCII.map(accent);
    return [error(`cat: ${file}: No such file or directory`)];
  }

  function dispatch(cmd) {
    if (cmd === "help") return shellT().help.map(accent);
    if (cmd === "whoami") return [plain("samuele_ruaro")];
    if (cmd === "ls") return [plain("about.txt  projects.txt  starwars.txt")];
    if (cmd === "neofetch") return neofetchLines();
    // NOTE: an easter-egg key starting with "cat "/"sudo "/"color " would shadow those commands below — keep egg keys distinct.
    if (easterEggs[cmd]) return easterEggs[cmd].map(accent);
    if (/^cat(\s|$)/.test(cmd)) return catFile(cmd);
    if (/^sudo(\s|$)/.test(cmd)) return [error(shellT().sudo)];
    // ── `color <1|2|3>` hover-palette command — DISABLED for now (kept for revival).
    //    It was cosmetically inert anyway: the new starfield doesn't read useColorScheme.
    //    To re-enable: uncomment this block + PALETTE_NAMES (top of file), add
    //    `setColorScheme` back to the destructured params, and pass it from HeroSection
    //    via `useColorScheme()`. Also restore the `color` line in both i18n help lists.
    // if (/^color\s+[1-3]$/.test(cmd)) {
    //   const n = parseInt(cmd.split(/\s+/)[1]);
    //   setColorScheme(n);
    //   return [accent(`> hover palette: #${n} (${PALETTE_NAMES[n]})`)];
    // }
    // if (cmd === "color") {
    //   return [accent("> usage: color <1|2|3>"), accent("> 1: amber  2: cyan  3: green")];
    // }
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
