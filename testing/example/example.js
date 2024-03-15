import VideoSrc from "../../src/render";

// import video from "./video.webm?url";
// import puppy from "./puppy.jpg?url";
import beep from "./beep.wav?url";


class Example extends VideoSrc {
  ctx = /** @type {OffscreenCanvasRenderingContext2D} */
    (this.canvas.getContext("2d"));
}


const chunk = Example.defineChunk(example => {
  const { ctx, width, height, frameRate } = example;


  let t = 0;
  let nextCycle = 0;


  example.playSound(beep, { delay: 0.5, loop: true, loopEnd: 0.5 });


  return () => {
    // if (!this.video) return false;


    if (t >= Math.PI * 4) return true;
    if (t >= nextCycle * Math.PI / 2) {
      // videoSrc.lastSound = videoSrc.playSound(beep);

      ctx.fillStyle = `#${
        Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, "0")
      }`;

      nextCycle++;
    }

    ctx.save();
    ctx.translate(
      width / 2,
      height / 2,
    );
    ctx.rotate(t);

    ctx.beginPath();
    ctx.arc(
      0,
      -50,
      50,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.restore();


    // ctx.drawImage(
    //   videoSrc.video.currentFrame,
    //   0,
    //   0,
    //   videoSrc.video.width / 4,
    //   videoSrc.video.height / 4,
    // );
    // videoSrc.video.volume -= 0.02;


    t += Math.PI / frameRate;

    return false;
  };
});


Example.render([chunk]);
