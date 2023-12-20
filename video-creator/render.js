// @ts-check
/**
 * @typedef renderInit
 * @prop {number} width - the width of the video
 * @prop {number} height - the height of the video
 * @prop {string} src - the file giving instructions on how to render the video
 * @prop {number} framerate - the framerate of the video
 */


/**
 * @typedef {(canvas: OffscreenCanvas, setupInit: setupInit) => void} setup
 * @typedef {(canvas: OffscreenCanvas) => void | 0} draw
 *
 * @typedef setupInit
 * @prop {number} framerate - the framerate of the video
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

    setup(canvas, { framerate: event.data.framerate });


    /** @type ImageBitmap[] */
    const frames = [];

    while (true) {
      if (draw(canvas) === 0) break;

      frames.push(canvas.transferToImageBitmap());
    }


    postMessage(frames);
  },
);
