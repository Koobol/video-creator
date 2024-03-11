// @ts-check
import VideoSrc from "../../../src/render";


(class extends VideoSrc {
  ctx = /** @type {OffscreenCanvasRenderingContext2D} */
    (this.canvas.getContext("2d"));
  t = 0;
  nextCycle = 0;
  /** @type {import("../../../src/render").Sound?} */
  lastSound = null;

  async setup() {
    this.video = await this.getVideo("video.webm", { start: 1.4, end: 3.4 });
    this.video.play();

    this.playSound("beep.wav", { delay: 0.5, loop: true, loopEnd: 0.5 });
  }

  draw() {
    if (!this.video) return false;


    if (this.t >= Math.PI * 4) return true;
    if (this.t >= this.nextCycle * Math.PI / 2) {
      // this.lastSound = this.playSound("beep.wav");

      this.ctx.fillStyle = `#${
        Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, "0")
      }`;

      this.nextCycle++;
    }

    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.rotate(this.t);

    this.ctx.beginPath();
    this.ctx.arc(
      0,
      -50,
      50,
      0,
      Math.PI * 2,
    );
    this.ctx.fill();

    this.ctx.restore();


    this.ctx.drawImage(
      this.video.currentFrame,
      0,
      0,
      this.video.width / 4,
      this.video.height / 4,
    );
    // this.video.volume -= 0.02;


    this.t += Math.PI / this.frameRate;

    return false;
  }
}).render();
