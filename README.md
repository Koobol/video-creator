# Video Creator
An npm package for creating videos using Javascript.


## Goals
This package is designed as more of an experiment than anything else.

Using it you will be able to write Javascript code to manipulate an `OffScreenCanvas` to generate frames of video similar to how a video game does. You can then preview the video, and if you're satisfied you can hit a button to generate a video file to download.

It will also ideally be able to function on all major browsers.


## Instructions For Use
To use, define the `VideoCreator` custom element in the package's default export, then add the element to your page. Create a Javascript file, and give the element the file's name in its `src` attribute. You may also define `width`, `height`, and `framerate` attributes. Inside your Javascript file export `setup` and `draw` functions, conforming to the package's exported `Setup`/`AsyncSetup` and `Draw`/`AsyncDraw` types; these functions will be imported by the package with `setup` being called once, and `draw` being called for every frame of video. Draw onto the `OffscreenCanvas` passed to the `setup` function in order to draw frames, and use the `MediaAPI` in order to use retrieve images, play audio, and play video files. Once the video is done, return a value of 0 from the `draw` function. You may then preview the video using the `VideoCreator` element, and if it looks good you may hit the download button to generate a video.

Unfortunantely, at this time the download button may or may not work for Chrome, because of the nature of how the video is recorded in order to get it to match the requested framerate.

For use with a bundler, you will need to specify your src file as an entry point, and webpack will need `output.libraryTarget: "module"` so that your file's exports won't be taken out. Other bundlers may need other configuration settings in order to preserve the export calls.
