// Static ASCII art used by the hero terminal (useTerminalShell.js) — language-
// agnostic, so it lives here instead of the i18n files (unlike about.txt/
// projects.txt content, which IS translated and stays in en.js/it.js). Every
// non-translated terminal command output lives in this one file — real
// commands (neofetch) and hidden easter eggs (starwars.txt) alike — so the
// terminal's whole "file system" has one source instead of being split
// across files by command.

// neofetch art column — fixed-width rows; the info column is appended per row.
export const NEOFETCH_ART = [
  "     ▄▄▄▄▄▄       ",
  "   ▄█▀▀▀▀▀▀█▄     ",
  "  ██  ▀  ▀  ██    ",
  "  ██   ▄▄   ██    ",
  "   ▀█▄▄▄▄▄▄█▀     ",
  "                  ",
];

// `cat ./starwars.txt` easter egg.
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
