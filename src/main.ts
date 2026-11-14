import { bodyByName, bodyForDay, DAY_NAMES } from './ascii/bodies.ts'
import { startAsciiArt } from './ascii/controller.ts'
import { createFrameRenderer, frameToConsole } from './ascii/frame.ts'
import { CONSOLE_COLS, CONSOLE_ROWS, FRAME_BOTTOM } from './config.ts'

// Each day of the week shows the body it is named after. `?body=jupiter` picks one directly.
const body = bodyByName(new URLSearchParams(location.search).get('body')) ?? bodyForDay(new Date().getDay())

const canvas = document.querySelector<HTMLCanvasElement>('#art')
if (canvas) startAsciiArt(canvas, body)

const label = document.querySelector('#today')
if (label) label.textContent = `${DAY_NAMES[body.day]} · ${body.name}`

// For whoever opens the dev tools.
console.log(...frameToConsole(createFrameRenderer(CONSOLE_COLS, CONSOLE_ROWS, body, FRAME_BOTTOM)(0)))
console.log(`No image on this page: ${body.name} is ray-cast per character, every frame.`)
