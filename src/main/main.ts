import { sendChromeMsg } from "./lib/chrome";
import { VideoController } from "./lib/video-controller";

const observer = new MutationObserver(() => {
  const video = document.querySelector("video");
  if (video) {
    console.log("Found VIDEO");
    observer.disconnect();
    const videoController = new VideoController(video);

    // TODO: notify peers ready state
    sendChromeMsg({ type: "content-ready" });

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === "VIDEO_ACTIONS") {
        videoController.onRemoteEvent(msg.payload);
      }
    });
  }
});
observer.observe(document.body, { childList: true, subtree: true });
