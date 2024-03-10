import VideoCreator from "video-creator";


customElements.define("video-creator", VideoCreator);


const videoCreator = /** @type {VideoCreator} */
  (document.querySelector("video-creator"));
videoCreator.render(new Worker(
  new URL("test.js", import.meta.url),
  { type: "module" },
));
