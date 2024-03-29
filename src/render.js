import Video, { updateVideos } from "./video.js";
import Sound, { sounds, getVolumeChanges, getSpeedChanges } from "./sound.js";
import { sleep, getMessage } from "./funcs.js";


/** a class for defining videos */
export default class VideoSrc {
  /**
   * only to be called by video-creator
   * @param {{ canvas: OffscreenCanvas, frameRate: number, data: * }} init
   */
  constructor({ canvas, frameRate, data }) {
    this.#canvas = canvas;


    /** the data from the VideoCreator */
    this.data = data;


    this.#frameRate = frameRate;
  }

  #frameRate;
  /** the framerate of the video */
  get frameRate() { return this.#frameRate; }

  #frame = 0;
  get frame() { return this.#frame; }

  #canvas;
  /** the canvas to draw on */
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
   *   - a setup function which returns a draw function,
   *     the draw function should return true to finish rendering
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


  /**
   * will be called when the video is initialized
   * @returns {void | Promise<void>}
   */
  beforeAnything() {}

  /**
   * will be called before each chunk setup
   * @returns {void | Promise<void>}
   */
  beforeSetup() {}
  /**
   * will be called after each chunk setup
   * @returns {void | Promise<void>}
   */
  afterSetup() {}

  /**
   * will be called before each frame is drawn on every chunk
   * @returns {void | Promise<void>}
   */
  beforeDraw() {}
  /**
   * will be called after each frame is drawn on every chunk
   * @returns {void | Promise<void>}
   */
  afterDraw() {}

  /**
   * will be called once a chunk is done rendering
   * @returns {void | Promise<void>}
   */
  afterRendered() {}


  /** @type {RenderInit?} */
  static #init = null;
  /**
   * use to define a VideoSrc as the one to render the video
   * @template {typeof VideoSrc} T
   * @this {T}
   * @param {VideoChunk<InstanceType<T>>[]} [chunks] - the chunks of video
   */
  static async render(chunks = []) {
    while (true) await VideoSrc.#render.call(this, chunks);
  }
  /**
   * @template {typeof VideoSrc} T
   * @param {VideoChunk<InstanceType<T>>[]} chunks
   */
  static async #render(chunks) {
    const init = VideoSrc.#init ?? await getMessage("render init");
    VideoSrc.#init = null;
    const { width, height, frameRate, data } = init;


    let aborting = false;
    /** @type {ChunkRequest | RenderInit?} */
    let nextMessage = null
    /** @param {MessageEvent<ToRender>} event */
    const abortListener = ({ data }) => {
      if (chunk === null) return;


      switch (data.type) {
        case "abort":
          aborting = true;
          break;
        case "chunk":
        case "render init":
          nextMessage = data;
          break;
      }
    }
    self.addEventListener("message", abortListener);

    const canvas = new OffscreenCanvas(width, height);

    const videoSrc = /** @type {InstanceType<T>} */
      (new this({ canvas, frameRate, data }));
    await videoSrc.beforeAnything();


    /** @type {number?} */
    let chunk = init.chunk ?? 0;


    chunk: while (true) {
      videoSrc.#frame = 0;

      sounds.set(videoSrc, new Set());


      aborting = false;


      if (chunk === null) {
        /** @type {RenderInit | ChunkRequest} */
        const message = nextMessage ?? await new Promise(resolve => {
          /** @param {MessageEvent<ToRender>} event */
          const onMessage = ({ data }) => {
            if (data.type !== "chunk" && data.type !== "render init") return;

            resolve(data);
            self.removeEventListener("message", onMessage);
          }
          self.addEventListener("message", onMessage);
        });
        nextMessage = null;


        if (message.type === "render init") {
          VideoSrc.#init = message;


          self.removeEventListener("message", abortListener);
          return;
        }

        ({ chunk } = message);
      }
      if (chunks.length !== 0)
        chunk = Math.floor(Math.max(0, Math.min(chunk, chunks.length - 1)));
      if (isNaN(chunk)) chunk = 0;



      /** @type {RenderOutput["frames"]} */
      const frames = [];


      let checkNext = Date.now() + 500;


      await videoSrc.beforeSetup();

      /** @type {Draw} */
      const draw = chunks.length > 0 ?
        await chunks[chunk](videoSrc) :
        videoSrc.draw.bind(videoSrc);
      if (chunks.length === 0) await videoSrc.setup();

      await videoSrc.afterSetup();


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


            chunk = null;
            aborting = false;


            continue chunk;
          }


          checkNext = Date.now() + 500;
        }


        await videoSrc.beforeDraw();
        const breaking = await draw()
        await videoSrc.afterDraw();

        if (breaking) break;


        frames.push(canvas.transferToImageBitmap());


        videoSrc.#frame++;


        updateVideos(videoSrc);
      }


      await sleep();
      if (aborting) {
        postMessage(/** @satisfies {AbortSignal} */ ({
          type: "abort",
        }));

        chunk = null;
        aborting = false;

        continue;
      }


      await videoSrc.afterRendered();


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
        chunks: chunks.length || 1,
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
 * @prop {*} [data]
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
 * @prop {number} [chunks] - how many chunks there are
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
