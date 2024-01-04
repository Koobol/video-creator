// @ts-check
/**
 * @typedef RenderInit
 * @prop {number} width - the width of the video
 * @prop {number} height - the height of the video
 * @prop {string} src - the file giving instructions on how to render the video
 * @prop {number} frameRate - the framerate of the video
 *
 * @typedef RenderOutput
 * @prop {"output"} type
 * @prop {ImageBitmap[]} frames - the frames of video
 * @prop {AudioInstructions} audioInstructions
 *   - keys are audio file being used, values are the sounds being played
 *
 *
 * @callback Setup
 * @param {OffscreenCanvas} canvas
 * @param {typeof mediaAPI} mediaAPI
 * @param {SetupInit} setupInit
 * @returns {void}
 *
 * @callback AsyncSetup
 * @param {OffscreenCanvas} canvas
 * @param {typeof mediaAPI} mediaAPI
 * @param {SetupInit} setupInit
 * @returns {Promise<void>}
 *
 * @typedef SetupInit
 * @prop {number} frameRate - the frame rate of the video
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
 *
 * @typedef {Map<string, Set<AudioInstruction>>} AudioInstructions
 *
 *
 * @typedef VideoRequest
 * @prop {"video request"} type
 * @prop {string} src
 * @prop {number} [start] - where to start the video
 * @prop {number} [end] - where to end the video
 *
 * @typedef VideoResponse
 * @prop {"video response"} type
 * @prop {string} src
 * @prop {ImageBitmap[]} frames
 *
 *
 * @typedef {RenderOutput | VideoRequest} RenderMessage
 */


/** @type string */
let src;

/** @type number */
let frameRate;

/** @type AudioInstructions */
const audioInstructions = new Map();

let frame = 0;


const mediaAPI = {
  /**
   * play the requested sound
   * @param {string} src - the file containing the sound
   * @returns {AudioInstruction}
   */
  playSound(src) {
    const instruction = {
      timestamp: frame / frameRate,
    };


    if (!audioInstructions.has(src))
    audioInstructions.set(src, new Set());
    audioInstructions.get(src)?.add(instruction);



    return instruction;
  },


  /**
   * get an ImageBitmap containing the data from the requested file
   * @param {string} imageSrc - the file containing the image
   * @returns {Promise<ImageBitmap>}
   */
  async getImage(imageSrc) {
    return createImageBitmap(await (await fetch(
      imageSrc[0] === "/" || /^[a-z]+:\/\//i.test(imageSrc) ? imageSrc
        : src.match(/.*\//) + imageSrc,
    )).blob());
  },


  /**
   * get an ImageBitmap containing the data from the requested file
   * @param {string} src - the file containing the image
   * @param {number} [start] - the timestamp the video starts on
   * @param {number} [end] - the timestamp the video ends on
   */
  async getVideo(src, start, end) {
    postMessage(/** @satisfies {VideoRequest} */ ({
      type: "video request",
      src,
      start,
      end,
    }));


    const frames = await /** @type Promise<ImageBitmap[]> */ (new Promise(
        resolve => {
        /** @param {MessageEvent<VideoResponse>} event */
        const resolution = ({ data: { type, src: videoSrc, frames } }) => {
          if (type === "video response" && videoSrc === src) {
            resolve(frames);


            self.removeEventListener("message", resolution);
          }
        };
        self.addEventListener("message", resolution);
      })
    );

    debugger;
  },
};


/** @param {MessageEvent<RenderInit>} event */
const init = async ({ data }) => {
  self.removeEventListener("message", init);


  const canvas = new OffscreenCanvas(data.width, data.height);


  ({ src, frameRate } = data);


  /** @type RenderOutput["frames"] */
  const frames = [];


  /**
   * @type {{
   *   setup: Setup | AsyncSetup;
   *   draw: Draw | AsyncDraw;
   * }}
   */
  const { setup, draw } = await import(src);

  await setup(canvas, mediaAPI, { frameRate });


  while (true) {
    if (await draw() === 0) break;

    frames.push(canvas.transferToImageBitmap());


    frame++;
  }


  postMessage(/** @satisfies {RenderOutput} */ ({
    type: "output",
    frames,
    audioInstructions,
  }), { transfer: frames });
};
self.addEventListener("message", init);
