import {
  PeerMessageType,
  PeerNextVideoMessage,
} from "../common/sync-messages-types";
import { getVC, startVideoController } from "./lib/vc-handler";
import { showNextVideoNotif } from "./ui/notifications/next-video";

console.log("CONTENT SCRIPT LOADED");

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "PREPARE_VC") {
    startVideoController();
  }

  if (msg.type === "VIDEO_ACTIONS") {
    console.log("[CONTENT SCRIPT]", msg);
    const vc = getVC();
    if (vc) vc.onRemoteEvent(msg.payload);
  }

  if (isPeerNextVideoMessage(msg)) {
    console.log("[CS: Next Video]", msg);
    showNextVideoNotif(msg);
    // TODO: host tracks peer ready state
  }
});

function isPeerNextVideoMessage(msg: any): msg is PeerNextVideoMessage {
  if (
    msg.type === PeerMessageType.NextVideo &&
    typeof msg.mid === "string" &&
    typeof msg.fromPeerId === "string" &&
    typeof msg.url === "string"
  ) {
    if (typeof msg.fromHost !== "boolean") {
      console.warn(
        "[WARN] isPeerNextVideoMessage: fromHost missing or invalid",
        msg
      );
      return false;
    }
    return true;
  }
  return false;
}
