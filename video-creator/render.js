// @ts-check
/**
 * @typedef renderInit
 * @prop {number} width - the width of the video
 * @prop {number} height - the height of the video
 * @prop {string} src - the file giving instructions on how to render the video
 */


/**
 * @typedef {(canvas: OffscreenCanvas) => void} setup
 * @typedef {(canvas: OffscreenCanvas) => void | 0} draw
 */


self.addEventListener(
  "message",
  /** @param {MessageEvent<renderInit>} event */
  async event => {
    const canvas = new OffscreenCanvas(event.data.width, event.data.height);


    /**
     * @type {{ setup: setup; draw: draw }}
     */
    const { setup, draw } = await import(event.data.src);

    setup(canvas);


    /** @type ImageBitmap[] */
    const frames = [];

    draw(canvas);
    while (true) {
      try { frames.push(canvas.transferToImageBitmap()); }
      finally { if (draw(canvas) === 0) break; }
    }


    self.postMessage(frames);
  },
);
