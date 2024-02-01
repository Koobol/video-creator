/**
 * @exports
 * @typedef PaintInit
 * @prop {ImageBitmap[]} frames
 * @prop {OffscreenCanvas} offscreen
 * @prop {number} frameRate
 */


import { sleep } from "./funcs.js";


self.addEventListener(
  "message",
  /**
   * @param {MessageEvent<PaintInit>} event
   */
  async ({ data: { frames, offscreen, frameRate }}) => {
    const interval = 1 / frameRate * 1000;


    const start = Date.now();


    let last = start - interval;
    let frame = 0;


    const ctx = offscreen.getContext("bitmaprenderer");


    let warned = false;


    while (true) {
      if (Date.now() - last < interval) continue;
      last = start + frame * interval;


      ctx.transferFromImageBitmap(frames[frame++]);
      await sleep();


      if (!warned && Date.now() - last > interval) {
        console.warn("Video file rendering not able to " +
                     "keep up with requested framerate.");

        warned = true;
      }


      if (frame >= frames.length - 1) {
        postMessage(null);
        break;
      }
    }
  }
);
