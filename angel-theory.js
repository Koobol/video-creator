// @ts-check
import Sprite from "./sprites/sprite.js";
import TextBox from "./sprites/textbox.js";


/** @type TextBox */
let textBox;


let done = 0;


/** @type Setup */
export function setup(canvas, {}, { frameRate }) {
  Sprite.ctx = /** @type OffscreenCanvasRenderingContext2D */
    (canvas.getContext("2d"));
  Sprite.ctx.fillStyle = "white";


  textBox = new TextBox(canvas.width / 2, canvas.height / 2, 20, 4);
  textBox.display(
    "Hello World\nNice To Meet You\nNice To Meet You Too\nYou're Very Polite",
    () => { done = 1; },
  );


  Sprite.deltaTime = 1 / frameRate;
}

/** @type Draw */
export function draw() {
  Sprite.renderAll();


  switch (done) {
    case 1: done = 2; break;
    case 2: return 0;
  }
}
