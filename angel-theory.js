// @ts-check
import Sprite from "./sprites/sprite.js";


const test = new Sprite(10, 10);
test.xVelocity = 3;


/** @type Setup */
export function setup(canvas) {
  Sprite.ctx = /** @type OffscreenCanvasRenderingContext2D */
    (canvas.getContext("2d"));
  Sprite.ctx.fillStyle = "white";
}

/** @type Draw */
export function draw() {
  Sprite.renderAll();


  if (test.x >= 200) return 0;
}
