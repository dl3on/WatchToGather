import {
  PeerMessageType,
  PeerNextVideoMessage,
} from "../common/sync-messages-types";
import {
  forwardNotifyNextVideo,
  forwardUpdatePeerReadinessMsg,
  forwardVideoActionsMsg,
  sendAckNackMsg,
  sendJoinSuccessMsg,
  sendLocalUrlChangeMsg,
  sendPrepareVcMsg,
  sendVCMsg,
  showVideoStatusNotification,
} from "./lib/chrome";
import {
  loadRoomUrl,
  loadVCStates,
  saveRoomUrl,
  saveVCStates,
} from "../common/chrome-storage";

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

  let sendTimeout: NodeJS.Timeout | null = null;

  let cachedRoomDetails: {
    roomName: string;
    participantsCount: number;
  } | null = null;

  let controlledTabId: number | null = null;
  let controlledFrameId: number | undefined = undefined;
  let pendingTabId: number | null = null;
  let isInRoom = false;

  let _pendingUrlChange = false;
  let _pendingUrlValue: string | null = null;
  let lastObservedUrl = location.href;

  let _vcReady = false;
  let hasReceivedVCSuccess = false;
  let pendingVCReplies = 0;

  const data = await loadVCStates();
  controlledTabId = data.controlledTabId;
  isInRoom = data.isInRoom;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Cross-origin iframes
    if (msg.type === "INJECT_INTO_IFRAME") {
      console.log("[BG] INJECTION REQUESTED");
      pendingVCReplies++;

      const tabId = controlledTabId ?? sender.tab?.id;

      if (!tabId) {
        sendResponse({ success: false, reason: "No tab ID" });
        return true;
      }

      chrome.webNavigation.getAllFrames({ tabId }, (frames) => {
        const targetFrame = frames?.find(
          (f) =>
            f.url === msg.iframeSrc ||
            (f.parentFrameId === sender.frameId &&
              f.url.includes(msg.iframeSrc))
        );

        if (!targetFrame) {
          sendResponse({ success: false, reason: "Frame not found" });
          return;
        }

        chrome.scripting
          .executeScript({
            target: {
              tabId,
              frameIds: [targetFrame.frameId],
            },
            files: ["content/main.js"],
          })
          .then(() => {
            console.log(`[BG] INJECTED TO FRAME ${targetFrame.frameId}`);
            sendPrepareVcMsg(tabId, targetFrame.frameId);
            sendResponse({ success: true, frameId: targetFrame.frameId });
          })
          .catch((err) => {
            sendResponse({
              success: false,
              reason: "Script injection failed",
              error: err.message,
            });
          });
      });

      return true;
    }

    if (msg.type === "IN_ROOM") {
      isInRoom = true;

      saveState();
      return;
    }

    if (msg.type === "ROOM_DETAILS") {
      cachedRoomDetails = {
        roomName: msg.roomName,
        participantsCount: msg.participantsCount,
      };
      return;
    }

    if (msg.type === "SAVE_ROOM_URL") {
      saveRoomUrl(msg.url);
      return;
    }

    if (msg.type === "SEND_JOIN_SUCCESS") {
      sendJoinSuccess();
      return;
    }

    if (msg.type === "REGISTER_TAB") {
      registerActiveTab();
      return;
    }

    if (msg.type === "VC_STATUS") {
      const currPendingUrl = _pendingUrlValue;
      const currPendingChange = _pendingUrlChange;
      const frameId = sender.frameId;
      pendingVCReplies--;

      if (msg.success) {
        const senderTabId = sender.tab?.id;
        if (!senderTabId) {
          console.error(
            `[BG] Ignoring VC_STATUS message from unidentified sender`
          );
          return;
        }

        if (senderTabId === pendingTabId || senderTabId === controlledTabId) {
          console.log(`[BG] VC SUCCESS from iframe ${sender.frameId}`);
          _vcReady = true;
          hasReceivedVCSuccess = true;

          if (pendingTabId && controlledTabId !== pendingTabId) {
            controlledTabId = pendingTabId;
            pendingTabId = null;
          }

          if (frameId) controlledFrameId = frameId; // TODO: multiple frames may have video

          // Only send message after video controller is ready
          if (currPendingUrl) {
            sendAckNackMsg(currPendingUrl);
            console.log(`[BG] sent AckNackMsg w url: ${currPendingUrl}`);
            if (currPendingChange) maybeSendNextVideo(currPendingUrl);
            else _pendingUrlValue = null;
          }

          saveState();
          showVideoStatusNotification(true);
        }

        return;
      } else {
        // Only send message after video controller is ready
        if (currPendingUrl && !hasReceivedVCSuccess) {
          console.log(`[BG] VC FAIL from iframe ${sender.frameId}`);
          sendAckNackMsg(currPendingUrl);
        }

        // Notify registration failure
        if (!controlledTabId && pendingVCReplies <= 0)
          showVideoStatusNotification(false);

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

    /* Background -> Content Script */

    if (msg.type === "VIDEO_ACTIONS") {
      if (controlledTabId !== null) {
        forwardVideoActionsMsg(controlledTabId, msg, controlledFrameId);
      } else {
        console.log("[ERROR] No tab registered");
      }
      return;
    }

    if (isPeerNextVideoMessage(msg)) {
      if (controlledTabId !== null) {
        forwardNotifyNextVideo(controlledTabId, msg, 0); // Main frame only
      } else {
        console.log("[ERROR] No tab registered");
      }
      return;
    }

    if (msg.type === "READINESS_UPDATE") {
      if (controlledTabId !== null) {
        console.log("[BG] Received readiness update");
        forwardUpdatePeerReadinessMsg(controlledTabId, msg, 0); // Main frame only
      } else {
        console.log("[ERROR] No tab registered");
      }
      return;
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === controlledTabId) {
      controlledTabId = null;

      if (sendTimeout) {
        clearTimeout(sendTimeout);
        sendTimeout = null;
      }

      saveState();
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId === controlledTabId) {
      if (changeInfo.url) onUrlChange(changeInfo.url);
      if (changeInfo.status === "complete") {
        console.log(`[BG] CALLED PREPARE VC FROM STATUS COMPLETE`);
        sendPrepareVcMsg(controlledTabId, controlledFrameId);
      }
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
      const tabUrl = tabs[0]?.url;
      if (!tabId) {
        console.log("No active tab to register");
        return;
      }
      if (!tabUrl) {
        console.log("No URL found");
        return;
      }

      console.log("Validating current tab:", tabId);
      pendingTabId = tabId;
      _pendingUrlValue = tabUrl;
      sendPrepareVcMsg(tabId);
      sendLocalUrlChangeMsg(tabUrl);
    });
  }

  function onUrlChange(newUrl: string) {
    if (newUrl !== lastObservedUrl) {
      sendLocalUrlChangeMsg(newUrl);
      lastObservedUrl = newUrl;
      const currentProcessingUrl = newUrl;

      if (sendTimeout) {
        clearTimeout(sendTimeout);
        sendTimeout = null;
      }

      // Debounce: Filter out quick navigations
      sendTimeout = setTimeout(() => {
        console.log(
          `[BG] URLCHANGE sendTImeout ${_pendingUrlValue} !== ${currentProcessingUrl}
            }`
        );
        if (
          (_pendingUrlValue && _pendingUrlValue !== currentProcessingUrl) ||
          !controlledTabId
        ) {
          console.log(
            `[BG] DROPPED URLCHANGE sendTImeout ${_pendingUrlValue} !== ${currentProcessingUrl}
            }`
          );
          return;
        }

        // Always check if new url has video element first
        _pendingUrlChange = true;
        _pendingUrlValue = newUrl;
        console.log(
          `[BG] CHANGED _pendingUrlValue: ${_pendingUrlValue} -> ${newUrl}`
        );
        controlledFrameId = undefined;
        _vcReady = false;
        hasReceivedVCSuccess = false;

        console.log(`[BG] CALLED PREPARE VC FROM ONURLCHANGE`);
        sendPrepareVcMsg(controlledTabId);
      }, 500);
    }
  }

  async function maybeSendNextVideo(pendingUrl: string) {
    const shouldSend = _pendingUrlChange && _vcReady && pendingUrl;
    console.log(
      `[BG] shouldsend values: ${_pendingUrlChange} ${_vcReady} ${pendingUrl}`
    );
    if (!shouldSend) return;

    const room = await loadRoomUrl();
    const roomUrl = room?.url ?? "";

    // Double check in case the current url is invalid, or has a new value, or same as room url
    if (_pendingUrlValue === roomUrl) {
      console.log(
        `[BG] Dropped sendnextvideo ${_pendingUrlValue} === ${roomUrl}`
      );
      _pendingUrlChange = false;
      _pendingUrlValue = null;
      return;
    }

    if (!_vcReady || _pendingUrlValue !== pendingUrl) return;

    sendVCMsg({
      type: PeerMessageType.NextVideo,
      url: pendingUrl,
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

  function sendJoinSuccess() {
    if (cachedRoomDetails) {
      sendJoinSuccessMsg(
        cachedRoomDetails.roomName,
        cachedRoomDetails.participantsCount
      );
    } else {
      throw new Error("[Background] No room details found");
    }
  }
}

init();
