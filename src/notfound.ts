import { PLUTO } from './ascii/bodies.ts'
import { startAsciiArt } from './ascii/controller.ts'

// The page that is not there gets the body that is not a planet.
const canvas = document.querySelector<HTMLCanvasElement>('#art')
if (canvas) startAsciiArt(canvas, PLUTO)
