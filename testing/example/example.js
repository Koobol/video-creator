import VideoSrc from "../../src/render";

// import video from "./video.webm?url";
// import puppy from "./puppy.jpg?url";
import beep from "./beep.wav?url";


class Example extends VideoSrc {
  ctx = /** @type {OffscreenCanvasRenderingContext2D} */
    (this.canvas.getContext("2d"));
}


const chunk = Example.defineChunk(videoSrc => {
  let t = 0;
  let nextCycle = 0;


  videoSrc.playSound(beep, { delay: 0.5, loop: true, loopEnd: 0.5 });


  return () => {
    // if (!this.video) return false;


    if (t >= Math.PI * 4) return true;
    if (t >= nextCycle * Math.PI / 2) {
      // videoSrc.lastSound = videoSrc.playSound(beep);

      videoSrc.ctx.fillStyle = `#${
        Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, "0")
      }`;

      nextCycle++;
    }

    videoSrc.ctx.save();
    videoSrc.ctx.translate(
      videoSrc.canvas.width / 2,
      videoSrc.canvas.height / 2,
    );
    videoSrc.ctx.rotate(t);

    videoSrc.ctx.beginPath();
    videoSrc.ctx.arc(
      0,
      -50,
      50,
      0,
      Math.PI * 2,
    );
    videoSrc.ctx.fill();

    videoSrc.ctx.restore();


    // videoSrc.ctx.drawImage(
    //   videoSrc.video.currentFrame,
    //   0,
    //   0,
    //   videoSrc.video.width / 4,
    //   videoSrc.video.height / 4,
    // );
    // videoSrc.video.volume -= 0.02;


    t += Math.PI / videoSrc.frameRate;

    return false;
  };
});


Example.render([chunk]);
