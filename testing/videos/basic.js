import VideoSrc from "../../src/render";


class Basic extends VideoSrc {
  ctx = this.canvas.getContext("2d");
}


Basic.render([
  basic => {
    return () => basic.frame > 2;
  },
]);
