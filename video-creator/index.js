// @ts-check
class VideoCreator extends HTMLElement {
  static shadow;
  static {
    const template = document.createElement("template");
    template.innerHTML = `
      <link rel="stylesheet" href="video-creator/index.css">

      <canvas></canvas>
      <button type="button" disabled></button>
      <input type="range" disabled value="0" step="1">
    `;
    
    this.shadow = template.content;
  }


  #shadow;
  #preview;

  #worker;
  constructor() {
    super();


    this.#shadow = this.attachShadow({ mode: "closed" });
    this.#shadow.appendChild(VideoCreator.shadow);


    this.#preview = /** @type {HTMLCanvasElement} */
      (this.#shadow.querySelector("canvas"));

    if (this.width)
      this.#preview.width = this.width;
    if (this.height)
      this.#preview.height = this.height;


    this.#worker = new Worker("video-creator/render.js", { type: "module" });
    this.#worker.postMessage(/** @type renderInit */ ({
      width: this.#preview.width,
      height: this.#preview.height,
      src: this.src[0] === "/" || /^[a-z]+:\/\//i.test(this.src) ? this.src
        : location.pathname.match(/.*\//) + this.src,
    }));
  }


  get width() { return Number(this.getAttribute("width")); }
  get height() { return Number(this.getAttribute("height")); }

  get src() { return this.getAttribute("src") ?? ""; }
}


customElements.define("video-creator", VideoCreator);
