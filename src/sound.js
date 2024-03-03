/** @typedef {import ("./render").default} VideoSrc */


/** @type {(sound: Sound) => Map<number, number>} */
let getVolumeChanges;


export default class Sound {
  /**
   * @param {VideoSrc} videoSrc
   * @param {string | URL} src
   * @param {SoundOptions} [options]
   */
  constructor(videoSrc, src, {
    offset = 0,
    duration = null,
    volume = 1,
    loop = false,
    loopStart = 0,
    loopEnd = 0,
  } = {}) {
    sounds.get(videoSrc)?.add(this);

    this.#videoSrc = videoSrc;

    this.#src = new URL(src, location.href);

    this.#startTime = videoSrc.currentTime;
    this.#offset = offset;
    this.#startingVolume = volume;

    this.#loop = loop;
    this.#loopStart = loopStart;
    this.#loopEnd = loopEnd;

    this.#duration = duration;
  }
  #videoSrc;

  #loop;
  /** whether or not the sound is looping */
  get loop() { return this.#loop; }
  #loopEnd;
  /** when the sound will start looping from */
  get loopEnd() { return this.#loopEnd; }
  #loopStart;
  /**
   * when the sound will stop looping from,
   * if less than or equal to loopStart will loop over entire track
   */
  get loopStart() { return this.#loopStart; }

  #startTime;
  /** the time within the video at which the sound starts playing */
  get startTime() { return this.#startTime; }

  #offset;
  /** when the sound starts playing from */
  get offset() { return this.#offset; }

  #duration;
  /**
   * how long the sound will play for,
   * will be null if sound plays all the way through
   */
  get duration() { return this.#duration; }

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
 * @prop {number} [offset] - how offset the sound is from its normal start
 * @prop {number?} [duration] - how long to play the sound for,
 *   if not specified will play entire sound
 * @prop {number} [volume] - the volume of the sound
 * @prop {boolean} [loop] - whether or not to loop the sound
 * @prop {number} [loopStart] - when to start looping from
 * @prop {number} [loopEnd] - when to stop looping from,
 *   if less than or equal to loopStart will loop over entire track
 */
