import {
  loadReadinessMap,
  loadVCStates,
  saveReadinessMap,
} from "../common/chrome-storage";
import {
  PeerMessageType,
  PeerNextVideoMessage,
} from "../common/sync-messages-types";
import { getVC, startVideoController } from "./lib/vc-handler";
import { showNextVideoNotif } from "./ui/notifications/next-video";
import {
  removeParticipantsList,
  updateParticipantsList,
} from "./ui/participants/participants-list";

console.log("[WatchToGather] Ready to use");

const isMainFrame = window.self === window.top;

if (isMainFrame) {
  loadVCStates().then(({ isInRoom }) => {
    if (isInRoom) {
      loadReadinessMap().then((cachedMap) => {
        if (cachedMap) updateParticipantsList(cachedMap);
      });
    } else {
      removeParticipantsList();
    }
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "PREPARE_VC") {
    startVideoController();
  }

  if (msg.type === "VIDEO_ACTIONS") {
    const vc = getVC();
    if (vc) vc.onRemoteEvent(msg.payload);
  }

  if (isMainFrame) {
    if (isPeerNextVideoMessage(msg)) {
      showNextVideoNotif(msg);
    }

    if (msg.type === "READINESS_UPDATE") {
      updateParticipantsList(msg.readinessMap);
      saveReadinessMap(msg.readinessMap);
    }

    if (msg.type === "LEFT_ROOM") {
      removeParticipantsList();
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
