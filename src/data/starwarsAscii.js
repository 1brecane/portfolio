// `cat ./starwars.txt` easter egg — its own file (not terminalAsciiArt.js,
// which holds functional/always-visible art like the neofetch column) for
// the same reason terminalEasterEggs.js keeps hidden-command output out of
// the real-command registry: coherency between "what's shown by default"
// and "what's a hidden easter egg". Language-agnostic, so it lives in
// data/ rather than the i18n files.
export const STARWARS_ASCII = [
  ".-.__      \\ .-.  ___  __",
  "|_|  '--.-.-(   \\/\\;;\\_\\.-._______.-.",
  "(-)___     \\ \\ .-\\ \\;;\\(   \\       \\ \\",
  " Y    '---._\\_((Q)) \\;;\\\\ .-\\     __(_)",
  " I           __'-' / .--.((Q))---'    \\,",
  " I     ___.-:    \\|  |   \\'-'_          \\",
  " A  .-'      \\ .-.\\   \\   \\ \\ '--.__     '\\",
  " |  |____.----((Q))\\   \\__|--\\_      \\     '",
  "    ( )        '-'  \\_  :  \\-' '--.___\\",
  "     Y                \\  \\  \\       \\(_)",
  "     I                 \\  \\  \\         \\,",
  "     I                  \\  \\  \\          \\",
  "     A                   \\  \\  \\          '\\",
  "     |                    \\  \\__|           '",
  "                           \\_:.  \\",
  "                             \\ \\  \\",
  "                              \\ \\  \\",
  "                               \\_\\_|",
];
