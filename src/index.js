import css from "./css.js";
import { getEvent, clipAudioBuffer } from "./funcs.js";
import handleVideoRequests from "./handle-video-requests.js";

import { GeneratedEvent, RenderedEvent } from "./events.js";

import globals from "./globals.js";


export default class VideoCreator extends HTMLElement {
  static #shadow;
  static {
    const template = document.createElement("template");
    template.innerHTML = `
      <style>${css}</style>

      <canvas></canvas>
      <div id="play-wrapper" hidden>
        <button
          id="play"
          type="button"
          role="switch"
          aria-checked="false"
          disabled
        ></button>
        <input type="range" disabled value="0" step="1" />
        <input type="number" disabled min="0" />
      </div>

      <div id="download-wrapper" hidden>
        <button id="download" disabled>Download</button>
        <progress hidden></progress>
      </div>
    `;
    
    this.#shadow = template.content;
  }


  #seeking = false;
  get seeking() { return this.#seeking; }


  #playWrapper;
  #play;
  #search;
  #chunkInput;

  #downloadWrapper;
  #download;
  #progress;


  #preview;
  #ctx;

  /** @type {AudioContext?} */
  #audioCtx = null;
  /** @type {MediaStreamAudioDestinationNode?} */
  #audioStream = null;
  /** @type {GainNode?} */
  #volumeNode = null;
  /** @type {AudioBufferSourceNode?} */
  #playingNode = null;


  /** @type {ImageBitmap[]?} */
  #frames = null;
  /** @type {AudioBuffer?} */
  #audio = null;

  constructor() {
    super();


    const shadow = this.attachShadow({
      mode: globals.testing ? "open" : "closed",
    });
    shadow.appendChild(VideoCreator.#shadow.cloneNode(true));


    this.#preview = /** @type {HTMLCanvasElement} */
      (shadow.querySelector("canvas"));

    this.#ctx = /** @type {CanvasRenderingContext2D} */
      (this.#preview.getContext("2d", { alpha: false }));


    this.#playWrapper = /** @type {HTMLDivElement} */
      (shadow.querySelector("#play-wrapper"));
    this.#play = /** @type {HTMLButtonElement} */
      (shadow.querySelector("#play"));
    this.#search = /** @type {HTMLInputElement} */
      (shadow.querySelector("input[type='range']"));
    this.#chunkInput = /** @type {HTMLInputElement} */
      (shadow.querySelector("input[type='number']"));

    this.#downloadWrapper = /** @type {HTMLDivElement} */
      (shadow.querySelector("#download-wrapper"));
    this.#download = /** @type {HTMLButtonElement} */
      (shadow.querySelector("#download"));
    this.#progress = /** @type {HTMLProgressElement} */
      (shadow.querySelector("progress"));
    

    this.#search.addEventListener("seeking", () => {
      this.dispatchEvent(new Event("seeking"));

      this.#seeking = true;
    });
    this.#search.addEventListener("seeked", () => {
      this.dispatchEvent(new Event("seeked"));

      this.#seeking = true;
    });

    this.#search.addEventListener("input", () => {
      this.frame = this.#search.valueAsNumber;
    });

    this.#play.addEventListener("click", () => {
      this.#play.ariaChecked = `${this.#play.ariaChecked === "false"}`;

      if (this.#play.ariaChecked === "true") this.play();
      else this.pause();
    });

    this.#chunkInput.addEventListener("change", () => {
      if (this.worker) this.render({ chunk: this.#chunkInput.valueAsNumber });
      this.pause();
    });

    this.#download.addEventListener("click", async () => {
      const video = await this.generateVideo();


      const a = document.createElement("a");
      a.download = "video";
      a.href = URL.createObjectURL(video);
      a.click();

      URL.revokeObjectURL(a.href);


      this.#progress.removeAttribute("style");
    });
  }


  /**
   * @type {{
   *   width: number;
   *   height: number;
   *   frameRate: number;
   * }?}
   */
  #currentVideo = null;

  /** @type {Worker?} */
  #worker = null;
  get worker() { return this.#worker; }
  
  #chunk = 0;
  /** the index of the current chunk */
  get chunk() { return this.#chunk; }

  /** @type {number?} */
  #chunks = null;
  /** how many chunks there are in the current video */
  get chunks() { return this.#chunks; }

  /**
   * @type {(
   * | "waiting"
   * | "rendering"
   * | "rendered"
   * )}
   */
  #state = "waiting";
  /** the status of the video's rendering */
  get state() { return this.#state; }
  #generating = false;
  get generating() { return this.#generating; }

  /**
   * @overload
   * render the video,
   * returns true if max pixel limit was exceeded while rendering,
   * returns null if rendering was aborted
   * @param {Worker} [worker]
   * @returns {Promise<boolean | null>}
   *
   * @overload
   * render the video,
   * returns true if max pixel limit was exceeded while rendering,
   * returns null if rendering was aborted
   * @param {RenderOptions} [options]
   * @returns {Promise<boolean | null>}
   *
   * @method
   * render the video,
   * returns true if max pixel limit was exceeded while rendering,
   * returns null if rendering was aborted
   * @param {RenderOptions | Worker} [optionsOrWorker]
   * @returns {Promise<boolean | null>}
   */
  async render(optionsOrWorker = {}) {
    /** @type {Worker=} */
    let worker;
    let chunk = this.chunk;

    if (optionsOrWorker instanceof Worker) worker = optionsOrWorker;
    else ({ worker, chunk = chunk } = optionsOrWorker);


    if (this.generating && !this.#readyToRender) return null;
    this.#readyToRender = false;



    if (worker !== undefined) {
      handleVideoRequests(worker);

      this.#chunk = chunk;
      this.#chunks = null;


      this.src = null;
    } else if (this.#worker === null && this.src !== null) {
      worker = new Worker(new URL(this.src, location.href), {
        type: "module",
      });
      handleVideoRequests(worker);

      this.#chunk = chunk;
      this.#chunks = null;
    }


    this.#chunkInput.valueAsNumber = chunk;


    this.#currentVideo = {
      width: this.width,
      height: this.height,
      frameRate: this.frameRate,
    };


    if (this.state === "rendered") this.reset();
    this.#state = "rendering";

    this.dispatchEvent(new Event("rendering"));


    if (worker !== undefined)
      worker.postMessage(/** @satisfies {import("./render").RenderInit} */ ({
        type: "render init",
        width: this.width,
        height: this.height,
        frameRate: this.frameRate,
        chunk,
      }));
    else {
      if (this.#worker === null) throw new Error("No source file given");
      worker = this.#worker;

      worker.postMessage(/** @satisfies {import("./render").ChunkRequest} */ ({
        type: "chunk",
        chunk,
      }));
    }
    this.#worker = worker;


    this.#chunk = chunk;


    const signal = await new Promise(
      /**
       * @param {(data: import("./render").RenderOutput | "abort") => void}
       *   resolve
       */
      resolve => {
        /** @param {MessageEvent<import("./render").FromRender>} event */
        const onMessage = ({ data }) => {
          switch (data.type) {
            default: return;
            case "abort":
              if (this.#resetting === 0) return;
            case "output":
              break;
          }

          worker?.removeEventListener("message", onMessage);
          if (this.#resetting > 0) {
            this.#resetting--;
            resolve("abort");
          } else resolve(/** @type {import("./render").RenderOutput} */ (data));
        }

        worker?.addEventListener("message", onMessage);
      },
    );
    if (signal === "abort") return null;

    const { frames, audioInstructions, maxPixelsExceeded, chunks = 1 } = signal;
    

    this.#chunks = chunks;


    this.#frames = frames;


    // compile audioInstructions
    const audioCtx = new OfflineAudioContext(
      1,
      (frames.length - 1) / this.frameRate * 44100,
      44100,
    );

    /** @type {Promise<void>[]} */
    const promises = [];
    for (const [fileName, instructions] of audioInstructions) {
      promises.push((async () => {
        const buffer = await audioCtx.decodeAudioData(
          await (await fetch(fileName)).arrayBuffer(),
        );

        for (const {
          startTime,
          offset,
          duration,
          stopTime,
          volumeChanges,
          startingVolume,
          loop,
          loopStart,
          loopEnd,
          startingSpeed,
          speedChanges,
        } of instructions) {
          const bufferSrc = new AudioBufferSourceNode(audioCtx, {
            buffer,
            loop,
            loopStart,
            loopEnd,
            playbackRate: startingSpeed,
          });
          const gain = new GainNode(audioCtx, {
            gain: startingVolume,
          });

          volumeChanges?.forEach((volume, time) => {
            gain.gain.setValueAtTime(volume, time);
          });
          speedChanges?.forEach((speed, time) => {
            bufferSrc.playbackRate.setValueAtTime(speed, time);
          });

          bufferSrc.connect(gain).connect(audioCtx.destination);


          bufferSrc.start(startTime, offset, duration);
          if (stopTime !== undefined)
            bufferSrc.stop(stopTime);
        }
      })());
    }
    await Promise.all(promises);

    this.#audio = await audioCtx.startRendering();


    if (this.#resetting > 0) {
      this.#resetting--;
      
      this.#audio = null;


      return null;
    }


    this.#disabled = false;


    this.#search.max = `${frames.length - 1}`;

    this.#chunkInput.max = `${chunks - 1}`;


    this.#frame = 0;


    this.#state = "rendered";

    this.dispatchEvent(new RenderedEvent("rendered", { maxPixelsExceeded }));


    if (this.playing) this.play();


    return maxPixelsExceeded ?? false;
  }

  #resetting = 0;
  /**
   * reset the VideoCreator to waiting
   * @param {boolean} [complete] - if set to true will erase worker
   */
  reset(complete = false) {
    if (this.generating && this.state !== "rendered") return;


    this.#disabled = true;


    this.#frame = 0;


    if (this.#state === "rendering") {
      this.#worker?.postMessage(/** @type {import("./render").AbortSignal} */ ({
        type: "abort",
      }));
      this.#resetting++;
    }
    if (complete) {
      this.#worker = null;
      this.#chunk = 0;
    }


    this.#chunks = null;


    this.#currentVideo = null;


    this.#ctx.clearRect(0, 0, this.#preview.width, this.#preview.height);


    this.#frames = null;
    this.#audio = null;


    this.#state = "waiting";


    this.dispatchEvent(new Event("reset"));
  }


  /** @param {boolean} value */
  set #disabled(value) {
    this.#search.disabled = value;
    this.#play.disabled = value;
    this.#download.disabled = value;
    this.#chunkInput.disabled = value;

    if (value) this.#stopAudio();
  }


  get width() {
    const width = Number(this.getAttribute("width"));

    return !isNaN(width) && width > 0 ? width : 300;
  }
  set width(value) { this.setAttribute("width", `${value}`); }
  get height() {
    const height = Number(this.getAttribute("height"));

    return !isNaN(height) && height > 0 ? height : 150;
  }
  set height(value) { this.setAttribute("height", `${value}`); }

  get src() { return this.getAttribute("src"); }
  set src(value) {
    if (value === null) {
      this.removeAttribute("src");
      return;
    }
    this.setAttribute("src", value);
  }

  /** the mime type of the generated video */
  get type() {
    const type = this.getAttribute("type") ?? "video/webm";
    return MediaRecorder.isTypeSupported(type) ? type : "video/webm";
  }
  set type(value) { this.setAttribute("type", value); }

  get frameRate() {
    const framerateAttr = Number(this.getAttribute("framerate"));
    return !isNaN(framerateAttr) && framerateAttr > 0 ? framerateAttr : 30;
  }
  set frameRate(value) { this.setAttribute("framerate", `${value}`); }

  get controls() {
    const controls = this.getAttribute("controls") ?? "none";
    return new Set(["none", "play", "download"]).has(controls)
      ? /** @type {"none" | "play" | "download"} */ (controls)
      : "all";
  }
  set controls(value) { this.setAttribute("controls", value); }

  get muted() { return this.hasAttribute("muted"); }
  set muted(muted) {
    if (muted === this.muted) return;

    if (muted) this.setAttribute("muted", "");
    else this.removeAttribute("muted");
  }

  #volume = 1;
  get volume() { return this.#volume; }
  set volume(volume) {
    if (volume < 0) volume = 0;


    this.#volume = volume;

    if (volume !== 0) this.muted = false;
    else this.muted = true;

    if (this.#volumeNode) this.#volumeNode.gain.value = volume;
  }


  /** @type {ReturnType<typeof setTimeout>=} */
  #playTimeout;
  /** start playing the preview */
  play() {
    if (!this.playing) this.dispatchEvent(new Event("play"));


    this.#playing = true;

    
    if (this.#audio === null || this.#frames === null) return;


    this.#audioCtx ??= new AudioContext();
    this.#audioStream ??= this.#audioCtx.createMediaStreamDestination();


    this.#play.ariaChecked = "true";


    if (this.frame >= this.#frames.length - 1)
      this.#frame = 0;


    const targetTime = 1000 / this.frameRate;

    let requestedTime = targetTime;

    let lastFrame = Date.now();

    const nextFrame = () => {
      if (this.#frames === null || this.chunks === null) return;


      const actualTime = Date.now() - lastFrame;

      lastFrame = Date.now();


      const offset = actualTime - requestedTime;


      requestedTime = targetTime * Math.ceil(offset / targetTime) - offset;
      this.#frame = Math.min(
        this.frame + Math.ceil(offset / targetTime),
        this.#frames.length - 1,
      );
      

      this.#playTimeout = setTimeout(nextFrame, targetTime);


      if (this.frame < this.#frames.length - 1) return;
      if (this.chunk < this.chunks - 1) this.render({ chunk: this.chunk + 1 });
      else this.pause();
    };

    this.#playTimeout = setTimeout(nextFrame, targetTime);


    if (this.#audioCtx.state === "suspended")
      this.#audioCtx.resume();

    this.#playingNode = new AudioBufferSourceNode(this.#audioCtx, {
      buffer: this.#audio,
    });

    this.#volumeNode ??= new GainNode(this.#audioCtx, { gain: this.volume });
    this.#playingNode.connect(this.#volumeNode);

    this.#volumeNode.connect(this.#audioCtx.destination);
    this.#volumeNode.connect(this.#audioStream);
    this.#playingNode.start(0, this.frame / this.frameRate);
  }

  /** pause the preview */
  pause() {
    if (!this.playing) return;
    this.#playing = false;


    this.dispatchEvent(new Event("pause"));


    this.#play.ariaChecked = "false";


    this.#stopAudio();
  }
  #stopAudio() {
    clearTimeout(this.#playTimeout);
    this.#playTimeout = undefined;


    this.#audioCtx?.suspend();
    this.#playingNode?.stop();
  }

  #playing = false;
  get playing() { return this.#playing; }


  get frame() { return this.#search.valueAsNumber; }
  /**
   * update preview without pausing
   * @param {number} frame
   */
  set #frame(frame) {
    if (this.#frames === null) return;


    this.#ctx.clearRect(0, 0, this.#preview.width, this.#preview.height);


    this.#ctx.drawImage(
      this.#frames[frame],
      0,
      0,
      this.#preview.width,
      this.#preview.height,
    );


    this.#search.valueAsNumber = frame;


    this.dispatchEvent(new Event("timeupdate"));
  }
  set frame(frame) {
    if (this.#frames === null) return;


    frame = Math.floor(Math.max(0, Math.min(frame, this.#frames.length - 1)));
    if (!(frame in this.#frames)) frame = 0;


    this.pause();


    this.#frame = frame;
  }

  /**
   * the time that the video is currently at in the current chunk, in seconds
   */
  get currentTime() { return this.frame / this.frameRate; }
  set currentTime(time) {
    if (this.length === null) return;


    this.frame = Math.round(
      Math.min(Math.max(time, 0), this.length) * this.frameRate,
    );
  }


  /** the length of the current chunk, in seconds */
  get length() {
    if (this.#frames === null) return null;


    return (this.#frames.length - 1) / this.frameRate;
  }


  /** whether or not the generating code is ready to render */
  #readyToRender = false;
  /** generate a video file from the current src */
  async generateVideo() {
    if (this.chunks === null) throw new Error("Video isn't rendered yet");


    if (this.generating) throw new Error("VideoCreator is already generating.");
    this.#generating = true;


    this.dispatchEvent(new Event("generating"));


    const paint = new Worker(
      new URL("paint.js", import.meta.url),
      { type: "module" },
    );

    const canvas = document.createElement("canvas");
    canvas.width = this.width;
    canvas.height = this.height;

    const offscreen = canvas.transferControlToOffscreen();


    paint.postMessage(/** @satisfies {import("./paint").PaintInit} */ ({
      offscreen,
      frameRate: this.frameRate,
    }), [offscreen]);


    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();


    const recorder = new MediaRecorder(new MediaStream([
      ...canvas.captureStream().getTracks(),
      ...dest.stream.getTracks(),
    ]), { mimeType: this.type });

    recorder.start();
    recorder.pause();

    /** @type {Blob[]} */
    const chunks = [];
    recorder.addEventListener("dataavailable", ({ data }) => {
      if (data.size === 0) return;
      chunks.push(data);
    });


    this.#progress.hidden = false;


    const videoChunks = this.chunks;
    for (let chunk = 0; chunk < videoChunks; chunk++) {
      if (this.chunk !== chunk) {
        this.#readyToRender = true;
        await this.render({ chunk });
      }


      if (this.#frames === null) throw new Error("Something is very wrong.");


      paint.postMessage(/** @satisfies {import("./paint").PaintRequest} */ ({
        frames: this.#frames,
      }), this.#frames);

      const bufferSrc = new AudioBufferSourceNode(audioCtx, {
        buffer: this.#audio,
      });
      bufferSrc.connect(dest);
      bufferSrc.start();

      recorder.resume();


      this.#progress.max = this.#frames.length / this.frameRate * 1000;
      this.#progress.value = 0;


      const start = Date.now();
      const displayProgress = () => {
        this.#progress.value = Date.now() - start;


        if (this.#progress.value < this.#progress.max)
          requestAnimationFrame(displayProgress);
        else this.#progress.removeAttribute("value");
      }
      displayProgress();


      this.reset();


      await new Promise(resolve => {
        /** @param {MessageEvent<"done" | "warn">} event */
        const onMessage = ({ data }) => {
          switch (data) {
            case "done":
              resolve(null);
              paint.removeEventListener("message", onMessage);
              break;
            case "warn":
              this.dispatchEvent(new Event("slowframerate"));
              break;
          }
        }


        paint.addEventListener("message", onMessage);
      });


      recorder.pause();
    }
    recorder.stop();

    await getEvent(recorder, "stop");


    this.#progress.hidden = true;


    this.#generating = false;


    const video = new Blob(chunks, { type: chunks[0].type });

    this.dispatchEvent(new GeneratedEvent("generated", { video }));
    return video;
  }


  /**
   * get the audio of the video
   * @param {number} [start] - where to start getting the audio from, in seconds
   * @param {number} [end] - where to stop getting the audio from, in seconds
   */
  getAudio(start = 0, end = this.#audio?.duration ?? 0) {
    if (!this.#audio) return null;

    start = Math.max(0, start);
    end = Math.min(this.#audio.duration, end);

    if (start >= end) end = start;

    
    return clipAudioBuffer(this.#audio, start, end);
  }

  /**
   * get the frames of the video
   * @param {number} [start] - where to start getting the frames from, in seconds
   * @param {number} [end] - where to stop getting the frames from, in seconds
   */
  getFrames(start = 0, end = this.length ?? 0) {
    if (!this.#frames || !this.length) return null;

    start = Math.max(0, start);
    end = Math.min(this.length, end);

    if (start >= end) end = start;
    
    
    return structuredClone(this.#frames.slice(
      Math.floor(start * this.frameRate),
      Math.ceil(end * this.frameRate),
    ));
  }

  /**
   * capture a stream of the video preview
   * @param {number} [frameRequestRate]
   */
  captureStream(frameRequestRate) {
    this.#audioCtx ??= new AudioContext();
    this.#audioStream ??= this.#audioCtx.createMediaStreamDestination();


    return new MediaStream([
      ...this.#preview.captureStream(frameRequestRate).getTracks(),
      ...this.#audioStream.stream.getTracks(),
    ]);
  }


  /**
   * @template {keyof VideoCreatorEventMap} K
   * @overload
   * @param {K} type
   * @param {(this: VideoCreator, event: VideoCreatorEventMap[K]) => void}
   *  callback
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
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} callback
   * @param {boolean | AddEventListenerOptions} [options]
   * @returns {void}
   */
  addEventListener(type, callback, options) {
    return super.addEventListener(type, callback, options);
  }
  /**
   * @template {keyof VideoCreatorEventMap} K
   * @overload
   * @param {K} type
   * @param {(this: VideoCreator, event: VideoCreatorEventMap[K]) => void}
   *  callback
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
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} callback
   * @param {boolean | AddEventListenerOptions} [options]
   * @returns {void}
   */
  removeEventListener(type, callback, options) {
    return super.removeEventListener(type, callback, options);
  }


  static get observedAttributes() { return /** @type {const} */ ([
    "src",
    "width",
    "height",
    "framerate",
    "controls",
    "muted",
  ]); }
  /**
   * @param {typeof VideoCreator["observedAttributes"][number]} name
   * @param {string?} oldValue
   * @param {string?} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;


    switch (name) {
      case "src":
        this.reset(true);

        if (newValue !== null) this.render();
        return;
      case "width":
        this.#preview.width = this.width;
        break;
      case "height":
        this.#preview.height = this.height;
        break;
      case "controls":
        this.#playWrapper.hidden =
          this.controls !== "all" && this.controls !== "play";
        this.#downloadWrapper.hidden =
          this.controls !== "all" && this.controls !== "download";
        return;
      case "muted":
        if (newValue === null) this.volume = this.volume || 1;
        else this.volume = 0;
        return;
    }


    if (
      this.#currentVideo?.width === this.width
      && this.#currentVideo?.height === this.height
      && this.#currentVideo?.frameRate === this.frameRate
      || this.state === "waiting"
    ) return;
    this.render();
  }
}


/**
 * @exports
 *
 *
 * @typedef {HTMLElementEventMap & {
 *   rendering: Event;
 *   rendered: RenderedEvent;
 *   generating: Event;
 *   generated: GeneratedEvent;
 *   play: Event;
 *   pause: Event;
 *   seeking: Event;
 *   seeked: Event;
 *   timeupdate: Event;
 *   reset: Event;
 *   slowframerate: Event;
 * }} VideoCreatorEventMap
 *
 *
 * @typedef RenderOptions
 * @prop {Worker} [worker] - the worker to use for rendering
 * @prop {number} [chunk] - the chunk to render
 */


export * from "./events.js";
