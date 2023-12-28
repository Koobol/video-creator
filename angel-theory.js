// @ts-check
import Sprite from "./sprites/sprite.js";
import TextBox from "./sprites/textbox.js";


/** @type TextBox */
let textBox;


let done = 0;


/** @type Setup */
export function setup(canvas) {
  Sprite.ctx = /** @type OffscreenCanvasRenderingContext2D */
    (canvas.getContext("2d"));
  Sprite.ctx.fillStyle = "white";


  textBox = new TextBox(canvas.width / 2, canvas.height / 2, 250, 150);
  textBox.display("Hello World", () => { done = 1; });
}

/** @type Draw */
export function draw() {
  Sprite.renderAll();


  switch (done) {
    case 1: done = 2; break;
    case 2: return 0;
  }
}
