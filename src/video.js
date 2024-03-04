/** @typedef {import("./render").default} VideoSrc */


/** @type {(videoSrc: VideoSrc) => void} */
let updateVideos;


export default class Video {
  /** @type {ImageBitmap[]} */
  #frames;
  #frame = 0;

  #src;
  get src() { return this.#src; }
  /** @type {import("./sound").default?} */
  #audio = null;
  
  #offset;

  #videoSrc;

  /**
   * @param {ImageBitmap[]} frames
   * @param {string | URL} src
   *   - the source of the video's audio, usually the video file
   * @param {VideoSrc} videoSrc
   * @param {VideoConstructorOptions} options
   */
  constructor(frames, src, videoSrc, { offset = 0, volume = 1 } = {}) {
    this.#frames = frames;


    this.#src = new URL(src, location.href);

    this.#offset = offset;


    this.#videoSrc = videoSrc;


    this.#volume = volume;


    if (!Video.#videos.get(videoSrc)) Video.#videos.set(videoSrc, new Set());
    Video.#videos.get(videoSrc)?.add(this);
  }


  /** @type {WeakMap<VideoSrc, Set<Video>>} */
  static #videos = new WeakMap();


  #volume;
  get volume() { return this.#volume; }
  set volume(volume) {
    if (volume < 0) volume = 0;


    this.#volume = volume;


    if (!this.#audio) return;
    this.#audio.volume = volume;
  }


  get frame() { return this.#frame; }
  set frame(value) {
    this.#frame = Math.min(value, this.#frames.length - 1);


    this.pause();
  }

  static {
    updateVideos = videoSrc => {
      Video.#videos.get(videoSrc)?.forEach(video => {
        if (!video.playing) return;


        video.#frame++;


        if (video.#frame < video.#frames.length - 1) return;
        video.pause();
      });
    }
  }

  /** the current time of the video, in seconds */
  get currentTime() { return this.frame / this.#videoSrc.frameRate; }
  set currentTime(time) { this.frame = time * this.#videoSrc.frameRate; }

  get playing() { return Boolean(this.#audio); }
  
  play() {
    if (this.playing) return;

    this.#audio = this.#videoSrc.playSound(this.#src, {
      offset: this.#offset + this.frame / this.#videoSrc.frameRate,
      volume: this.volume,
    });
  }
  pause() {
    if (!this.#audio) return;
    this.#audio.stop();
    this.#audio = null;
  }


  /** the current frame of video */
  get currentFrame() { return this.#frames[this.#frame]; }

  get width() { return this.#frames[0].width; }
  get height() { return this.#frames[0].height; }
}


export { updateVideos };

/**
 * @exports
 * @typedef VideoConstructorOptions
 * @prop {number} [offset] - how offset the video is from its audio, in seconds
 * @prop {number} [volume] - the initial volume of the video
 */
