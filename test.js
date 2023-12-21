// @ts-check
/** @type {OffscreenCanvasRenderingContext2D} */
let ctx;

/** @type number */
let fps;


/** @type setup */
export function setup(canvas, { framerate }) {
  ctx = /** @type OffscreenCanvasRenderingContext2D */ (canvas.getContext("2d"));
  fps = framerate;
}


let x = 0;
/** @type draw */
export function draw(canvas) {
  if (x > canvas.width - 100) return 0;


  ctx.fillStyle = "blue";
  ctx.fillRect(x, (canvas.height - 100) / 2, 100, 100);


  x += 200 / fps;
}
