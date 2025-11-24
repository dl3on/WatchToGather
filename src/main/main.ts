import { VideoController } from "./lib/video-controller";

const video = document.querySelector("video");
if (!video) {
  console.error("No video element found");
} else {
  const videoController = new VideoController(video);

  chrome.runtime.sendMessage({ type: "content-ready" });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "video-actions") {
      videoController.onRemoteEvent(msg.payload);
    }
  });
}
