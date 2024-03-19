/**
 * @exports
 * 
 * 
 * @typedef PaintInit
 * @prop {OffscreenCanvas} offscreen
 * @prop {number} frameRate
 *
 * @typedef PaintRequest
 * @prop {ImageBitmap[]} frames
 */


import { sleep, getEvent } from "./funcs.js";


(async () => {
  const { data: { frameRate, offscreen } } =
    /** @type {MessageEvent<PaintInit>} */ (await getEvent(self, "message"));
  let warned = false;

  self.addEventListener(
    "message",
    /**
     * @param {MessageEvent<PaintRequest>} event
     */
    async ({ data: { frames }}) => {
      const interval = 1 / frameRate * 1000;


      const start = Date.now();


      let last = start - interval;
      let frame = 0;


      const ctx = /** @type {ImageBitmapRenderingContext} */
        (offscreen.getContext("bitmaprenderer"));


      while (true) {
        if (Date.now() - last < interval) continue;
        last = start + frame * interval;


        ctx.transferFromImageBitmap(frames[frame++]);
        await sleep();


        if (!warned && Date.now() - last > interval) {
          console.warn("Video file rendering not able to " +
            "keep up with requested framerate.");
          postMessage("warn");

          warned = true;
        }


        if (frame >= frames.length - 1) {
          postMessage("done");
          break;
        }
      }
    }
  );
})();
