import VideoCreator from "../src/index";
import { it, expect, beforeEach } from "vitest";

import globals from "../src/globals";

import { sleep } from "../src/funcs";


globals.testing = true;


customElements.define("video-creator", VideoCreator);


/** @type {VideoCreator} */
let videoCreator;

beforeEach(() => {
  document.body.innerHTML = "";

  videoCreator = /** @type {VideoCreator} */
    (document.createElement("video-creator"));
  document.body.appendChild(videoCreator);
});


/** @param {Worker} [worker] */
const render = (worker = new Worker(
  new URL("videos/basic.js", import.meta.url),
  { type: "module" },
)) => videoCreator.render({ worker });


it("exists", () => {
  expect(document.querySelector("video-creator")).toBe(videoCreator);
});
it("starts out waiting", () => {
  expect(videoCreator.state).toBe("waiting");


  expect(videoCreator.worker).toBe(null);
  

  expect(videoCreator.playing).toBe(false);

  videoCreator.play();
  expect(videoCreator.playing).toBe(false);


  expect(videoCreator.getFrames()).toBeNull();
  expect(videoCreator.getAudio()).toBeNull();
});

it("can be rendered", async () => {
  const worker = new Worker(
    new URL("videos/basic.js", import.meta.url),
    { type: "module" },
  )
  const rendered = videoCreator.render({ worker });
  
  expect(videoCreator.worker).toBe(worker);


  expect(videoCreator.state).toBe("rendering");

  await rendered;
  expect(videoCreator.state).toBe("rendered");


  videoCreator.play();
  expect(videoCreator.playing).toBe(true);

  videoCreator.pause();
  expect(videoCreator.playing).toBe(false);


  expect(videoCreator.getFrames()?.[0]).toBeInstanceOf(ImageBitmap);
  expect(videoCreator.getAudio()).toBeInstanceOf(AudioBuffer);
});

it("can generate", async () => {
  await render();
  

  expect(await videoCreator.generateVideo()).toBeInstanceOf(Blob);
  expect(videoCreator.state).toBe("rendered");


  expect(await videoCreator.generateVideo(true)).toBeInstanceOf(Blob);
  expect(videoCreator.state).toBe("waiting");
});

it("can be reset", async () => {
  await render();


  videoCreator.reset();

  expect(videoCreator.state).toBe("waiting");


  expect(videoCreator.worker).not.toBeNull();

  await videoCreator.render();
  expect(videoCreator.state).toBe("rendered");
});

it("can be controlled", async () => {
  expect(videoCreator.shadowRoot).not.toBeNull();


  const play = /** @type {HTMLButtonElement} */
    (videoCreator.shadowRoot?.querySelector("#play"));
  expect(play).toBeInstanceOf(HTMLButtonElement);

  const search = /** @type {HTMLInputElement} */
    (videoCreator.shadowRoot?.querySelector('input[type="range"]'));
  expect(search).toBeInstanceOf(HTMLInputElement);

  const download = /** @type {HTMLButtonElement} */
    (videoCreator.shadowRoot?.querySelector("#download"));
  expect(download).toBeInstanceOf(HTMLButtonElement);

  
  expect(videoCreator.controls).toBe("none");
  expect(play.checkVisibility()).toBe(false);
  expect(search.checkVisibility()).toBe(false);
  expect(download.checkVisibility()).toBe(false);

  videoCreator.controls = "play";
  expect(play.checkVisibility()).toBe(true);
  expect(search.checkVisibility()).toBe(true);
  expect(download.checkVisibility()).toBe(false);

  videoCreator.controls = "download";
  expect(play.checkVisibility()).toBe(false);
  expect(search.checkVisibility()).toBe(false);
  expect(download.checkVisibility()).toBe(true);

  videoCreator.controls = "all";
  expect(play.checkVisibility()).toBe(true);
  expect(search.checkVisibility()).toBe(true);
  expect(download.checkVisibility()).toBe(true);


  expect(play.disabled).toBe(true);
  expect(search.disabled).toBe(true);
  expect(download.disabled).toBe(true);

  await render();
  expect(play.disabled).toBe(false);
  expect(search.disabled).toBe(false);
  expect(download.disabled).toBe(false);


  play.click();
  expect(videoCreator.playing).toBe(true);

  play.click();
  expect(videoCreator.playing).toBe(false);


  videoCreator.play();

  search.dispatchEvent(new Event("input"));

  await sleep();
  expect(videoCreator.playing).toBe(false);
});
