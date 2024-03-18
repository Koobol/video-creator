import VideoSrc from "../../src/render";

import videoUrl from "./video.webm?url";
// import puppy from "./puppy.jpg?url";
import beep from "./beep.wav?url";


class Example extends VideoSrc {
  ctx = /** @type {OffscreenCanvasRenderingContext2D} */
    (this.canvas.getContext("2d"));
}


const rotatingCircle = Example.defineChunk(async example => {
  const { ctx, width, height, frameRate } = example;


  let t = 0;
  let nextCycle = 0;


  const video = await example.getVideo(videoUrl, { start: 1.9, end: 3.9 });
  video.play();


  example.playSound(beep, { delay: 0.5, loop: true, loopEnd: 0.5 });


  return () => {
    if (t >= Math.PI * 4) return true;
    if (t >= nextCycle * Math.PI / 2) {
      // lastSound = videoSrc.playSound(beep);

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


    ctx.drawImage(
      video.currentFrame,
      0,
      0,
      video.width / 4,
      video.height / 4,
    );
    // video.volume -= 0.02;


    t += Math.PI / frameRate;

    return false;
  };
});

const movingSquare = Example.defineChunk(example => {
  const { ctx, width, height, frameRate } = example;


  let x = 0;


  ctx.fillStyle = "white";
  return () => {
    if (x > width - 100) return true;


    ctx.fillRect(x, height / 2 - 50, 100, 100);
    x += 200 / frameRate;


    return false;
  }
});


Example.render([rotatingCircle, movingSquare]);
