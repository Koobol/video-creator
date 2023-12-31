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
 * @param {MediaAPI} mediaAPI
 * @param {SetupInit} setupInit
 * @returns {void}
 *
 * @callback AsyncSetup
 * @param {OffscreenCanvas} canvas
 * @param {MediaAPI} mediaAPI
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
 *
 * @typedef VideoResponse
 * @prop {"video response"} type
 * @prop {string} src
 * @prop {ImageBitmap[]} frames
 *
 *
 * @typedef {RenderOutput | VideoRequest} RenderMessage
 */


class MediaAPI {
  #src;

  #frameRate;

  #shared;
  /**
   * @param {string} src - the URL to the file using the API
   * @param {number} frameRate
   * @param {{
   *   audioInstructions: AudioInstructions;
   *   frame: number;
   * }} shared
   *   
   */
  constructor(src, frameRate, shared) {
    this.#src = src;
    
    this.#frameRate = frameRate;

    
    this.#shared = shared;


    this.playSound = this.playSound.bind(this);
    this.getImage = this.getImage.bind(this);
  }


  /**
   * play the requested sound
   * @param {string} src - the file containing the sound
   * @returns {AudioInstruction}
   */
  playSound(src) {
    const instruction = {
      timestamp: this.#shared.frame / this.#frameRate,
    };


    if (!this.#shared.audioInstructions.has(src))
      this.#shared.audioInstructions.set(src, new Set());
    this.#shared.audioInstructions.get(src)?.add(instruction);



    return instruction;
  }

  /**
   * get an ImageBitmap containing the data from the requested file
   * @param {string} src - the file containing the image
   * @returns {Promise<ImageBitmap>}
   */
  async getImage(src) {
    return createImageBitmap(await (await fetch(
      src[0] === "/" || /^[a-z]+:\/\//i.test(src) ? src
        : this.#src.match(/.*\//) + src,
    )).blob());
  }


  /**
   * get an ImageBitmap containing the data from the requested file
   * @param {string} src - the file containing the image
   */
  async getVideo(src) {
    postMessage(/** @satisfies {VideoRequest} */ ({
      type: "video request",
      src,
    }));


    const { frames } = await this.#getVideoResponse(src);
  }
  /**
   * @param {string} src
   * @returns {Promise<VideoResponse>}
   */
  #getVideoResponse(src) {
    return new Promise(resolve => {
      self.addEventListener(
        "message",
        /** @param {MessageEvent<VideoResponse>} event */
        ({ data }) => {
          if (data.type === "video response" && data.src === src) resolve(data);
        },
      );
    });
  }
}


/** @param {MessageEvent<RenderInit>} event */
const init = async ({ data: { width, height, frameRate, src } }) => {
  self.removeEventListener("message", init);


  const canvas = new OffscreenCanvas(width, height);


  /** @type RenderOutput["frames"] */
  const frames = [];


  /** @type AudioInstructions */
  const audioInstructions = new Map();
  const shared = {
    audioInstructions,
    frame: 0,
  };


  /**
   * @type {{
   *   setup: Setup | AsyncSetup;
   *   draw: Draw | AsyncDraw;
   * }}
   */
  const { setup, draw } = await import(src);

  await setup(canvas, new MediaAPI(src, frameRate, shared), { frameRate });


  while (true) {
    if (await draw() === 0) break;

    frames.push(canvas.transferToImageBitmap());


    shared.frame++;
  }


  postMessage(/** @satisfies {RenderOutput} */ ({
    type: "output",
    frames,
    audioInstructions,
  }), { transfer: frames });
};
self.addEventListener("message", init);
