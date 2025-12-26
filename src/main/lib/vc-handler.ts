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

  observeVideoRemoval();
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

function observeVideoRemoval() {
  const mo = new MutationObserver(() => {
    const video = document.querySelector("video") as HTMLVideoElement | null;
    if (currentVideo && !document.body.contains(currentVideo) && !video) {
      console.log("[VIDEO] Video element removed");
      currentVideo = null;
      vc = null;
      // _vcReady = false;
      sendVCStatusMsg(false);
    }
  });

  mo.observe(document.body, { childList: true, subtree: true });
}

function setupVideo(video: HTMLVideoElement) {
  currentVideo = video;
  vc = new VideoController(video);
  // _vcReady = true;
  sendVCStatusMsg(true);
  // maybeSendNextVideo();

  // if (!_urlObserverInstalled) {
  //   console.log("[VIDEO] Installing URL change observer");
  //   const onUrlChange = () => {
  //     console.log("[VIDEO] onUrlChange called");
  //     const now = location.href;

  //     if (now !== lastObservedUrl) {
  //       lastObservedUrl = now;
  //       _pendingUrlChange = true;
  //       maybeSendNextVideo();
  //       console.log("[VIDEO] URL change detected");
  //     }
  //   };

  //   // Detect SPA URL changes
  //   const _pushState = history.pushState.bind(history);
  //   history.pushState = (...args) => {
  //     const res = _pushState(...args);
  //     onUrlChange();
  //     return res;
  //   };

  //   const _replaceState = history.replaceState.bind(history);
  //   history.replaceState = (...args) => {
  //     const res = _replaceState(...args);
  //     onUrlChange();
  //     return res;
  //   };

  //   window.addEventListener("popstate", onUrlChange);
  //   // window.addEventListener("hashchange", onUrlChange);

  //   _urlObserverInstalled = true;
  // }
}
