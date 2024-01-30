export default class Video {
  /** @type {ImageBitmap[]} */
  #frames;
  #frame = 0;

  #src;
  /** @type {symbol?} */
  #audio = null;
  
  #startAt;

  #videoSrc;

  /**
   * @param {ImageBitmap[]} frames
   * @param {string} src
   *   - the source of the video's audio, usually the video file
   * @param {import("./render").default} videoSrc
   * @param {number} [startAt]
   *   - how offset the video is from its audio, in seconds
   */
  constructor(frames, src, videoSrc, startAt = 0) {
    this.#frames = frames;


    this.#src = src;

    this.#startAt = startAt;


    this.#videoSrc = videoSrc;


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
      this.#audio = this.#videoSrc.playSound(
        this.#src,
        this.#startAt + this.frame / this.#videoSrc.frameRate,
      );
      return;
    }


    this.#videoSrc.stopSound(this.#audio);
    this.#audio = null;
  }


  /** the current frame of video */
  get currentFrame() { return this.#frames[this.#frame]; }

  get width() { return this.#frames[0].width; }
  get height() { return this.#frames[0].height; }


  /** @type {Video[]} */
  static videos = [];
}