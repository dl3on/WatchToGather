import {
  PeerMessageType,
  PeerNextVideoMessage,
} from "../common/sync-messages-types";
import { getVC, startVideoController } from "./lib/vc-handler";
import { showNextVideoNotif } from "./ui/notifications/next-video";
import { updateParticipantsList } from "./ui/participants/participants-list";

console.log("[WatchToGather] Ready to use");

const isMainFrame = window.self === window.top;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "PREPARE_VC") {
    startVideoController();
  }

  if (msg.type === "VIDEO_ACTIONS") {
    const vc = getVC();
    if (vc) vc.onRemoteEvent(msg.payload);
  }

  // TODO: only show UI in main frame, remove duplicates in iframes.
  if (isMainFrame) {
    if (isPeerNextVideoMessage(msg)) {
      showNextVideoNotif(msg);
    }

    if (msg.type === "READINESS_UPDATE") {
      updateParticipantsList(msg.readinessMap);
    }
  } else {
    console.log("[Iframe] Dropping UI-related messages");
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
