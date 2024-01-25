/**
 * @exports
 * @callback Setup
 * @param {OffscreenCanvas} canvas
 * @param {typeof mediaAPI} mediaAPI
 * @param {SetupInit} setupInit
 * @returns {void}
 *
 * @exports
 * @callback AsyncSetup
 * @param {OffscreenCanvas} canvas
 * @param {typeof mediaAPI} mediaAPI
 * @param {SetupInit} setupInit
 * @returns {Promise<void>}
 *
 * @typedef SetupInit
 * @prop {number} frameRate - the frame rate of the video
 *
 *
 * @exports
 * @callback Draw
 * @returns {void | 0}
 *
 * @exports
 * @callback AsyncDraw
 * @returns {Promise<void | 0>}
 *
 *
 * @typedef {{
 *  setup: Setup | AsyncSetup
 *  draw: Draw | AsyncDraw
 * }} SrcExports
 *
 *
 * @exports
 * @typedef {typeof mediaAPI} MediaAPI
 */
export default class VideoCreator extends HTMLElement {
    static shadow: DocumentFragment;
    get width(): number;
    get height(): number;
    get src(): string;
    get frameRate(): number;
    /**
     * start playing the preview
     */
    play(): void;
    set frame(frame: number);
    get frame(): number;
    /**
     * pause the preview
     */
    pause(): void;
    generateVideo(): Promise<void>;
    #private;
}
export type Setup = (canvas: OffscreenCanvas, mediaAPI: typeof mediaAPI, setupInit: SetupInit) => void;
export type AsyncSetup = (canvas: OffscreenCanvas, mediaAPI: typeof mediaAPI, setupInit: SetupInit) => Promise<void>;
export type SetupInit = {
    /**
     * - the frame rate of the video
     */
    frameRate: number;
};
export type Draw = () => void | 0;
export type AsyncDraw = () => Promise<void | 0>;
export type SrcExports = {
    setup: Setup | AsyncSetup;
    draw: Draw | AsyncDraw;
};
export type MediaAPI = typeof mediaAPI;
