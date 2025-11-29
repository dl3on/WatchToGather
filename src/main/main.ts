// import { sendReadyMsg } from "./lib/chrome";
import { getVC, startVideoController } from "./lib/vc-handler";

console.log("CONTENT SCRIPT LOADED");

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "PREPARE_VC") {
    startVideoController();
  }

  if (msg.type === "VIDEO_ACTIONS") {
    const vc = getVC();
    if (vc) vc.onRemoteEvent(msg.payload);
  }
});
