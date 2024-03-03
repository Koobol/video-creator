/** @type {(video: Video) => void} */
let nextFrame;


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
   * @param {import("./render").default} videoSrc
   * @param {number} [offset]
   *   - how offset the video is from its audio, in seconds
   */
  constructor(frames, src, videoSrc, offset = 0) {
    this.#frames = frames;


    this.#src = new URL(src, location.href);

    this.#offset = offset;


    this.#videoSrc = videoSrc;


    videos.get(videoSrc)?.add(this);
  }


  #volume = 1;
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
    nextFrame = sound => {
      sound.#frame++;


      if (sound.#frame < sound.#frames.length - 1) return;
      sound.pause();
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


/** @type {WeakMap<import("./render").default, Set<Video>>} */
export const videos = new WeakMap();

export { nextFrame };
