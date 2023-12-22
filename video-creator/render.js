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
 * @prop {Set<AudioInstruction>} audioInstructions
 *   - instructions on how to play audio
 * @prop {Set<string>} audioFiles - the audio files to load
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
 * @typedef {(source: string) => bigint} PlaySound
 *
 *
 * @typedef BaseAudioInstruction
 * @prop {number} frame - the frame that the instruction happens on
 * @prop {bigint} id - the id of the sound
 *
 * @typedef StartSound
 * @prop {"start"} type
 * @prop {string} source - the source file of the sound
 *
 * @typedef {(
 *   (StartSound & BaseAudioInstruction)
 * )} AudioInstruction
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

    /** @type ImageBitmap[] */
    const frames = [];

    /** @type Set<AudioInstruction> */
    const audioInstructions = new Set();
    /** @type Set<string> */
    const audioFiles = new Set();
    let nextId = 0n;
    const audioAPI = {
      /** @type PlaySound */
      playSound(source) {
        const id = nextId++;

        audioInstructions.add({ type: "start", frame, id, source });


        if (!audioFiles.has(source)) audioFiles.add(source);


        return id;
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
      audioFiles,
    }), { transfer: frames });
  },
);
