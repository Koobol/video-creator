import VideoCreator from "../../src/index";


customElements.define("video-creator", VideoCreator);


const videoCreator = /** @type {VideoCreator} */
  (document.querySelector("video-creator"));
videoCreator.render(new Worker(
  new URL("example.js", import.meta.url),
  { type: "module" },
));
