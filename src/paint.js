/**
 * @exports
 * @typedef PaintInit
 * @prop {ImageBitmap[]} frames
 * @prop {OffscreenCanvas} offscreen
 * @prop {number} frameRate
 */


export {};


/** @param {number} time */
const sleep = (time = 0) => {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
};


self.addEventListener(
  "message",
  /**
   * @param {MessageEvent<PaintInit>} event
   */
  async ({ data: { frames, offscreen, frameRate }}) => {
    const interval = 1 / frameRate * 1000;


    let last = Date.now() - interval;
    let frame = 0;


    const ctx = offscreen.getContext("bitmaprenderer");


    while (true) {
      if (Date.now() - last < interval) continue;
      last += interval;


      ctx.transferFromImageBitmap(frames[frame++]);
      await sleep();

      // console.log(Date.now() - last);


      if (frame >= frames.length - 1) {
        postMessage(null);
        break;
      }
    }
  }
);
