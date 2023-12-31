// @ts-check
/** @type OffscreenCanvasRenderingContext2D */
let ctx;
/** @type OffscreenCanvas */
let canvas;

/** @type number */
let frameRate;

/** @type typeof mediaAPI["playSound"] */
let playSound;


/** @type ImageBitmap */
let puppyImg;
const scale = 0.2;


/** @type Video */
let video;

const videoScale = 0.3;


/** @type AsyncSetup */
export async function setup(inputCanvas, mediaAPI, setupInit) {
  canvas = inputCanvas;
  ctx = /** @type OffscreenCanvasRenderingContext2D */
    (canvas.getContext("2d", { alpha: false, }));

  ({ playSound } = mediaAPI);


  puppyImg = await mediaAPI.getImage("puppy.jpg");


  ({ frameRate } = setupInit);


  video = await mediaAPI.getVideo("video.webm", 1.4, 3);
  video.playing = true;
}


let t = 0;
let fullRotations = 0;
let color = "white";
/** @type Draw */
export function draw() {
  if (t >= Math.PI * 7) return 0;
  if (t - fullRotations * Math.PI * 2 > Math.PI * 0.5) {
    fullRotations += 0.25;
    playSound("beep.wav");

    color = `#${Math.floor(Math.random() * 0x1000000).toString(16)}`;
  }


  ctx.drawImage(puppyImg, 0, 0, 474 * scale, 355 * scale);

  ctx.drawImage(
    video.currentFrame,
    canvas.width - video.width * videoScale,
    0,
    video.width * videoScale,
    video.height * videoScale,
  );


  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(
    Math.sin(t) * 50 + canvas.width / 2,
    Math.cos(t) * 50 + canvas.height / 2,
    50,
    0,
    2 * Math.PI,
  );
  ctx.fill();


  t += Math.PI / frameRate;
}
