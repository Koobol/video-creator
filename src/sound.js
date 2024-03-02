import VideoSrc from "./render";


/** @type {(sound: Sound) => Map<number, number>} */
let getVolumeChanges;


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


  /** @type {Map<number, number>} */
  #volumeChanges = new Map();

  /** the current volume of the video */
  get volume() { return this.getVolumeAt(this.#videoSrc.currentTime); }
  set volume(volume) {
    if (volume < 0) volume = 0;

    this.#volumeChanges.set(this.#videoSrc.currentTime, volume);
  }

  /**
   * get the volume of the sound at the specified time
   * @param {number} time
   * @returns {number}
   */
  getVolumeAt(time) {
    let volume = this.#startingVolume;


    for (const [changeTime, changeVolume] of this.#volumeChanges) {
      if (time < changeTime) break;


      volume = changeVolume;
    }


    return volume;
  }

  static {
    getVolumeChanges = sound => sound.#volumeChanges;
  }


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


export { getVolumeChanges };


/**
 * @exports
 *
 * @typedef SoundOptions
 * @prop {number} [startAt] - when to start playing the sound from
 * @prop {number} [volume] - the volume of the sound
 */
