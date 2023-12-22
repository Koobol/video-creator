// @ts-check
/**
 * @typedef RenderInit
 * @prop {number} width - the width of the video
 * @prop {number} height - the height of the video
 * @prop {string} src - the file giving instructions on how to render the video
 * @prop {number} framerate - the framerate of the video
 *
 * @typedef RenderOutput
 * @prop {ImageBitmap[]} frames - the frames of video
 *
 *
 * @typedef {(canvas: OffscreenCanvas, setupInit: SetupInit) => void} Setup
 * @typedef SetupInit
 * @prop {number} framerate - the framerate of the video
 *
 * @typedef {(canvas: OffscreenCanvas) => void | 0} Draw
 */


self.addEventListener(
  "message",
  /** @param {MessageEvent<RenderInit>} event */
  async event => {
    const canvas = new OffscreenCanvas(event.data.width, event.data.height);


    /**
     * @type {{ setup: Setup; draw: Draw }}
     */
    const { setup, draw } = await import(event.data.src);

    setup(canvas, { framerate: event.data.framerate });


    /** @type ImageBitmap[] */
    const frames = [];

    while (true) {
      if (draw(canvas) === 0) break;

      frames.push(canvas.transferToImageBitmap());
    }


    postMessage(/** @type RenderOutput */ ({
      frames,
    }), { transfer: frames });
  },
);
