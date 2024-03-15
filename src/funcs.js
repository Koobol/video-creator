/**
 * @param {number} [time]
 * @returns {Promise<void>}
 */
export function sleep(time = 0) {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
}


/**
 * @typedef {import("./render").ToRender} ToRender
 * @typedef {import("./render").FromRender} FromRender
 */
/**
 * @overload
 * @param {T & ToRender["type"]} type
 * @returns {Promise<ToRender & { type: T }>}
 *
 * @overload
 * @param {T & FromRender["type"]} type
 * @param {Worker} render
 * @returns {Promise<FromRender & { type: T }>}
 * 
 * @function
 * @template {(ToRender | FromRender)["type"]} T
 * @param {T} type
 * @param {Worker} [render]
 * @return {(Promise<(ToRender | FromRender) & { type: T }>)}
 */
export function getMessage(type, render) {
  if (render) {
    return new Promise(resolve => {
      /** @param {MessageEvent<FromRender>} event */
      const onMessage = ({ data }) => {
        if (data.type !== type) return;
        

        resolve(/** @type {FromRender & { type: T }} */ (data));

        render.removeEventListener("message", onMessage);
      }


      render.addEventListener("message", onMessage);
    });
  }

  return new Promise(resolve => {
    /** @param {MessageEvent<ToRender>} event */
    const onMessage = ({ data }) => {
      if (data.type !== type) return;


      resolve(/** @type {ToRender & { type: T }} */ (data))

      self.removeEventListener("message", onMessage);
    }

    self.addEventListener("message", onMessage);
  });
}


/**
 * @param {EventTarget} target
 * @param {string} eventName
 * @returns {Promise<Event>}
 */
export function getEvent(target, eventName) {
  /** @param {(value: Event) => void} resolve */
  return new Promise(resolve => {
    /** @param {Event} event */
    const resolution = event => {
      resolve(event);


      target.removeEventListener(eventName, resolution);
    }
    target.addEventListener(eventName, resolution);
  });
}


/**
 * @param {AudioBuffer} buffer
 * @param {number} start - when to clip off the start, in seconds
 * @param {number} [end] - when to clip off the end, in seconds
 */
export function clipAudioBuffer(buffer, start, end = buffer.duration) {
  const startPos = Math.floor(start * buffer.sampleRate);
  const length = Math.ceil(end * buffer.sampleRate - startPos);

  const newBuffer = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length,
    sampleRate: buffer.sampleRate,
  });

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = new Float32Array(length);
    buffer.copyFromChannel(data, channel, startPos);
    newBuffer.copyToChannel(data, channel);
  }


  return newBuffer;
}
