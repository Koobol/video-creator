// @ts-check
import VideoSrc from "../../src/render";


(class extends VideoSrc {
  ctx = this.canvas.getContext("2d");


  draw() {
    return this.frame >= 3;
  }
}).render();
