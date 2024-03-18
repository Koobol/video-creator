import { getEvent } from "./funcs.js";


/**
 * @param {Worker} worker
 */
export default function handleVideoRequests(worker) {
  /** @param {MessageEvent<import("./render").FromRender>} event */
  const getVideoFile = async ({ data }) => {
    if (data.type !== "video request") return;


    const { src, frameRate, start = 0 } = data;


    const video = document.createElement("video");
    video.src = src;


    await getEvent(video, "loadedmetadata");


    if (start) video.currentTime = start;

    const { end = video.duration } = data;


    await getEvent(video, "canplaythrough");


    /** @type {ImageBitmap[]} */
    const frames = [];

    while (true) {
      if (video.readyState < 2) await getEvent(video, "canplaythrough");

      frames.push(await createImageBitmap(video));


      if (video.currentTime >= end) break;

      video.currentTime = 1 / frameRate * frames.length + start;
    }


    worker?.postMessage(
      /** @satisfies {import("./render").VideoResponse} */ ({
        type: "video response",
        src,
        frameRate,
        frames,
        start: data.start,
        end: data.end,
      }),
      frames,
    );
  }
  worker.addEventListener("message", getVideoFile);
}
