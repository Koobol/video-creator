# Video Creator
An npm package for creating videos using Javascript.

Using this package you will be able to create a video similar to how a video game functions, preview the video in the browser, and generate a video file.


## Instructions For Use
First, create a new Javascript file. This file will be used to define how the video is rendered. Next, import the default export from `video-creator/render`, which is a class. Extend this class with `setup()` and `draw()` methods. To create visuals draw onto the `OffscreenCanvas` provided by the `canvas` property, using `getImage()` and `getVideo()` to load image and video files. To control audio, use `playSound()` and `stopSound()`. From the draw function, return `true` to finish rendering the video. Finally, call the static method `render()` on your extended class, which will render the video.

To actually view your video, import `video-creator` and define its default export as a custom element. Then put the custom elment on the page, and either give it an `src` attribute with the URL of your file (in which case when using a bundler you will have to specify the file as an entry point), or call the `render()` method on the custom element with a dedicated worker of your file. You may also give your custom element `width`, `height`, and `frameRate` attributes. On the browser your video will then be rendered, and when it is complete you will be able to preview it on the custom element, and when you are satisfied with it you can hit the download button to generate a video file.

### Example
example.js
```
import VideoSrc from "video-creator/render";

(class extends VideoSrc {
  setup() {
    this.ctx = this.canvas.getContext("2d");

    this.ctx.fillStyle = "blue";


    this.rectX = 0;
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
></video-creator>
```


### Notes
* Unfortunantely, currently the download button only works on Firefox.
* It can be good for performance to set `alpha: false` on your `ctx`, since all pixels lose their alpha channel in the end anyway.
* At the moment the `getVideo()` method is very slow, so I would recommend not trying to use clips that are very long yet, or waiting until you're done to add them in, and just putting placeholders in during devolpment.
* Right now the `VideoCreator` class (and to a lesser extent the `VideoSrc` class) aren't very robust and will likely break if you try to do something strange with them, such as changing the `VideoCreator`'s attributes while it's rendering your video. However, as long as you're not trying to do anything too fancy you should be fine.


## Advanced
Technically, there's nothing forcing you to use the `VideoSrc` class, it's just there to make it easier to create your video. If you wanted, you could create your own API that conforms to what the `VideoCreator` is expecting from the worker thread. In fact, if you wanted you could also just use the `VideoSrc` class without the `VideoCreator` and create your own API to process the data from the worker thread. However, the built in APIs should be good enough for most users, and I will be working to improve them over time as well.
