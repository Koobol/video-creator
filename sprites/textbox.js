// @ts-check
import Sprite from "./sprite.js";


export default class TextBox extends Sprite {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  constructor(x, y, width, height) {
    super(x, y);


    this.width = width;
    this.height = height;
  }


  draw() {
    const ctx = Sprite.ctx;


    ctx.save();

    ctx.translate(this.x, this.y);


    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;

    ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);


    ctx.textBaseline = "top";
    ctx.font = "20px monospace";
    
    ctx.fillText(
      this.#displaying.slice(0, this.#displayProgress),
      -this.width / 2 + 5,
      -this.height / 2 + 5,
    );

    debugger;
    if (this.#displayProgress < this.#displaying.length) this.#displayProgress++;
    else if (this.#onDone !== null) {
      this.#onDone();
      this.#onDone = null;
    }


    ctx.restore();
  }


  /** the text that the text box is going to display */
  #displaying = "";
  /** the progress towards displaying #displaying */
  #displayProgress = 0;
  /**
   * the function to resolve the promise given by {@linkcode display}
   * @type {Function?}
   */
  #onDone = null;
  /**
   * write the given text to the text box
   * @param {string} text
   * @param {() => void} onDone - callback for when the text is done displaying
   */
  display(text, onDone) {
    this.#displaying = text;
    this.#displayProgress = 0;


    this.#onDone = onDone;
  }
}
