import { injectIntoIframe, sendVCStatusMsg } from "./chrome";
import { VideoController } from "./video-controller";

let vc: VideoController | null = null;
let currentVideo: HTMLVideoElement | null = null;
let videoFindTimeout: NodeJS.Timeout | null = null;

export function getVC() {
  return vc;
}

export function startVideoController() {
  videoFindTimeout = setTimeout(() => {
    // Notify popup of failure
    sendVCStatusMsg(false);
  }, 5000);

  waitForVideo((video) => {
    if (videoFindTimeout) {
      clearTimeout(videoFindTimeout);
      videoFindTimeout = null;
    }
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

  const checkIframes = () => {
    const iframes = document.querySelectorAll("iframe");
    for (const iframe of iframes) {
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          const iframeVideo = iframeDoc.querySelector("video");
          if (iframeVideo) {
            onFound(iframeVideo);
            return true;
          }
        }
      } catch (e) {
        // Cross-origin iframe
        console.log("Cross-origin iframe: injecting content script...");
        requestIframeInjection(iframe);
      }
    }
    return false;
  };

  if (checkIframes()) return;

  const observer = new MutationObserver(() => {
    const video = document.querySelector("video") as HTMLVideoElement | null;
    if (video) {
      observer.disconnect();
      onFound(video);
      return;
    }

    checkIframes();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

async function requestIframeInjection(iframe: HTMLIFrameElement) {
  const currentSrc = iframe.src;

  if (iframe.dataset.injectedSrc === currentSrc) return;
  iframe.dataset.injectedSrc = currentSrc;

  const success = await injectIntoIframe(iframe);
  if (success) {
    if (videoFindTimeout) {
      clearTimeout(videoFindTimeout);
      videoFindTimeout = null;
    }
  }
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
  sendVCStatusMsg(true);
}
