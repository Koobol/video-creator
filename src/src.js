export default class VideoSrc {
  /**
   * @typedef Init
   * @prop {OffscreenCanvas} canvas - the canvas to be drawn on
   * @prop {import("./render").MediaAPI} mediaAPI
   * @prop {number} frameRate
   * 
   * only to be called by video-creator
   * @param {Init} init
   */
  constructor({ canvas, mediaAPI, frameRate }) {
    /** the canvas to draw on */
    this.canvas = canvas;


    /** an API for using images, audio, videos, etc... */
    this.mediaAPI = mediaAPI;


    /** the framerate of the video */
    this.frameRate = frameRate;
  }


  /**
   * function that will be called to set up the video
   * @returns {void | Promise<void>}
   */
  setup() {}


  /**
   * @returns {void | 0 | Promise<void | 0>}
   */
  draw() {
    throw new Error("no VideoSrc#draw function specified");
  }


  /** use to define the class as the one to be used as the video */
  static use() { globalThis.VideoSrc = this; }
}