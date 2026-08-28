// Static ASCII art used by the hero terminal (useTerminalShell.js) — language-
// agnostic, so it lives here instead of the i18n files (unlike about.txt/
// projects.txt content, which IS translated and stays in en.js/it.js). Every
// non-translated terminal command output lives in this one file — real
// commands (fastfetch) and hidden easter eggs (starwars.txt) alike — so the
// terminal's whole "file system" has one source instead of being split
// across files by command.

// fastfetch art column — fixed-width rows; the info column is appended per
// row. A blocky pixel "F" (Fedora) — tried a circular badge with a small
// hook inside first, but at this resolution (2 text rows for the whole
// interior) it read as a "C", not an "f". A full-height block letter across
// all 6 rows has enough resolution to stay unambiguous.
export const FASTFETCH_ART = [
  "   ██████████     ",
  "   ██             ",
  "   ████████       ",
  "   ██             ",
  "   ██             ",
  "   ██             ",
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
