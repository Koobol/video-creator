import VideoSrc from "../../src/render";

import videoUrl from "./video.webm?url";
// import puppy from "./puppy.jpg?url";
import beep from "./beep.wav?url";


class Example extends VideoSrc {
  ctx = /** @type {OffscreenCanvasRenderingContext2D} */
    (this.canvas.getContext("2d"));

  videoPromise = this.getVideo(videoUrl, { start: 1.9, end: 3.9 });
}


const rotatingCircle = Example.defineChunk(async example => {
  const { ctx, width, height, frameRate } = example;


  ctx.clearRect(0, 0, width, height);


  let t = 0;
  let nextCycle = 0;


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


    t += Math.PI / frameRate;

    return false;
  };
});

const movingSquare = Example.defineChunk(example => {
  const { ctx, width, height, frameRate, data } = example;


  ctx.clearRect(0, 0, width, height);


  let x = 0;


  return () => {
    if (x > width - 100) return true;


    ctx.save();


    ctx.fillStyle = "white";
    ctx.fillRect(x, height / 2 - 50, 100, 100);


    if (typeof data === "string") {
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "20px Arial";

      ctx.fillText(data, x + 50, height / 2);
    }


    ctx.restore();

    x += 200 / frameRate;


    return false;
  }
});

const video = Example.defineChunk(async example => {
  const { videoPromise, ctx, width, height } = example;
  const video = await videoPromise;


  video.currentTime = 0;
  video.play();


  const text = "This is a prerecorded video file";


  return () => {
    ctx.save();

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, video.width / 2 + 1, video.height / 2 + 1);
    ctx.drawImage(
      video.currentFrame,
      0,
      0,
      video.width / 2,
      video.height / 2,
    );
    // video.volume -= 0.02;

    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.font = "30px Arial";
    ctx.fillText(text, width - 10, height - 10);

    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.moveTo(width - 10 - ctx.measureText(text).width / 2, height - 40);
    ctx.lineTo(video.width / 2 + 5, video.height / 2 + 5);
    ctx.stroke();

    ctx.restore();
    return !video.playing;
  }
});


Example.render([rotatingCircle, movingSquare, video]);
