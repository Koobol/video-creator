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

  #preview
  #ctx;

  /** @type ImageBitmap[] */
  #frames;

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
    worker.postMessage(/** @type renderInit */ ({
      width: this.#preview.width,
      height: this.#preview.height,
      src: this.src[0] === "/" || /^[a-z]+:\/\//i.test(this.src) ? this.src
        : location.pathname.match(/.*\//) + this.src,
      framerate: this.framerate,
    }));

    worker.addEventListener(
      "message",
      /** @param {MessageEvent<renderOutput>} event */
      ({ data }) => {
        this.#frames = data.frames;


        this.#search.disabled = false;
        this.#search.max = `${this.#frames.length - 1}`;


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

  get framerate() {
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


    const targetTime = 1000 / this.framerate;

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
  }

  /**
   * pause the preview
   */
  pause() {
    clearTimeout(this.#playTimeout);
    this.#playTimeout = undefined;

    this.#play.ariaChecked = "false";
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
}


customElements.define("video-creator", VideoCreator);
