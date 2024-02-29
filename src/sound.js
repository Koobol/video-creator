import VideoSrc from "./render";

export default class Sound {
  /**
   * @param {VideoSrc} videoSrc
   * @param {string | URL} src
   * @param {SoundOptions} [options]
   */
  constructor(videoSrc, src, { startAt = 0, volume } = {}) {
    sounds.get(videoSrc)?.push(this);

    this.#src = src;

    this.#timestamp = videoSrc.currentTime;
    this.#startAt = startAt;
    this.#volume = volume;
  }
  #timestamp;
  #startAt;
  #volume;

  #src;
  /** the source of the video */
  get src() { return this.#src; }
}


/** @type {WeakMap<VideoSrc, Sound[]>} */
export const sounds = new WeakMap();


/**
 * @typedef SoundOptions
 * @prop {number} [startAt] - when to start playing the sound from
 * @prop {number} [volume] - the volume of the sound
 */
