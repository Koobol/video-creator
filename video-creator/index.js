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


  constructor() {
    super();


    const shadow = this.attachShadow({ mode: "closed" });
    shadow.appendChild(VideoCreator.shadow);


    const preview = /** @type {HTMLCanvasElement} */
      (shadow.querySelector("canvas"));

    const ctx = /** @type CanvasRenderingContext2D */ (preview.getContext("2d"));

    if (this.width)
      preview.width = this.width;
    if (this.height)
      preview.height = this.height;


    const worker = new Worker("video-creator/render.js", { type: "module" });
    worker.postMessage(/** @type renderInit */ ({
      width: preview.width,
      height: preview.height,
      src: this.src[0] === "/" || /^[a-z]+:\/\//i.test(this.src) ? this.src
        : location.pathname.match(/.*\//) + this.src,
    }));

    worker.addEventListener(
      "message",
      /** @param {MessageEvent<ImageBitmap[]>} event */
      event => {
        const range = /** @type HTMLInputElement */
          (shadow.querySelector("input[type=\"range\"]"));
        range.disabled = false;
        range.max = `${event.data.length - 1}`;


        range.addEventListener("input", () => {
          ctx.fillRect(0, 0, preview.width, preview.height);


          ctx.drawImage(event.data[range.valueAsNumber], 0, 0);
        });


        range.dispatchEvent(new Event("input"));
      },
    );
  }


  get width() { return Number(this.getAttribute("width")); }
  get height() { return Number(this.getAttribute("height")); }

  get src() { return this.getAttribute("src") ?? ""; }
}


customElements.define("video-creator", VideoCreator);
