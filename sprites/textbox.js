// @ts-check
import Sprite from "./sprite.js";


export default class TextBox extends Sprite {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} width - the width in characters
   * @param {number} height - the height in lines
   */
  constructor(x, y, width, height) {
    super(x, y);


    this.height = height * this.fontSize + this.gap * 2;

    const ctx = Sprite.ctx;
    ctx.save();

    ctx.font = `${this.fontSize}px monospace`;
    this.width = width * ctx.measureText(" ").width + this.gap * 2;

    ctx.restore();
  }

  fontSize = 20;

  gap = 10;


  draw() {
    const ctx = Sprite.ctx;


    ctx.save();

    ctx.translate(this.x, this.y);


    ctx.fillStyle = "black";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.fill();
    ctx.stroke();


    ctx.textBaseline = "top";
    ctx.font = `${this.fontSize}px monospace`;
    ctx.fillStyle = "white";

    this.#displaying.slice(0, this.#displayProgress).split("\n")
      .forEach((line, lineNumber) => {
        ctx.fillText(
          line,
          -this.width / 2 + this.gap,
          -this.height / 2 + this.gap + lineNumber * this.fontSize,
        );
      });

    if (this.#onDone !== null) increment: {
      if (this.#displayProgress >= this.#displaying.length) {
        this.#onDone();
        this.#onDone = null;

        break increment;
      }


      for (
        let incrementing = this.#leftoverDisplayProgress
          + this.displayRate * Sprite.deltaTime;
        incrementing >= 1;
        incrementing--
      ) {
        this.#displayProgress += this.#displaying
          .slice(this.#displayProgress).search(/\S/) + 1;
      }

      this.#leftoverDisplayProgress = (
        this.#leftoverDisplayProgress +
        this.displayRate * Sprite.deltaTime
      ) % 1;
    }


    ctx.restore();
  }


  /** the text that the text box is going to display */
  #displaying = "";
  /** the progress towards displaying #displaying */
  #displayProgress = 0;
  #leftoverDisplayProgress = 0;
  /** how many characters are displayed a second */
  displayRate = 30;

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
