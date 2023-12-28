// @ts-check
/** base class for sprites */
export default class Sprite {
  xVelocity = 0;
  yVelocity = 0;

  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;


    Sprite.sprites.push(this);
  }


  /** how the sprite's physics should be calculated */
  calculate() {
    this.x += this.xVelocity * Sprite.deltaTime;
    this.y += this.yVelocity * Sprite.deltaTime;
  }
  /** how to draw the sprite to the canvas, should be overridden */
  draw() { Sprite.ctx.fillRect(this.x - 5, this.y - 5, 10, 10); }

  /** called every frame */
  render() {
    this.calculate();
    this.draw();
  }
  /** render every sprite */
  static renderAll() {
    this.sprites.forEach(sprite => { sprite.render(); });
  }


  /**
   * the rendering context to be used by all the sprites
   * @type CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
   */
  static ctx;

  /**
   * all the active sprites
   * @type Sprite[]
   */
  static sprites = [];


  static deltaTime = 0;
}
