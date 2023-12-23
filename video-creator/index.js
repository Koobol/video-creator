// @ts-check
class VideoCreator extends HTMLElement {
  static shadow;
  static {
    const template = document.createElement("template");
    template.innerHTML = `
      <link rel="stylesheet" href="video-creator/index.css">

      <canvas></canvas>
      <button
        type="button"
        role="switch"
        aria-checked="false"
        disabled
      ></button>
      <input type="range" disabled value="0" step="1">
    `;
    
    this.shadow = template.content;
  }


  #play;
  #search;


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
      (this.#preview.getContext("2d"));

    if (this.width)
      this.#preview.width = this.width;
    if (this.height)
      this.#preview.height = this.height;


    this.#play = /** @type HTMLButtonElement */ (shadow.querySelector("button"));
    this.#search = /** @type HTMLInputElement */ (shadow.querySelector("input"));


    const worker = new Worker("video-creator/render.js", { type: "module" });
    worker.postMessage(/** @type RenderInit */ ({
      width: this.#preview.width,
      height: this.#preview.height,
      src: this.src[0] === "/" || /^[a-z]+:\/\//i.test(this.src) ? this.src
        : location.pathname.match(/.*\//) + this.src,
      frameRate: this.frameRate,
    }));

    worker.addEventListener(
      "message",
      /** @param {MessageEvent<RenderOutput>} event */
      async ({ data: { frames, audioInstructions } }) => {
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
    const renderer = document.createElement("canvas");
    const ctx = renderer.getContext("bitmaprenderer");

    const recorder = new MediaRecorder(renderer.captureStream(), {
      mimeType: "video/webm",
    });


    let frame = 0;
    const nextFrame = () => {
      console.log(frame);


      if (frame > this.#frames.length) {
        recorder.stop();
        return;
      }


      ctx?.transferFromImageBitmap(this.#frames[frame]);
      frame++;


      requestAnimationFrame(nextFrame);
    }


    /** @type Blob[] */
    const chunks = [];
    recorder.addEventListener("dataavailable", ({ data }) => {
      chunks.push(data);
    });


    recorder.start();
    nextFrame();


    await waitForEvent(recorder, "stop");

    const videoPhase1 = new Blob(chunks, { type: "video/webm" });

    const videoElement = document.createElement("video");
    videoElement.src = URL.createObjectURL(videoPhase1);

    await waitForEvent(videoElement, "loadedmetadata");
    console.log(videoElement.duration, this.#frames.length / this.frameRate);
    // TODO for some reason playbackRate doesn't work properly when used with
    //      captureStream, so this solution doesn't work
    videoElement.playbackRate = Math.round(videoElement.duration /
      (this.#frames.length / this.frameRate) * 10) / 10;
    console.log(videoElement.playbackRate);


    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();

    const bufferSrc = new AudioBufferSourceNode(audioCtx, {
      buffer: this.#audio,
    });
    bufferSrc.connect(dest);


    if (!("captureStream" in HTMLMediaElement.prototype)) {
      // @ts-ignore
      HTMLMediaElement.prototype.captureStream =
        // @ts-ignore
        HTMLMediaElement.prototype.mozCaptureStream;
      if (!("mozCaptureStream" in HTMLMediaElement.prototype)) {
        alert("Sorry, this browser doesn't have the " +
          "neccessary features to generate a video file.");
        return;
      }
    }
    const finalRecorder = new MediaRecorder(new MediaStream([
      // @ts-ignore
      ...(/** @type {MediaStream} */ (videoElement.captureStream()).getTracks()),
      ...dest.stream.getTracks(),
    ]));

    /** @type Blob[] */
    const finalChunks = [];
    finalRecorder.addEventListener("dataavailable", ({ data }) => {
      finalChunks.push(data);
    });


    await videoElement.play();
    finalRecorder.start();
    bufferSrc.start();


    document.body.appendChild(videoElement);


    await waitForEvent(videoElement, "ended");
    finalRecorder.stop();

    await waitForEvent(finalRecorder, "stop");


    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(finalChunks));
    a.download = "video.webm";

    a.click();

    URL.revokeObjectURL(a.href);


    URL.revokeObjectURL(videoElement.src);
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
