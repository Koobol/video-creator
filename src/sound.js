import VideoSrc from "./render";

export default class Sound {
  /**
   * @param {VideoSrc} videoSrc
   * @param {string | URL} src
   * @param {SoundOptions} [options]
   */
  constructor(videoSrc, src, { startAt = 0, volume = 1 } = {}) {
    sounds.get(videoSrc)?.add(this);

    this.#videoSrc = videoSrc;

    this.#src = src;

    this.#startingTime = videoSrc.currentTime;
    this.#startAt = startAt;
    this.#startingVolume = volume;
  }
  #videoSrc;

  #startingTime;
  /** the time within the video at which the sound starts playing */
  get startingTime() { return this.#startingTime; }

  #startAt;
  /** when the sound starts playing from */
  get startAt() { return this.#startAt; }

  #src;
  /** the source of the video */
  get src() { return this.#src; }

  #startingVolume;
  /**
   * get the volume of the sound at the specified time
   * @param {number} time
   */
  getVolumeAt(time) { return this.#startingVolume; }


  /** @type {number?} */
  #stopTime = null;
  get stopTime() { return this.#stopTime; }
  /** stop the sound */
  stop() {
    this.#stopTime ??= this.#videoSrc.currentTime;
  }
}


/** @type {WeakMap<VideoSrc, Set<Sound>>} */
export const sounds = new WeakMap();


/**
 * @typedef SoundOptions
 * @prop {number} [startAt] - when to start playing the sound from
 * @prop {number} [volume] - the volume of the sound
 */
