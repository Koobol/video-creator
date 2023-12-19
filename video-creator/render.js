// @ts-check
self.addEventListener("message", async event => {
  const canvas = new OffscreenCanvas(event.data.width, event.data.height);


  const {} = await import(event.data.src);
});
