/**
 * @exports
 * @typedef {EventInit & { consuming?: boolean }} GeneratingEventInit
 * @typedef {EventInit & { video: Blob }} GeneratedEventInit
 * @typedef {EventInit & { maxPixelsExceeded?: boolean }} RenderedEventInit
 */

export class GeneratingEvent extends Event {
  /**
   * @param {string} type
   * @param {GeneratingEventInit} [eventInitDict]
   */
  constructor(type, eventInitDict) {
    super(type, eventInitDict);


    /** whether or not the video is being consumed */
    this.consuming = eventInitDict?.consuming ?? true;
  }
}
export class GeneratedEvent extends Event {
  /**
   * @param {string} type
   * @param {GeneratedEventInit} [eventInitDict]
   */
  constructor(type, eventInitDict) {
    super(type, eventInitDict);


    /** the generated video */
    this.video = eventInitDict?.video;
  }
}

export class RenderedEvent extends Event {
  /**
   * @param {string} type
   * @param {RenderedEventInit} [eventInitDict]
   */
  constructor(type, eventInitDict) {
    super(type, eventInitDict);


    /** whether or not the max pixel limit was exceeded while rendering */
    this.maxPixelsExceeded = eventInitDict?.maxPixelsExceeded ?? false;
  }
}
