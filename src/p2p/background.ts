import {
  PeerMessageType,
  PeerNextVideoMessage,
} from "../common/sync-messages-types";
import {
  forwardNotifyNextVideo,
  forwardVideoActionsMsg,
  loadRoomDetails,
  loadRoomUrl,
  loadVCStates,
  saveRoomUrl,
  saveVCStates,
  sendPrepareVcMsg,
  sendUrlChangeMsg,
  sendVCMsg,
} from "./lib/chrome";

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;

  await chrome.offscreen.createDocument({
    url: "src/p2p/offscreen.html",
    reasons: ["WEB_RTC"],
    justification: "Keep Socket.IO connection alive for watch party",
  });
}

async function init() {
  await ensureOffscreen();

  let controlledTabId: number | null = null;
  let pendingTabId: number | null = null;
  let isInRoom = false;

  let _pendingUrlChange = false;
  let _pendingUrlValue: string | null = null;
  let _vcReady = false;
  let lastObservedUrl = location.href;

  const data = await loadVCStates();
  controlledTabId = data.controlledTabId;
  isInRoom = data.isInRoom;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "IN_ROOM") {
      isInRoom = true;

      saveState();
      return;
    }

    if (msg.type === "SAVE_ROOM_URL") {
      saveRoomUrl(msg.url);
    }

    if (msg.type === "REGISTER_TAB") {
      registerActiveTab();
      return;
    }

    if (msg.type === "VC_STATUS") {
      if (msg.success) {
        controlledTabId = pendingTabId;
        _vcReady = true;

        maybeSendNextVideo();
        saveState();
        return;
      } else {
        _vcReady = false;
        return;
      }
    }

    // TODO: clear storage instead
    if (msg.type === "LEFT_ROOM") {
      controlledTabId = null;
      isInRoom = false;

      saveState();
      return;
    }

    if (msg.type === "VIDEO_ACTIONS") {
      if (controlledTabId !== null) {
        // TODO: Drop message if current URL different from room URL
        forwardVideoActionsMsg(controlledTabId, msg);
      } else {
        console.log("[ERROR] No tab registered");
      }
      return;
    }

    if (isPeerNextVideoMessage(msg)) {
      if (controlledTabId !== null) {
        if (msg.fromHost) saveRoomUrl(msg.url);
        forwardNotifyNextVideo(controlledTabId, msg);
      } else {
        console.log("[ERROR] No tab registered");
      }
      return;
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === controlledTabId) {
      controlledTabId = null;
      saveState();
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId === controlledTabId) {
      if (changeInfo.url) onUrlChange(changeInfo.url);
      if (changeInfo.status === "complete") registerActiveTab();
    }
  });

  function saveState() {
    saveVCStates(controlledTabId, isInRoom);
  }

  /** Automatically registers current active tab
   * if it has a video element
   * with an option to re-register a new tab */
  function registerActiveTab() {
    if (!isInRoom) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        console.log("No active tab to register");
        return;
      }

      console.log("Validating current tab:", tabId);
      sendPrepareVcMsg(tabId);
      pendingTabId = tabId;
    });
  }

  function onUrlChange(newUrl: string) {
    console.log(`[BG] onUrlChange called with URL: ${newUrl}`);
    if (newUrl !== lastObservedUrl) {
      lastObservedUrl = newUrl;
      _pendingUrlChange = true;
      _pendingUrlValue = newUrl;
      maybeSendNextVideo();
      console.log("[BG] URL change detected");
    }
  }

  async function maybeSendNextVideo() {
    if (!_pendingUrlChange || !_vcReady || !_pendingUrlValue) return;

    const room = await loadRoomUrl();
    const roomUrl = room?.url ?? "";

    if (_pendingUrlValue === roomUrl) {
      _pendingUrlChange = false;
      _pendingUrlValue = null;
      return;
    }

    sendVCMsg({
      type: PeerMessageType.NextVideo,
      url: _pendingUrlValue,
    });

    _pendingUrlChange = false;
    _pendingUrlValue = null;
  }

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
}

init();
