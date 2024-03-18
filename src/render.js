import Video, { updateVideos } from "./video.js";
import Sound, { sounds, getVolumeChanges, getSpeedChanges } from "./sound.js";
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


  get width() { return this.canvas.width; }
  get height() { return this.canvas.height; }


  maxPixels = 1e9;


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
   * @this {VideoSrc}
   * @param {string | URL} src - the file containing the sound
   * @param {SoundOptions} [options]
   *   - the options of the sound
   */
  playSound(src, options) {
    return new Sound(this, src, options);
  }


  /**
   * get an ImageBitmap containing the data from the requested file
   * @this {VideoSrc}
   * @param {string | URL} src - the file containing the video
   * @param {VideoOptions} [options]
   */
  async getVideo(src, { start, end, volume } = {}) {
    const frameRate = this.frameRate;

    postMessage(/** @satisfies {VideoRequest} */ ({
      type: "video request",
      src: new URL(src, location.href).href,
      frameRate,
      start,
      end,
    }));


    /** @type {VideoResponse} */
    const { frames } = await new Promise(resolve => {
      /** @param {MessageEvent<ToRender>} event */
      const onMessage = ({ data }) => {
        if (
          data.type === "video response" &&
          data.src === new URL(src, location.href).href &&
          data.frameRate === frameRate &&
          data.start === start &&
          data.end === end
        ) {
          resolve(data);
          self.removeEventListener("message", onMessage);
        }
      }
      self.addEventListener("message", onMessage);
    });


    return new Video(frames, src, this, { offset: start, volume });
  }


  /**
   * create a chunk of video
   * @template {typeof VideoSrc} T
   * @this {T}
   * @param {VideoChunk<InstanceType<T>>} chunk
   */
  static defineChunk(chunk) { return chunk; }


  /**
   * function that will be called to set up the video if no chunks
   * @deprecated
   * @returns {void | Promise<void>}
   */
  setup() {}


  /**
   * function that will be called for every frame if no chunks,
   * return true to finish rendering
   * @deprecated
   * @type {Draw}
   */
  draw() { throw new Error("no chunks or VideoSrc#draw function specified"); }


  /** @type {RenderInit?} */
  static #init = null;
  /**
   * use to define a VideoSrc as the one to render the video
   * @template {typeof VideoSrc} T
   * @this {T}
   * @param {VideoChunk<InstanceType<T>>[]} [chunks] - the chunks of video
   * @param {boolean} [oneTime] - whether or not to only render one video
   */
  static async render(chunks = [], oneTime = false) {
    if (!oneTime) {
      while (true) await this.render(chunks, true);
    }


    const init = VideoSrc.#init ?? await getMessage("render init");
    VideoSrc.#init = null;
    const { width, height, frameRate } = init;


    let aborting = false;
    // TODO fix problem with premature aborting
    /** @param {MessageEvent<ToRender>} event */
    const abortListener = ({ data }) => {
      if (data.type !== "abort") return;

      aborting = true;


      self.removeEventListener("message", abortListener);
    }
    self.addEventListener("message", abortListener);

    const canvas = new OffscreenCanvas(width, height);

    const videoSrc = /** @type {InstanceType<T>} */
      (new this({ canvas, frameRate }));


    /** @type {number?} */
    let chunk = init.chunk ?? 0;


    while (true) {
      videoSrc.#frame = 0;

      sounds.set(videoSrc, new Set());


      if (chunk === null) {
        /** @type {RenderInit | ChunkRequest} */
        const message = await new Promise(resolve => {
          /** @param {MessageEvent<ToRender>} event */
          const onMessage = ({ data }) => {
            if (data.type !== "chunk" && data.type !== "render init") return;

            resolve(data);
            self.removeEventListener("message", onMessage);
          }
          self.addEventListener("message", onMessage);
        });


        if (message.type === "render init") {
          VideoSrc.#init = message;


          self.removeEventListener("message", abortListener);
          return;
        }

        chunk = message.chunk;
      }
      if (chunks.length !== 0)
        chunk = Math.floor(Math.max(0, Math.min(chunk, chunks.length - 1)));
      if (isNaN(chunk)) chunk = 0;



      /** @type {RenderOutput["frames"]} */
      const frames = [];


      let checkNext = Date.now() + 500;


      /** @type {Draw} */
      const draw = chunks.length > 0 ?
        await chunks[chunk](videoSrc) :
        videoSrc.draw.bind(videoSrc);
      if (chunks.length === 0) await videoSrc.setup();


      let maxPixelsExceeded = false;
      while (true) {
        if (
          (frames.length + 1) * videoSrc.width * videoSrc.height
          > videoSrc.maxPixels
        ) {
          console.warn(
            "VideoCreator exceeded max number of pixels, ending early. " +
              "Try decreasing resolution, frame rate, or video length. " +
              "Change VideoSrc#maxPixels to override.",
          );
          maxPixelsExceeded = true;
          break;
        }



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


        if (await draw()) break;

        frames.push(canvas.transferToImageBitmap());


        videoSrc.#frame++;


        updateVideos(videoSrc);
      }


      /** @type {AudioInstructions} */
      const audioInstructions = new Map();
      sounds.get(videoSrc)?.forEach(sound => {
        const src = sound.src.href;


        if (!audioInstructions.has(src)) audioInstructions.set(src, new Set());


        audioInstructions.get(src)?.add({
          startTime: sound.startTime,
          stopTime: sound.stopTime ?? undefined,

          offset: sound.offset,
          duration: sound.duration ?? undefined,

          startingVolume: sound.getVolumeAt(sound.startTime),
          volumeChanges: getVolumeChanges(sound),

          loop: sound.loop,
          loopStart: sound.loopStart,
          loopEnd: sound.loopEnd,

          startingSpeed: sound.getSpeedAt(sound.startTime),
          speedChanges: getSpeedChanges(sound),
        });
      });


      postMessage(/** @satisfies {RenderOutput} */ ({
        type: "output",
        frames,
        audioInstructions,
        maxPixelsExceeded,
      }), { transfer: frames });


      chunk = null;
    }
  }
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
 * @prop {number} [chunk] - which chunk to render first
 *
 * @typedef ChunkRequest
 * @prop {"chunk"} type
 * @prop {number} chunk
 *
 * @typedef RenderOutput
 * @prop {"output"} type
 * @prop {ImageBitmap[]} frames - the frames of video
 * @prop {AudioInstructions} audioInstructions
 *   - keys are audio file being used, values are the sounds being played
 * @prop {boolean} [maxPixelsExceeded]
 *   - whether or not the max pixel limit was exceeded
 * 
 * 
 * @typedef AbortSignal
 * @prop {"abort"} type
 * 
 * 
 * @typedef VideoRequest
 * @prop {"video request"} type
 * @prop {string} src
 * @prop {number} frameRate
 * @prop {number} [start] - where to start the video
 * @prop {number} [end] - where to end the video
 * 
 * @typedef VideoResponse
 * @prop {"video response"} type
 * @prop {string} src
 * @prop {number} frameRate
 * @prop {number} [start]
 * @prop {number} [end]
 * @prop {ImageBitmap[]} frames
 * 
 * 
 * @typedef {RenderInit | ChunkRequest | VideoResponse | AbortSignal} ToRender
 * @typedef {RenderOutput | VideoRequest | AbortSignal} FromRender
 * 
 * 
 * @typedef AudioInstruction
 * @prop {number} startTime
 *  - the time that the sound starts playing, in seconds
 * @prop {number} [stopTime] - the timestamp when to stop the sound
 * @prop {number} [offset] - when to start playing the sound from, in seconds
 * @prop {number} [duration] - how long to play the sound for
 * @prop {number} [startingVolume] - the initial volume of the sound
 * @prop {Map<number, number>} [volumeChanges] - changes in the volume
 * @prop {boolean} [loop] - whether or not the sound is looping
 * @prop {number} [loopStart] - when to start looping from
 * @prop {number} [loopEnd] - when to stop looping from
 * @prop {number} [startingSpeed] - the initial speed of the sound
 * @prop {Map<number, number>} [speedChanges] - changes in speed
 *
 * @typedef {Map<string, Set<AudioInstruction>>} AudioInstructions
 *
 *
 * @typedef VideoOptions
 * @prop {number} [start] - the timestamp the video starts on
 * @prop {number} [end] - the timestamp the video ends on
 * @prop {number} [volume] - the initial volume of the video
 *
 *
 * @typedef {import("./sound.js").SoundOptions} SoundOptions
 *
 *
 * @callback Draw
 * @returns {boolean | Promise<boolean>}
 */
/**
 * @exports
 *
 * @template {VideoSrc} T
 * @callback VideoChunk
 * @param {T} videoSrc
 * @returns {Draw | Promise<Draw>}
 */
