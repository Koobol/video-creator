// @ts-check
class VideoCreator extends HTMLElement {
  static shadow;
  static {
    const template = document.createElement("template");
    template.innerHTML = `
      <link rel="stylesheet" href="video-creator/index.css">

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
    
    this.shadow = template.content;
  }


  #play;
  #search;

  #download;
  #progress;


  #preview;
  #ctx;

  #audioCtx = new AudioContext();
  /** @type {AudioBufferSourceNode?} */
  #playing = null;


  /** @type ImageBitmap[] */
  #frames;
  /** @type AudioBuffer */
  #audio;

  constructor() {
    super();


    const shadow = this.attachShadow({ mode: "closed" });
    shadow.appendChild(VideoCreator.shadow);


    this.#preview = /** @type {HTMLCanvasElement} */
      (shadow.querySelector("canvas"));

    this.#ctx = /** @type CanvasRenderingContext2D */
      (this.#preview.getContext("2d", { alpha: false }));

    if (this.width)
      this.#preview.width = this.width;
    if (this.height)
      this.#preview.height = this.height;


    this.#play = /** @type HTMLButtonElement */ (shadow.querySelector("#play"));
    this.#search = /** @type HTMLInputElement */ (shadow.querySelector("input"));

    this.#download = /** @type HTMLButtonElement */
      (shadow.querySelector("#download"));
    this.#progress = /** @type HTMLProgressElement */
      (shadow.querySelector("progress"));


    const worker = new Worker("video-creator/render.js", { type: "module" });
    worker.postMessage(/** @satisfies {RenderInit} */ ({
      width: this.#preview.width,
      height: this.#preview.height,
      src: this.src[0] === "/" || /^[a-z]+:\/\//i.test(this.src) ? this.src
        : location.pathname.match(/.*\//) + this.src,
      frameRate: this.frameRate,
    }));


    worker.addEventListener(
      "message",
      /** @param {MessageEvent<RenderMessage>} event */
      async ({ data }) => {
        if (data.type !== "video request") return;


        const { src } = data;


        const video = document.createElement("video");
        video.src = src;

        await waitForEvent(video, "loadedmetadata");


        /** @type ImageBitmap[] */
        const frames = [];

        while (true) {
          console.log(video.currentTime);


          try { frames.push(await createImageBitmap(video)); }
          catch {
            await waitForEvent(video, "canplaythrough");

            frames.push(await createImageBitmap(video)); 
          }


          if (video.currentTime >= video.duration) break;

          video.currentTime += 1 / this.frameRate;
        }
      }
    );


    worker.addEventListener(
      "message",
      /** @param {MessageEvent<RenderMessage>} event */
      async ({ data }) => {
        if (data.type !== "output") return;

        
        const { frames, audioInstructions } = data;


        this.#frames = frames;


        // compile audioInstructions
        const audioCtx = new OfflineAudioContext(
          1,
          frames.length / this.frameRate * 44100,
          44100,
        );

        /** @type Promise<void>[]*/
        const promises = [];
        for (const [fileName, instructions] of audioInstructions) {
          promises.push((async () => {
            const buffer = await audioCtx.decodeAudioData(
              await (await fetch(fileName)).arrayBuffer(),
            );

            for (const instruction of instructions) {
              const bufferSrc = new AudioBufferSourceNode(audioCtx, { buffer });
              bufferSrc.connect(audioCtx.destination);
              bufferSrc.start(instruction.timestamp);
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
        this.#download.addEventListener("click", () => { this.generateVideo(); });
      },
    );
  }


  get width() { return Number(this.getAttribute("width")); }
  get height() { return Number(this.getAttribute("height")); }

  get src() { return this.getAttribute("src") ?? ""; }

  get frameRate() {
    const framerateAttr = Number(this.getAttribute("framerate"));
    return framerateAttr >= 0 ? framerateAttr : 60;
  }


  /** @type number= */
  #playTimeout;
  /**
   * start playing the preview
   */
  play() {
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

    const offset =
      Math.floor(this.frame / this.frameRate * this.#audio.sampleRate);
    const buffer = this.#audioCtx.createBuffer(
      this.#audio.numberOfChannels,
      this.#audio.length - offset,
      this.#audio.sampleRate,
    );
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = new Float32Array(this.#audio.length - offset);
      this.#audio.copyFromChannel(data, channel, offset);
      buffer.copyToChannel(data, channel);
    }

    this.#playing = new AudioBufferSourceNode(this.#audioCtx, { buffer });
    this.#playing.connect(this.#audioCtx.destination);
    this.#playing.start(0);
  }

  /**
   * pause the preview
   */
  pause() {
    clearTimeout(this.#playTimeout);
    this.#playTimeout = undefined;

    this.#play.ariaChecked = "false";


    this.#audioCtx.suspend();
    this.#playing?.stop();
  }


  get frame() { return this.#search.valueAsNumber; }
  /**
   * update preview without updating search bar
   * @param {number} frame
   */
  set #frame(frame) {
    this.#ctx.clearRect(0, 0, this.#preview.width, this.#preview.height);


    this.#ctx.drawImage(this.#frames[frame], 0, 0);
  }
  set frame(frame) {
    if (frame >= this.#frames?.length || frame < 0)
      throw new RangeError(`frame ${frame} does not exist`);

    this.#search.valueAsNumber = frame;


    this.#frame = frame;
  }


  async generateVideo() {
    this.#play.disabled = true;
    this.#search.disabled = true;

    this.pause();

    this.#download.disabled = true;


    this.#progress.style.display = "unset";
    this.#progress.max = this.#frames.length / this.frameRate * 1000;
    this.#progress.value = 0;


    const paint = new Worker("video-creator/paint.js", { type: "module" });

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
    ]));

    /** @type Blob[] */
    const chunks = [];
    recorder.addEventListener("dataavailable", ({ data }) => {
      chunks.push(data);
    });


    recorder.start();
    paint.postMessage(/** @satisfies {paintInit} */ ({
      frames: this.#frames,
      offscreen,
      frameRate: this.frameRate,
    }), [...this.#frames, offscreen]);
    bufferSrc.start();


    const start = Date.now();
    const displayProgress = () => {
      this.#progress.value = Date.now() - start;


      if (this.#progress.value < this.#progress.max)
        requestAnimationFrame(displayProgress);
    }
    displayProgress();


    await waitForEvent(paint, "message");
    recorder.stop();

    await waitForEvent(recorder, "stop");


    const a = document.createElement("a");
    a.download = "video";
    a.href = URL.createObjectURL(new Blob(chunks));
    a.click();

    URL.revokeObjectURL(a.href);


    this.#progress.removeAttribute("style");
  }
}


customElements.define("video-creator", VideoCreator);


/**
 * @param {EventTarget} target
 * @param {string} event
 * @returns {Promise<Event>}
 */
function waitForEvent(target, event) {
  return new Promise(resolve => { target.addEventListener(event, resolve); });
}
