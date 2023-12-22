// @ts-check
/** @type {OffscreenCanvasRenderingContext2D} */
let ctx;

/** @type number */
let fps;


/** @type Setup */
export function setup(canvas, { framerate }) {
  ctx = /** @type OffscreenCanvasRenderingContext2D */ (canvas.getContext("2d"));
  fps = framerate;
}


let x = 0;
let played = false;
/** @type Draw */
export function draw(canvas, { playSound }) {
  if (x > canvas.width - 100) return 0;


  ctx.fillStyle = x <= 200 ? "blue" : "lime";
  ctx.fillRect(x, (canvas.height - 100) / 2, 100, 100);


  if (!played && x > 200) {
    playSound("beep.wav");
    played = true;
  }


  x += 200 / fps;
}
