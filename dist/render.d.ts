/**
 * @typedef RenderInit
 * @prop {number} width - the width of the video
 * @prop {number} height - the height of the video
 * @prop {string} src - the file giving instructions on how to render the video
 * @prop {number} frameRate - the framerate of the video
 *
 * @typedef RenderOutput
 * @prop {"output"} type
 * @prop {ImageBitmap[]} frames - the frames of video
 * @prop {AudioInstructions} audioInstructions
 *   - keys are audio file being used, values are the sounds being played
 *
 *
 * @typedef AudioInstruction
 * @prop {number} timestamp - the time that the sound starts playing in seconds
 * @prop {number} [stop] - the timestamp when to stop the sound
 * @prop {number} [startAt] - when to start playing the sound from
 *
 * @typedef {Map<string, Set<AudioInstruction>>} AudioInstructions
 *
 *
 * @typedef VideoRequest
 * @prop {"video request"} type
 * @prop {string} src
 * @prop {number} [start] - where to start the video
 * @prop {number} [end] - where to end the video
 *
 * @typedef VideoResponse
 * @prop {"video response"} type
 * @prop {string} src
 * @prop {ImageBitmap[]} frames
 *
 *
 * @typedef {RenderOutput | VideoRequest} RenderMessage
 */
/** @type {URL} */
declare let src: URL;
/** @type {number} */
declare let frameRate: number;
/** @type {AudioInstructions} */
declare const audioInstructions: AudioInstructions;
declare let frame: number;
declare namespace mediaAPI {
    /**
     * play the requested sound
     * @param {string} src - the file containing the sound
     * @param {number} [startAt] - when to start playing the sound from
     * @returns {AudioInstruction}
     */
    function playSound(src: string, startAt?: number): AudioInstruction;
    /**
     * pause the given sound
     * @param {AudioInstruction} sound
     */
    function stopSound(sound: AudioInstruction): void;
    /**
     * get an ImageBitmap containing the data from the requested file
     * @param {string} imageSrc - the file containing the image
     * @returns {Promise<ImageBitmap>}
     */
    function getImage(imageSrc: string): Promise<ImageBitmap>;
    /**
     * get an ImageBitmap containing the data from the requested file
     * @param {string} src - the file containing the image
     * @param {number} [start] - the timestamp the video starts on
     * @param {number} [end] - the timestamp the video ends on
     */
    function getVideo(src: string, start?: number, end?: number): Promise<Video>;
}
declare class Video {
    /** @type {Video[]} */
    static videos: Video[];
    /**
     * @param {ImageBitmap[]} frames
     * @param {string} src
     *   - the source of the video's audio, usually the video file
     * @param {number} [startAt]
     *   - how offset the video is from its audio, in seconds
     */
    constructor(frames: ImageBitmap[], src: string, startAt?: number);
    set frame(value: number);
    get frame(): number;
    set playing(play: boolean);
    get playing(): boolean;
    /** the current frame of video */
    get currentFrame(): ImageBitmap;
    get width(): number;
    get height(): number;
    #private;
}
/** @param {MessageEvent<RenderInit>} event */
declare function init({ data }: MessageEvent<RenderInit>): Promise<void>;
type RenderInit = {
    /**
     * - the width of the video
     */
    width: number;
    /**
     * - the height of the video
     */
    height: number;
    /**
     * - the file giving instructions on how to render the video
     */
    src: string;
    /**
     * - the framerate of the video
     */
    frameRate: number;
};
type RenderOutput = {
    type: "output";
    /**
     * - the frames of video
     */
    frames: ImageBitmap[];
    /**
     *  - keys are audio file being used, values are the sounds being played
     */
    audioInstructions: AudioInstructions;
};
type AudioInstruction = {
    /**
     * - the time that the sound starts playing in seconds
     */
    timestamp: number;
    /**
     * - the timestamp when to stop the sound
     */
    stop?: number;
    /**
     * - when to start playing the sound from
     */
    startAt?: number;
};
type AudioInstructions = Map<string, Set<AudioInstruction>>;
type VideoRequest = {
    type: "video request";
    src: string;
    /**
     * - where to start the video
     */
    start?: number;
    /**
     * - where to end the video
     */
    end?: number;
};
type VideoResponse = {
    type: "video response";
    src: string;
    frames: ImageBitmap[];
};
type RenderMessage = RenderOutput | VideoRequest;
