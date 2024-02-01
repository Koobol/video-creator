import Video from "./video.js";


/** a class for defining videos */
export default class VideoSrc {
  /**
   * only to be called by video-creator
   * @param {{ canvas: OffscreenCanvas, frameRate: number }} init
   */
  constructor({ canvas, frameRate }) {
    /** the canvas to draw on */
    this.canvas = canvas;


    /** the framerate of the video */
    this.#frameRate = frameRate;
  }

  #frameRate;
  get frameRate() { return this.#frameRate; }

  #frame = 0;
  get frame() { return this.#frame; }


  /**
   * get an ImageBitmap containing the data from the requested file
   * @param {string | URL} src - the file containing the image
   * @returns {Promise<ImageBitmap>}
   */
  async getImage(src) {
    return createImageBitmap(await (await fetch(
      new URL(src, location.href),
    )).blob());
  }


  /**
   * play the requested sound
   * @param {string | URL} src - the file containing the sound
   * @param {number} [startAt] - when to start playing the sound from
   * @returns {symbol} - a key which can be used to manipulate the sound
   */
  playSound(src, startAt) {
    /** @satisfies {AudioInstruction} */
    const instruction = {
      timestamp: this.frame / this.frameRate,
      startAt,
    };


    if (src instanceof URL) src = src.href;


    if (!this.#audioInstructions.has(src))
      this.#audioInstructions.set(src, new Set());
    this.#audioInstructions.get(src)?.add(instruction);


    const key = Symbol(src);
    this.#sounds.set(key, instruction);

    return key;
  }
  /** @type {AudioInstructions} */
  #audioInstructions = new Map();

  /**
   * pause the given sound
   * @param {symbol} sound
   */
  stopSound(sound) {
    this.#sounds.get(sound).stop = this.frame / this.frameRate;
  }

  /** @type {Map<symbol, AudioInstruction>} */
  #sounds = new Map();


  /**
   * get an ImageBitmap containing the data from the requested file
   * @param {string | URL} src - the file containing the image
   * @param {number} [start] - the timestamp the video starts on
   * @param {number} [end] - the timestamp the video ends on
   * @returns {Promise<Video>}
   */
  async getVideo(src, start, end) {
    if (src instanceof URL) src = src.href;


    postMessage(/** @satisfies {VideoRequest} */ ({
      type: "video request",
      src,
      start,
      end,
    }));


    const frames = await /** @type {Promise<ImageBitmap[]>} */ (new Promise(
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


    return new Video(frames, src, this, start);
  }


  /**
   * function that will be called to set up the video
   * @returns {void | Promise<void>}
   */
  setup() {}


  /**
   * function that will be called for every frame
   * return true when to finish rendering
   * @abstract
   * @returns {boolean | Promise<boolean>}
   */
  draw() { throw new Error("no VideoSrc#draw function specified"); }


  /** use to define the class as the one to be used as the video */
  static async render() {
    if (this === VideoSrc)
      throw new Error("render called on base class");


    const { width, height, frameRate } = await new Promise(
      /** @param {(value: RenderInit) => void} resolve */
      resolve => {
        /** @param {MessageEvent<RenderInit>} event */
        const onMessage = ({ data }) => {
          resolve(data);
          self.removeEventListener("message", onMessage);
        };
        
        self.addEventListener("message", onMessage);
      },
    );

    const canvas = new OffscreenCanvas(width, height);


    const videoSrc = new this({ canvas, frameRate });


    /** @type {RenderOutput["frames"]} */
    const frames = [];


    await videoSrc.setup();


    while (true) {
      if (await videoSrc.draw()) break;

      frames.push(canvas.transferToImageBitmap());


      videoSrc.#frame++;
      

      for (const video of Video.videos.filter(video => video.playing))
        video.frame++;
    }


    postMessage(/** @satisfies {RenderOutput} */({
      type: "output",
      frames,
      audioInstructions: videoSrc.#audioInstructions,
    }), { transfer: frames });
  }
}


/**
 * @exports
 * 
 * 
 * @typedef RenderInit
 * @prop {number} width - the width of the video
 * @prop {number} height - the height of the video
 * @prop {number} frameRate - the framerate of the video
 *
 * @typedef RenderOutput
 * @prop {"output"} type
 * @prop {ImageBitmap[]} frames - the frames of video
 * @prop {AudioInstructions} audioInstructions
 *   - keys are audio file being used, values are the sounds being played
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
 * 
 * 
 * @typedef AudioInstruction
 * @prop {number} timestamp - the time that the sound starts playing in seconds
 * @prop {number} [stop] - the timestamp when to stop the sound
 * @prop {number} [startAt] - when to start playing the sound from
 *
 * @typedef {Map<string, Set<AudioInstruction>>} AudioInstructions
 */