// @ts-check
/**
 * @typedef RenderInit
 * @prop {number} width - the width of the video
 * @prop {number} height - the height of the video
 * @prop {string} src - the file giving instructions on how to render the video
 * @prop {number} frameRate - the framerate of the video
 *
 * @typedef RenderOutput
 * @prop {ImageBitmap[]} frames - the frames of video
 * @prop {Map<string, Set<AudioInstruction>>} audioInstructions
 *   - keys are audio file being used, values are the sounds being played
 *
 *
 * @callback Setup
 * @param {OffscreenCanvas} canvas
 * @param {FileAPI} fileAPI
 * @param {SetupInit} setupInit
 * @returns {void}
 *
 * @callback AsyncSetup
 * @param {OffscreenCanvas} canvas
 * @param {FileAPI} fileAPI
 * @param {SetupInit} setupInit
 * @returns {Promise<void>}
 *
 * @typedef SetupInit
 * @prop {number} frameRate - the frame rate of the video
 *
 * @typedef FileAPI
 * @prop {PlaySound} playSound
 * @prop {GetImage} getImage
 *
 * @callback PlaySound
 * @param {string} src - the file containing the sound
 * @returns {AudioInstruction}
 *
 * @callback GetImage
 * @param {string} src - the file containing the ImageBitmap
 * @returns {Promise<ImageBitmap>}
 *
 *
 * @callback Draw
 * @returns {void | 0}
 * 
 * @callback AsyncDraw
 * @returns {Promise<void | 0>}
 *
 *
 * @typedef AudioInstruction
 * @prop {number} timestamp - the time that the sound starts playing in seconds
 */


self.addEventListener(
  "message",
  /** @param {MessageEvent<RenderInit>} event */
  async ({ data: { width, height, frameRate, src } }) => {
    const canvas = new OffscreenCanvas(width, height);


    let frame = 0;

    /** @type RenderOutput["frames"] */
    const frames = [];

    /** @type RenderOutput["audioInstructions"]*/
    const audioInstructions = new Map();
    /** @type FileAPI */
    const fileAPI = {
      playSound(src) {
        const instruction = {
          timestamp: frame / frameRate,
        };


        if (!audioInstructions.has(src))
        audioInstructions.set(src, new Set());
        audioInstructions.get(src)?.add(instruction);



        return instruction;
      },


      async getImage(imgSrc) {
        return createImageBitmap(await (await fetch(
          imgSrc[0] === "/" || /^[a-z]+:\/\//i.test(imgSrc) ? imgSrc
            : src.match(/.*\//) + imgSrc,
        )).blob());
      },
    };


    /**
     * @type {{
     *   setup: Setup | AsyncSetup;
     *   draw: Draw | AsyncDraw;
     * }} */
    const { setup, draw } = await import(src);

    await setup(canvas, fileAPI, { frameRate });


    while (true) {
      if (await draw() === 0) break;

      frames.push(canvas.transferToImageBitmap());

      frame++;
    }


    postMessage(/** @type RenderOutput */ ({
      frames,
      audioInstructions,
    }), { transfer: frames });
  },
);
