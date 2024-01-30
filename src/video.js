export default class Video {
  /** @type {ImageBitmap[]} */
  #frames;
  #frame = 0;

  #src;
  /** @type {AudioInstruction?} */
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
    // this.playing = false;
  }

  get playing() { return Boolean(this.#audio); }
  // set playing(play) {
  //   if (play === Boolean(this.#audio)) return;


  //   if (!this.#audio) {
  //     this.#audio = mediaAPI.playSound(
  //       this.#src,
  //       this.#startAt + this.frame / frameRate,
  //     );
  //     return;
  //   }


  //   mediaAPI.stopSound(this.#audio);
  //   this.#audio = null;
  // }


  /** the current frame of video */
  get currentFrame() { return this.#frames[this.#frame]; }

  get width() { return this.#frames[0].width; }
  get height() { return this.#frames[0].height; }


  /** @type {Video[]} */
  static videos = [];
}