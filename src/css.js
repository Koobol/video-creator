export default `
*, ::before, ::after {
  box-sizing: border-box;
}


:host {
  display: grid;
  grid-template:
    "video    video" 1fr
    "play     search" auto
    "download download" / auto 1fr;

  gap: 5px;


  inline-size: fit-content;
}


canvas {
  grid-area: video;


  object-fit: scale-down;
  inline-size: 100%;
  block-size: 100%;


  background-color: black;
}
#play {
  grid-area: play;


  &::before {
    content: "";


    border: solid;
    border-block-width: 7px;
    border-inline-width: 12px 0;
    border-color: transparent;
    border-inline-start-color: currentcolor;

    block-size: 14px;
    inline-size: 12px;

    display: inline-block;


    transition: border 0.1s;
  }
  &[aria-checked="true"]::before {
    border-block-width: 0;
    border-inline-width: 4px;
    border-inline-end-color: currentcolor;
  }
}
input { grid-area: search; }
div {
  grid-area: download;
}
`;