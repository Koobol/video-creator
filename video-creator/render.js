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
 * @prop {number} [stop] - the timestamp when to stop the sound
 * @prop {number} [startAt] - when to start playing the sound from
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
   * @param {number} [startAt] - when to start playing the sound from
   * @returns {AudioInstruction}
   */
  playSound(src, startAt) {
    /** @satisfies {AudioInstruction} */
    const instruction = {
      timestamp: frame / frameRate,
      startAt,
    };


    if (!audioInstructions.has(src))
    audioInstructions.set(src, new Set());
    audioInstructions.get(src)?.add(instruction);


    return instruction;
  },

  /**
   * pause the given sound
   * @param {AudioInstruction} sound
   */
  stopSound(sound) {
    sound.stop = frame / frameRate;
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
      }
    ));


    return new Video(frames, src, start);
  },
};

class Video {
  /** @type ImageBitmap[] */
  #frames;
  #frame = 0;

  #src;
  /** @type AudioInstruction? */
  #audio = null;
  
  #startAt;

  /**
   * @param {ImageBitmap[]} frames
   * @param {string} src
   *   - the source of the video's audio, usually the video file
   * @param {number} [startAt]
   *   - how offset the video is from its audio, in seconds
   */
  constructor(frames, src, startAt = 0) {
    this.#frames = frames;


    this.#src = src;

    this.#startAt = startAt;


    Video.videos.push(this);
  }


  get frame() { return this.#frame; }
  set frame(value) {
    this.#frame = Math.min(value, this.#frames.length - 1);


    if (this.#frame < this.#frames.length - 1) return;
    this.playing = false;
  }

  get playing() { return Boolean(this.#audio); }
  set playing(play) {
    if (play === Boolean(this.#audio)) return;


    if (!this.#audio) {
      this.#audio = mediaAPI.playSound(this.#src, this.#startAt + this.frame / frameRate);
      return;
    }


    mediaAPI.stopSound(this.#audio);
    this.#audio = null;
  }


  /** the current frame of video */
  get currentFrame() { return this.#frames[this.#frame]; }

  get width() { return this.#frames[0].width; }
  get height() { return this.#frames[0].height; }


  /** @type Video[] */
  static videos = [];
}


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

    for (const video of Video.videos.filter(video => video.playing))
      video.frame++;
  }


  postMessage(/** @satisfies {RenderOutput} */ ({
    type: "output",
    frames,
    audioInstructions,
  }), { transfer: frames });
};
self.addEventListener("message", init);
