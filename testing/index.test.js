// @ts-check
import VideoCreator from "../src/index";
import { it, expect, beforeEach, afterEach } from "vitest";


customElements.define("video-creator", VideoCreator);


/** @type {VideoCreator} */
let videoCreator;

beforeEach(() => {
  videoCreator = /** @type {VideoCreator} */
    (document.createElement("video-creator"));
  document.body.appendChild(videoCreator);
});
afterEach(() => {
  document.body.innerHTML = "";
});


it("exists", () => {
  expect(document.querySelector("video-creator")).toBe(videoCreator);
});
it("starts out waiting", () => {
  expect(videoCreator.state).toBe("waiting");
});

it("can be rendered", async () => {
  const rendered = videoCreator.render(new Worker(
    // @ts-ignore
    new URL("videos/basic.js", import.meta.url),
    { type: "module" },
  ));


  expect(videoCreator.state).toBe("rendering");

  await rendered;
  expect(videoCreator.state).toBe("rendered");
});
