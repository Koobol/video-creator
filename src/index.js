import css from "./css.js";


export default class VideoCreator extends HTMLElement {
  static #shadow;
  static {
    const template = document.createElement("template");
    template.innerHTML = `
      <style>${css}</style>

      <canvas></canvas>
      <button
        id="play"
        type="button"
        role="switch"
        aria-checked="false"
        disabled
      ></button>
      <input type="range" disabled value="0" step="1">

      <div>
        <button id="download" disabled>Download</button>
        <progress></progress>
      </div>
    `;
    
    this.#shadow = template.content;
  }


  seeking = false;


  #play;
  #search;

  #download;
  #progress;


  #preview;
  #ctx;

  /** @type {AudioContext | null} */
  #audioCtx = null;
  /** @type {AudioBufferSourceNode?} */
  #playing = null;


  /** @type {ImageBitmap[]} */
  #frames;
  /** @type {AudioBuffer} */
  #audio;

  constructor() {
    super();


    const shadow = this.attachShadow({ mode: "closed" });
    shadow.appendChild(VideoCreator.#shadow);


    this.#preview = /** @type {HTMLCanvasElement} */
      (shadow.querySelector("canvas"));

    this.#ctx = /** @type {CanvasRenderingContext2D} */
      (this.#preview.getContext("2d", { alpha: false }));

    if (this.width)
      this.#preview.width = this.width;
    if (this.height)
      this.#preview.height = this.height;


    this.#play = /** @type {HTMLButtonElement} */ (shadow.querySelector("#play"));
    this.#search = /** @type {HTMLInputElement} */ (shadow.querySelector("input"));

    this.#download = /** @type {HTMLButtonElement} */
      (shadow.querySelector("#download"));
    this.#progress = /** @type {HTMLProgressElement} */
      (shadow.querySelector("progress"));
    

    this.#search.addEventListener("seeking", () => {
      this.dispatchEvent(new Event("seeking"));

      this.seeking = true;
    });
    this.#search.addEventListener("seeked", () => {
      this.dispatchEvent(new Event("seeked"));

      this.seeking = true;
    });


    if (this.src === null) return;
    
    this.render(new Worker(
      new URL(this.src, location.href),
      { type: "module" },
    ));
  }


  /** @type {Worker | null} */
  #renderer = null;

  /**
   * @type {(
   * | "waiting"
   * | "rendering"
   * | "rendered"
   * | "consumed"
   * )}
   */
  #state = "waiting";
  /** the status of the video's rendering */
  get state() { return this.#state; }
  /**
   * render the video with the given worker
   * @param {Worker} worker
   */
  async render(worker) {
    if (this.state !== "waiting") {
      if (this.src === null)
        throw new Error("VideoCreator#render can only be called once");
      throw new Error(
        "VideoCreator#render can only be called if the VideoCreator has no src",
      );
    }
    this.#state = "rendering";


    this.dispatchEvent(new Event("rendering"));


    this.#renderer = worker;


    worker.postMessage(/** @satisfies {import("./render").RenderInit} */ ({
      type: "render init",
      width: this.#preview.width,
      height: this.#preview.height,
      frameRate: this.frameRate,
    }));


    worker.addEventListener(
      "message",
      /** @param {MessageEvent<import("./render").RenderMessage>} event */
      async ({ data }) => {
        if (data.type !== "video request") return;


        const { src, start = 0 } = data;


        const video = document.createElement("video");
        video.src = src;


        await waitForEvent(video, "loadedmetadata");


        if (start) video.currentTime = start;

        const { end = video.duration } = data;


        await waitForEvent(video, "canplaythrough");


        /** @type {ImageBitmap[]} */
        const frames = [];

        while (true) {
          if (video.readyState < 2) await waitForEvent(video, "canplaythrough");

          frames.push(await createImageBitmap(video));


          if (video.currentTime >= end) break;

          video.currentTime = 1 / this.frameRate * frames.length + start;
        }


        worker.postMessage(
          /** @satisfies {import("./render").VideoResponse} */ ({
            type: "video response",
            src,
            frames,
          }),
          frames,
        );
      }
    );


    const { frames, audioInstructions } = await new Promise(
      /** @param {(data: import("./render").RenderOutput) => void} resolve */
      resolve => {
        /** @param {MessageEvent<import("./render").RenderMessage>} event */
        const resolution = ({ data }) => {
          if (data?.type !== "output") return;

          worker.removeEventListener("message", resolution);
          resolve(data);
        }
        worker.addEventListener("message", resolution);
      },
    );


    this.#frames = frames;


    // compile audioInstructions
    const audioCtx = new OfflineAudioContext(
      1,
      frames.length / this.frameRate * 44100,
      44100,
    );

    /** @type {Promise<void>[]} */
    const promises = [];
    for (const [fileName, instructions] of audioInstructions) {
      promises.push((async () => {
        const fullBuffer = await audioCtx.decodeAudioData(
          await (await fetch(fileName)).arrayBuffer(),
        );

        for (const instruction of instructions) {
          const buffer = !instruction.startAt ? fullBuffer
            : clipAudioBuffer(fullBuffer, instruction.startAt);


          let bufferSrc = new AudioBufferSourceNode(audioCtx, { buffer });
          bufferSrc.connect(audioCtx.destination);


          bufferSrc.start(instruction.timestamp);
          if (instruction.stop !== undefined)
            bufferSrc.stop(instruction.stop);
        }
      })());
    }
    await Promise.all(promises);

    this.#audio = await audioCtx.startRendering();


    this.#search.disabled = false;
    this.#search.max = `${frames.length - 1}`;


    this.#search.addEventListener("input", () => {
      this.#frame = this.frame;

      this.pause();
    });


    this.#search.dispatchEvent(new Event("input"));


    this.#play.disabled = false;

    this.#play.addEventListener("click", () => {
      this.#play.ariaChecked = `${this.#play.ariaChecked === "false"}`;

      if (this.#play.ariaChecked === "true") this.play();
      else this.pause();
    });


    this.#download.disabled = false;
    this.#download.addEventListener("click", async () => {
      const video = await this.generateVideo();


      const a = document.createElement("a");
      a.download = "video";
      a.href = URL.createObjectURL(video);
      a.click();

      URL.revokeObjectURL(a.href);


      this.#progress.removeAttribute("style");
    });


    this.#state = "rendered";

    this.dispatchEvent(new Event("rendered"));
  }


  get width() { return Number(this.getAttribute("width")); }
  get height() { return Number(this.getAttribute("height")); }

  get src() { return this.getAttribute("src"); }

  /** the mime type of the generated video */
  get type() { return this.getAttribute("type") ?? "video/webm"; }

  get frameRate() {
    const framerateAttr = Number(this.getAttribute("framerate"));
    return framerateAttr >= 0 ? framerateAttr : 30;
  }


  /** @type {number=} */
  #playTimeout;
  /**
   * start playing the preview
   */
  play() {
    if (this.#audioCtx === null) this.#audioCtx = new AudioContext();


    this.dispatchEvent(new Event("play"));


    if (this.#playTimeout !== undefined) return;


    this.#play.ariaChecked = "true";


    if (this.frame >= this.#frames.length - 1)
      this.frame = 0;


    const targetTime = 1000 / this.frameRate;

    let requestedTime = targetTime;

    let lastFrame = Date.now();

    const nextFrame = () => {
      const actualTime = Date.now() - lastFrame;

      lastFrame = Date.now();


      const offset = actualTime - requestedTime;


      requestedTime = targetTime * Math.ceil(offset / targetTime) - offset;
      this.frame = Math.min(
        this.frame + Math.ceil(offset / targetTime),
        this.#frames.length - 1,
      );
      

      this.#playTimeout = setTimeout(nextFrame, targetTime);


      if (this.frame >= this.#frames.length - 1) this.pause();
    };

    this.#playTimeout = setTimeout(nextFrame, targetTime);


    if (this.#audioCtx.state === "suspended")
      this.#audioCtx.resume();

    const buffer = clipAudioBuffer(
      this.#audio,
      this.frame / this.frameRate,
    );

    this.#playing = new AudioBufferSourceNode(this.#audioCtx, { buffer });
    this.#playing.connect(this.#audioCtx.destination);
    this.#playing.start(0);
  }

  /** pause the preview */
  pause() {
    if (!this.playing) return;


    this.dispatchEvent(new Event("pause"));


    clearTimeout(this.#playTimeout);
    this.#playTimeout = undefined;

    this.#play.ariaChecked = "false";


    this.#audioCtx?.suspend();
    this.#playing?.stop();
  }

  get playing() { return this.#audioCtx?.state === "running"; }
  

  get frame() { return this.#search.valueAsNumber; }
  /**
   * update preview without updating search bar
   * @param {number} frame
   */
  set #frame(frame) {
    this.#ctx.clearRect(0, 0, this.#preview.width, this.#preview.height);


    this.#ctx.drawImage(this.#frames[frame], 0, 0);


    this.dispatchEvent(new Event("timeupdate"));
  }
  set frame(frame) {
    if (frame >= this.#frames?.length || frame < 0)
      throw new RangeError(`frame ${frame} does not exist`);

    this.#search.valueAsNumber = frame;


    this.#frame = frame;
  }

  /** the time that the video is currently at, in seconds */
  get currentTime() { return this.frame / this.frameRate; }
  set currentTime(time) {
    this.frame = Math.round(
      Math.min(Math.max(time, 0), this.length) * this.frameRate,
    );
  }


  get length() { return (this.#frames.length - 1) / this.frameRate; }


  /**
   * @param {boolean} [consuming]
   *   - whether or not to consume the video for performance
   */
  async generateVideo(consuming = true) {
    this.dispatchEvent(new GeneratingEvent("generating", { consuming }));


    if (consuming) {
      this.#play.disabled = true;
      this.#search.disabled = true;

      this.pause();

      this.#download.disabled = true;


      this.#progress.style.display = "unset";
      this.#progress.max = this.#frames.length / this.frameRate * 1000;
      this.#progress.value = 0;


      this.#state = "consumed";
    }


    const paint = new Worker(
      new URL("paint.js", import.meta.url),
      { type: "module" },
    );

    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;

    const offscreen = canvas.transferControlToOffscreen();


    const audioCtx = new AudioContext();
    const bufferSrc = new AudioBufferSourceNode(audioCtx, {
      buffer: this.#audio,
    });
    const dest = audioCtx.createMediaStreamDestination();
    bufferSrc.connect(dest);


    const recorder = new MediaRecorder(new MediaStream([
      ...canvas.captureStream().getTracks(),
      ...dest.stream.getTracks(),
    ]), { mimeType: this.type });

    /** @type {Blob[]} */
    const chunks = [];
    recorder.addEventListener("dataavailable", ({ data }) => {
      chunks.push(data);
    });


    recorder.start();
    paint.postMessage(/** @satisfies {import("./paint").PaintInit} */ ({
      frames: this.#frames,
      offscreen,
      frameRate: this.frameRate,
    }), [...(consuming ? this.#frames : []), offscreen]);
    bufferSrc.start();


    if (consuming) {
      const start = Date.now();
      const displayProgress = () => {
        this.#progress.value = Date.now() - start;


        if (this.#progress.value < this.#progress.max)
          requestAnimationFrame(displayProgress);
      }
      displayProgress();
    }


    await waitForEvent(paint, "message");
    recorder.stop();

    await waitForEvent(recorder, "stop");


    const video = new Blob(chunks, { type: this.type });

    this.dispatchEvent(new GeneratedEvent("generated", { video }));
    return video;
  }


  /**
   * @overload
   * @param {K} type
   * @param {(this: VideoCreator, event: VideoCreatorEventMap[K]) => void} callback
   * @param {boolean | AddEventListenerOptions} [options]
   * @returns {void}
   *
   * @overload
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} callback
   * @param {boolean | AddEventListenerOptions} [options]
   * @returns {void}
   *
   * @method
   * @template {keyof VideoCreatorEventMap} K
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} callback
   * @param {boolean | AddEventListenerOptions} [options]
   * @returns {void}
   */
  addEventListener(type, callback, options) {
    super.addEventListener(type, callback, options);
  }
}

/**
 * @exports
 * @typedef {HTMLElementEventMap & {
 *   rendering: Event;
 *   rendered: Event;
 *   generating: GeneratingEvent;
 *   generated: GeneratedEvent;
 *   play: Event;
 *   pause: Event;
 *   seeking: Event;
 *   seeked: Event;
 *   timeupdate: Event;
 * }} VideoCreatorEventMap
 * 
 * 
 * @typedef {EventInit & { consuming?: boolean }} GeneratingEventInit
 * @typedef {EventInit & { video: Blob }} GeneratedEventInit
 */


export class GeneratingEvent extends Event {
  /**
   * @param {string} type
   * @param {GeneratingEventInit} eventInitDict
   */
  constructor(type, eventInitDict) {
    super(type, eventInitDict);


    /** whether or not the video is being consumed */
    this.consuming = eventInitDict.consuming ?? true;
  }
}
export class GeneratedEvent extends Event {
  /**
   * @param {string} type
   * @param {GeneratedEventInit} eventInitDict
   */
  constructor(type, eventInitDict) {
    super(type, eventInitDict);


    /** the generated video */
    this.video = eventInitDict.video;
  }
}


/**
 * @param {EventTarget} target
 * @param {string} eventName
 * @returns {Promise<Event>}
 */
function waitForEvent(target, eventName) {
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
 */
function clipAudioBuffer(buffer, start) {
  const startPos = start * buffer.sampleRate;

  const newBuffer = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length: buffer.length - startPos,
    sampleRate: buffer.sampleRate,
  });

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = new Float32Array(buffer.length - startPos);
    buffer.copyFromChannel(data, channel, startPos);
    newBuffer.copyToChannel(data, channel);
  }


  return newBuffer;
}
