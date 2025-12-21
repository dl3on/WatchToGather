import { getVC, onUrlChange, startVideoController } from "./lib/vc-handler";

console.log("CONTENT SCRIPT LOADED");

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "PREPARE_VC") {
    startVideoController();
  }

  if (msg.type === "VIDEO_ACTIONS") {
    console.log("[CONTENT SCRIPT]", msg);
    const vc = getVC();
    if (vc) vc.onRemoteEvent(msg.payload);
    // TODO: handle NextVideo event
    // TODO: host tracks peer ready state by receiving matching NextVideo msgs
  }

  if (msg.type === "URL_CHANGED") {
    onUrlChange(msg.url);
  }
});
