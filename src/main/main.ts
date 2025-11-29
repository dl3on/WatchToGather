// import { sendReadyMsg } from "./lib/chrome";
import { RemoteVideoEventMsg } from "../common/sync-messages-types";
import { sendVCReadyMsg } from "./lib/chrome";
import { VideoController } from "./lib/video-controller";

waitForVideo((video) => {
  console.log("FOUND VIDEO");

  let vc = new VideoController(video);

  // TODO: notify peers ready state

  sendVCReadyMsg({ type: "VC_READY" });

  observeVideo(video, (newVideo) => {
    console.log("[VC] Rebasing VideoController to new element");
    vc = new VideoController(newVideo);
  });

  chrome.runtime.onMessage.addListener((msg: RemoteVideoEventMsg) => {
    if (msg.type === "VIDEO_ACTIONS") {
      vc.onRemoteEvent(msg.payload);
    }
  });
});

function waitForVideo(onFound: (video: HTMLVideoElement) => void) {
  const existing = document.querySelector("video") as HTMLVideoElement | null;
  if (existing) {
    onFound(existing);
  }

  const observer = new MutationObserver(() => {
    const video = document.querySelector("video") as HTMLVideoElement | null;
    if (video) {
      observer.disconnect();
      onFound(video);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function observeVideo(
  video: HTMLVideoElement,
  onReplace: (newVideo: HTMLVideoElement) => void
) {
  let currentVideo = video;

  const mo = new MutationObserver(() => {
    const newVideo = document.querySelector("video") as HTMLVideoElement | null;
    if (newVideo && newVideo !== currentVideo) {
      console.log("[Video] Video element replaced");
      currentVideo = newVideo;
      onReplace(newVideo);
    }
  });

  mo.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => mo.disconnect();
}
