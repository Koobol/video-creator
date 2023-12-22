// @ts-check
/**
 * @typedef RenderInit
 * @prop {number} width - the width of the video
 * @prop {number} height - the height of the video
 * @prop {string} src - the file giving instructions on how to render the video
 * @prop {number} framerate - the framerate of the video
 *
 * @typedef RenderOutput
 * @prop {ImageBitmap[]} frames - the frames of video
 * @prop {Map<string, Set<AudioInstruction>>} audioInstructions
 *   - keys are audio file being used, values are the sounds being played
 *
 *
 * @typedef {(canvas: OffscreenCanvas, setupInit: SetupInit) => void} Setup
 * @typedef SetupInit
 * @prop {number} framerate - the framerate of the video
 *
 * @typedef {(
 *   canvas: OffscreenCanvas,
 *   audio: AudioAPI,
 * ) => void | 0} Draw
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
  async ({ data: { width, height, framerate, src } }) => {
    const canvas = new OffscreenCanvas(width, height);


    /** @type {{ setup: Setup; draw: Draw }} */
    const { setup, draw } = await import(src);

    setup(canvas, { framerate: framerate });


    let frame = 0;

    /** @type RenderOutput["frames"] */
    const frames = [];

    /** @type RenderOutput["audioInstructions"]*/
    const audioInstructions = new Map();
    const audioAPI = {
      /** @type PlaySound */
      playSound(source) {
        const instruction = {
          timestamp: frame / framerate,
        };


        if (!audioInstructions.has(source))
          audioInstructions.set(source, new Set());
        audioInstructions.get(source)?.add(instruction);



        return instruction;
      }
    };

    while (true) {
      if (draw(canvas, audioAPI) === 0) break;

      frames.push(canvas.transferToImageBitmap());

      frame++;
    }


    postMessage(/** @type RenderOutput */ ({
      frames,
      audioInstructions,
    }), { transfer: frames });
  },
);
