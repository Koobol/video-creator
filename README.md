# Video Creator
An npm package for creating videos using Javascript.

Using this package you will be able to create a video similar to how a video game functions, preview the video in the browser, and generate a video file.


## Instructions For Use
First, create a new Javascript file. This file will be used to define how the video is rendered. Next, import the default export from `video-creator/render`, which is a class. Extend this class with `setup()` and `draw()` methods. To create visuals draw onto the `OffscreenCanvas` provided by the `canvas` property, using `getImage()` and `getVideo()` to load image and video files. To control audio, use `playSound()` and `stopSound()`. From the draw function, return `true` to finish rendering the video. Finally, call the static method `render()` on your extended class, which will render the video.

To actually view your video, import `video-creator` and define its default export as a custom element. Then put the custom elment on the page, and either give it an `src` attribute with the URL of your file (in which case when using a bundler you will have to specify the file as an entry point), or call the `render()` method on the custom element with a dedicated worker of your file. You may also give your custom element `width`, `height`, and `framerate` attributes. On the browser your video will then be rendered, and when it is complete you will be able to preview it on the custom element, and when you are satisfied with it you can hit the download button to generate a video file.

See [the wiki](https://github.com/Koobol/video-creator/wiki) for a full reference of the API.

### Example
example.js
```
import VideoSrc from "video-creator/render";

(class extends VideoSrc {
  ctx = this.canvas.getContext("2d");
  
  rectX = 0;


  setup() {
    this.ctx.fillStyle = "blue";
  }

  draw() {
    // 100 pixels per second
    this.rectX += 100 / this.frameRate;

    if (this.rectX + 100 > this.canvas.width) {
      return true;
    }


    this.ctx.fillRect(this.rectX, (this.canvas.height - 100) / 2, 100, 100);

    return false;
  }
}).render();
```

index.js
```
import VideoCreator from "video-creator";

customElements.define("video-creator", VideoCreator);


document.querySelector("video-creator").render(new Worker(
  new URL("example.js", import.meta.url),
  { type: "module" },
));
```

index.html
```
<video-creator
  width="300"
  height="200"
  framerate="30"
  controls
></video-creator>
```


### Notes
* If you set the frame rate too high, some browsers may not be able to render the video properly. When this happens, you will get a warning in the console tell and fire the `slowframerate` event to tell you as such. In my testing, 60 fps is just a little too high for Firefox, but is fine on Chrome and Edge, so if you want it to be consistent across all browsers 30 fps will be better.
* It can be good for performance to set `alpha: false` on your `ctx`, since all pixels lose their alpha channel in the end anyway.
* At the moment the `getVideo()` method is very slow, so I would recommend not trying to use clips that are very long yet, or waiting until you're done to add them in, and just putting placeholders in during devolpment.


## Advanced
Technically, there's nothing forcing you to use the `VideoSrc` class, it's just there to make it easier to create your video. If you wanted, you could create your own API that conforms to what the `VideoCreator` is expecting from the worker thread. In fact, if you wanted you could also just use the `VideoSrc` class without the `VideoCreator` and create your own API to process the data from the worker thread. However, the built in APIs should be good enough for most users, and I will be working to improve them over time as well.
