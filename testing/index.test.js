// @ts-check
import VideoCreator from "../src/index";
import { it, expect, beforeEach } from "vitest";


customElements.define("video-creator", VideoCreator);


/** @type {VideoCreator} */
let videoCreator;

beforeEach(() => {
  document.body.innerHTML = "";

  videoCreator = /** @type {VideoCreator} */
    (document.createElement("video-creator"));
  document.body.appendChild(videoCreator);
});


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
    // @ts-ignore
    new URL("videos/basic.js", import.meta.url),
    { type: "module" },
  )
  const rendered = videoCreator.render(worker);
  
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
