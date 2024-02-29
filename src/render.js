import Video, { videos } from "./video.js";
import Sound, { sounds } from "./sound.js";
import { sleep, getMessage } from "./funcs.js";


/** a class for defining videos */
export default class VideoSrc {
  /**
   * only to be called by video-creator
   * @param {{ canvas: OffscreenCanvas, frameRate: number }} init
   */
  constructor({ canvas, frameRate }) {
    /** the canvas to draw on */
    this.#canvas = canvas;


    /** the framerate of the video */
    this.#frameRate = frameRate;
  }

  #frameRate;
  get frameRate() { return this.#frameRate; }

  #frame = 0;
  get frame() { return this.#frame; }

  #canvas;
  get canvas() { return this.#canvas; }


  /** the time, in seconds, that the video is at */
  get currentTime() { return this.frame / this.frameRate; }


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
   * @param {SoundOptions} [options]
   *   - the options of the sound
   */
  playSound(src, options) {
    return new Sound(this, src, options);
  }
  /** @type {AudioInstructions} */
  #audioInstructions = new Map();

  /**
   * change the volume of the given sound
   * @param {symbol} sound
   * @param {number} volume - the new volume
   */
  changeVolume(sound, volume) {
    const instruction = this.#sounds.get(sound);
    if (!instruction) return;

    if (!instruction.volumeChanges) instruction.volumeChanges = new Map();


    instruction.volumeChanges.set(this.currentTime, volume);
  }

  /**
   * pause the given sound
   * @param {symbol} sound
   */
  stopSound(sound) {
    const instruction = this.#sounds.get(sound);
    if (instruction && instruction.stop === undefined)
      instruction.stop = this.currentTime;
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


    const { frames } = await getMessage("video response");


    return new Video(frames, src, this, this.#key, start);
  }


  /**
   * function that will be called to set up the video
   * @returns {void | Promise<void>}
   */
  setup() {}


  /**
   * function that will be called for every frame,
   * return true to finish rendering
   * @abstract
   * @returns {boolean | Promise<boolean>}
   */
  draw() { throw new Error("no VideoSrc#draw function specified"); }


  /**
   * use to define the class as the one to be used as the video
   * @param {boolean} [oneTime] - whether or not to only handle one request
   */
  static async render(oneTime = false) {
    if (!oneTime) {
      while (true) await this.render(true);
    }


    const { width, height, frameRate } = await getMessage("render init");


    let aborting = false;
    self.addEventListener(
      "message",
      /** @param {MessageEvent<ToRender>} event */
      ({ data }) => {
        if (data.type !== "abort") return;

        aborting = true;
      },
    );

    const canvas = new OffscreenCanvas(width, height);


    const videoSrc = new this({ canvas, frameRate });
    videos.set(videoSrc, []);


    /** @type {RenderOutput["frames"]} */
    const frames = [];


    let checkNext = Date.now() + 500;


    await videoSrc.setup();


    while (true) {
      if (Date.now() >= checkNext) {
        await sleep();

        if (aborting) {
          self.postMessage(/** @type {AbortSignal} */ ({
            type: "abort",
          }));
          return;
        }


        checkNext = Date.now() + 500;
      }


      if (await videoSrc.draw()) break;

      frames.push(canvas.transferToImageBitmap());


      videoSrc.#frame++;
      

      videos.get(videoSrc)?.filter(video => video.playing)
        .forEach((video) => { video.nextFrame(videoSrc.#key); });
    }


    postMessage(/** @satisfies {RenderOutput} */ ({
      type: "output",
      frames,
      audioInstructions: videoSrc.#audioInstructions,
    }), { transfer: frames });
  }


  #key = Symbol("VideoSrc Video key");
}


export { default as Video } from "./video.js";
export { default as Sound } from "./sound.js";


/**
 * @exports
 * 
 * 
 * @typedef RenderInit
 * @prop {"render init"} type
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
 * @typedef AbortSignal
 * @prop {"abort"} type
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
 * @typedef {RenderInit | VideoResponse | AbortSignal} ToRender
 * @typedef {RenderOutput | VideoRequest | AbortSignal} FromRender
 * 
 * 
 * @typedef AudioInstruction
 * @prop {number} timestamp - the time that the sound starts playing in seconds
 * @prop {number} [stop] - the timestamp when to stop the sound
 * @prop {number} [startAt] - when to start playing the sound from
 * @prop {number} [volume] - the volume of the sound
 * @prop {Map<number, number>} [volumeChanges] - changes in the volume
 *
 * @typedef {Map<string, Set<AudioInstruction>>} AudioInstructions
 *
 *
 * @typedef PlaySoundOptions
 * @prop {number} [startAt] - when to start playing the sound from
 * @prop {number} [volume] - the volume of the sound
 *
 *
 * @typedef {import("./sound.js").SoundOptions} SoundOptions
 */
