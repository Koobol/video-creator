export default class Video {
  /** @type {ImageBitmap[]} */
  #frames;
  #frame = 0;

  #src;
  /** @type {symbol?} */
  #audio = null;
  
  #startAt;

  #videoSrc;
  #key;

  /**
   * @param {ImageBitmap[]} frames
   * @param {string} src
   *   - the source of the video's audio, usually the video file
   * @param {import("./render").default} videoSrc
   * @param {symbol} key
   * @param {number} [startAt]
   *   - how offset the video is from its audio, in seconds
   */
  constructor(frames, src, videoSrc, key, startAt = 0) {
    this.#frames = frames;


    this.#src = src;

    this.#startAt = startAt;


    this.#videoSrc = videoSrc;

    this.#key = key;


    videos.get(videoSrc)?.push(this);
  }


  #volume = 1;
  get volume() { return this.#volume; }
  set volume(volume) {
    if (volume < 0) volume = 0;


    this.#volume = volume;


    if (!this.#audio) return;
    this.#videoSrc.changeVolume(this.#audio, volume);
  }


  get frame() { return this.#frame; }
  set frame(value) {
    this.#frame = Math.min(value, this.#frames.length - 1);


    this.pause();
  }


  /**
   * only to be used by internals
   * @param {symbol} key
   */
  nextFrame(key) {
    if (key !== this.#key) return;


    this.#frame++;
    

    if (this.#frame < this.#frames.length - 1) return;
    this.pause();
  }

  /** the current time of the video, in seconds */
  get currentTime() { return this.frame / this.#videoSrc.frameRate; }
  set currentTime(time) { this.frame = time * this.#videoSrc.frameRate; }

  get playing() { return Boolean(this.#audio); }
  
  play() {
    if (this.playing) return;

    this.#audio = this.#videoSrc.playSound(this.#src, {
      startAt: this.#startAt + this.frame / this.#videoSrc.frameRate,
      volume: this.volume,
    });
  }
  pause() {
    if (!this.#audio) return;
    this.#videoSrc.stopSound(this.#audio);
    this.#audio = null;
  }


  /** the current frame of video */
  get currentFrame() { return this.#frames[this.#frame]; }

  get width() { return this.#frames[0].width; }
  get height() { return this.#frames[0].height; }
}


/** @type {WeakMap<import("./render").default, Video[]>} */
export const videos = new WeakMap();
