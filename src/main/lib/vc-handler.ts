import { sendVCStatusMsg } from "./chrome";
import { VideoController } from "./video-controller";

let vc: VideoController | null = null;
let currentVideo: HTMLVideoElement | null = null;

export function getVC() {
  return vc;
}

export function startVideoController() {
  let timeout = setTimeout(() => {
    // Notify popup of failure
    sendVCStatusMsg(false);
  }, 3000);

  waitForVideo((video) => {
    clearTimeout(timeout);
    setupVideo(video);
  });

  observeVideoReplacements((newVideo) => {
    setupVideo(newVideo);
  });
}

function waitForVideo(onFound: (video: HTMLVideoElement) => void) {
  const existing = document.querySelector("video") as HTMLVideoElement | null;
  if (existing) {
    onFound(existing);
    return;
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

function observeVideoReplacements(onReplace: (v: HTMLVideoElement) => void) {
  const mo = new MutationObserver(() => {
    const video = document.querySelector("video") as HTMLVideoElement | null;
    if (video && video !== currentVideo) {
      console.log("[VIDEO] Video element replaced");
      onReplace(video);
    }
  });

  mo.observe(document.body, { childList: true, subtree: true });
}

function setupVideo(video: HTMLVideoElement) {
  currentVideo = video;
  vc = new VideoController(video);
  sendVCStatusMsg(true);
  // TODO: notify peers ready state
}
