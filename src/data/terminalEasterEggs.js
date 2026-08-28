// Command -> output-lines registry for the hero terminal's dispatch() in
// useTerminalShell.js. Keyed by the exact typed command (not a filename) —
// for file content served via `cat`, add a case in catFile() instead (see
// STARWARS_ASCII in terminalAsciiArt.js for that pattern). Keep keys
// distinct from real commands ("cat "/"sudo "/"color " prefixes would
// shadow those below).
export const terminalEasterEggs = {};
