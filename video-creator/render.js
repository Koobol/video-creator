// @ts-check
/**
 * @typedef RenderInit
 * @prop {number} width - the width of the video
 * @prop {number} height - the height of the video
 * @prop {string} src - the file giving instructions on how to render the video
 * @prop {number} frameRate - the framerate of the video
 *
 * @typedef RenderOutput
 * @prop {ImageBitmap[]} frames - the frames of video
 * @prop {Map<string, Set<AudioInstruction>>} audioInstructions
 *   - keys are audio file being used, values are the sounds being played
 *
 *
 * @typedef {(canvas: OffscreenCanvas, audioAPI: AudioAPI, setupInit: SetupInit) => void} Setup
 * @typedef SetupInit
 * @prop {number} frameRate - the frame rate of the video
 *
 * @typedef {() => void | 0} Draw
 *
 * @typedef AudioAPI
 * @prop {PlaySound} playSound
 * @typedef {(source: string) => AudioInstruction} PlaySound
 *
 *
 * @typedef AudioInstruction
 * @prop {number} timestamp - the time that the sound starts playing in seconds
 */


self.addEventListener(
  "message",
  /** @param {MessageEvent<RenderInit>} event */
  async ({ data: { width, height, frameRate, src } }) => {
    const canvas = new OffscreenCanvas(width, height);


    let frame = 0;

    /** @type RenderOutput["frames"] */
    const frames = [];

    /** @type RenderOutput["audioInstructions"]*/
    const audioInstructions = new Map();
    const audioAPI = {
      /** @type PlaySound */
      playSound(source) {
        const instruction = {
          timestamp: frame / frameRate,
        };


        if (!audioInstructions.has(source))
        audioInstructions.set(source, new Set());
        audioInstructions.get(source)?.add(instruction);



        return instruction;
      }
    };


    /** @type {{ setup: Setup; draw: Draw }} */
    const { setup, draw } = await import(src);

    setup(canvas, audioAPI, { frameRate });


    while (true) {
      if (draw() === 0) break;

      frames.push(canvas.transferToImageBitmap());

      frame++;
    }


    postMessage(/** @type RenderOutput */ ({
      frames,
      audioInstructions,
    }), { transfer: frames });
  },
);
