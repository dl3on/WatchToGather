import {
  PeerMessageType,
  PeerNextVideoMessage,
} from "../common/sync-messages-types";
import {
  forwardNotifyNextVideo,
  forwardSendVideoState,
  forwardUpdatePeerReadinessMsg,
  forwardVideoActionsMsg,
  notifyPopupDisband,
  sendAckNackMsg,
  sendJoinSuccessMsg,
  notifyPopupLeftRoom,
  sendLocalUrlChangeMsg,
  sendPrepareVcMsg,
  sendRoomDisbandMsg,
  sendVCMsg,
  showVideoStatusNotification,
  notifyCSLeftRoom,
} from "./lib/chrome";
import {
  clearRoomSessionStorage,
  getControlledTabId,
  getIsInRoom,
  loadNavStates,
  loadRoomUrl,
  saveControlledTabId,
  saveIsInRoom,
  saveNavStates,
  saveRoomUrl,
} from "../common/chrome-storage";
import {
  initiateLeaveRoom,
  validateControlledTabId,
} from "../common/chrome-utils";
import { LeaveType } from "../common/types";

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

  let isInRoom = false;
  let cachedRoomDetails: {
    roomName: string;
    participantsCount: number;
  } | null = null;

  let controlledTabId: number | null = null;
  let controlledFrameId: number | undefined = undefined;
  let pendingTabId: number | null = null;

  let navId = 0; // Identifier for navigation sessions to prevent processing stale VC_STATUS
  let _pendingUrlChange = false;
  let _pendingUrlValue: string | null = null;
  let lastObservedUrl = location.href;

  let _vcReady = false;
  let pendingVCReplies = 0;

  controlledTabId = await getControlledTabId().then(async (pendingTabId) => {
    const validTabId = await validateControlledTabId(pendingTabId ?? null);
    if (!validTabId) saveControlledTabId(null);
    return validTabId;
  });
  isInRoom = await getIsInRoom();

  const navStates = await loadNavStates();
  if (navStates) {
    navId = navStates?.navId;
    _pendingUrlValue = navStates.urlValue;
    _pendingUrlChange = navStates.urlChange;
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // ===================================================================
    // ROOM / LIFECYCLE COORDINATION
    // ===================================================================

    if (msg.type === "SEND_JOIN_SUCCESS") {
      sendJoinSuccess();
      return;
    }

    if (msg.type === "REGISTER_TAB") {
      registerActiveTab();
      return;
    }

    if (msg.type === "REQUEST_LEAVE") {
      (async () => {
        try {
          if (msg.reason === LeaveType.Disband) sendRoomDisbandMsg(); // Notify popup for UI updates

          const success = await initiateLeaveRoom();

          if (success) {
            const tabId = controlledTabId;
            const frameId = controlledFrameId;

            resetAll();

            if (msg.reason === LeaveType.Disband) {
              notifyPopupDisband();
            } else {
              notifyPopupLeftRoom();
            }

            if (tabId) {
              notifyCSLeftRoom(tabId, frameId);
            }
          }
        } catch (error) {
          console.error("[BG] Error during leave room:", error);
        }
      })();
      return true;
    }

    // ===================================================================
    // STORAGE MUTATION HELPERS
    // ===================================================================

    if (msg.type === "IN_ROOM") {
      markInRoom();
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

    if (msg.type === "SAVE_PARTICIPANTS_COUNT") {
      saveParticipantsCount(msg.count);
    }

    // ===================================================================
    // FRAME INJECTION AND VIDEO CONTROLLER STATUS HANDLERS
    // ===================================================================

    // Cross-origin iframes
    if (msg.type === "INJECT_INTO_IFRAME") {
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
              f.url.includes(msg.iframeSrc)),
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
            console.log(`[BG] Injected to frame ${targetFrame.frameId}`);
            sendPrepareVcMsg(tabId, navId, targetFrame.frameId);
            sendResponse({ success: true, frameId: targetFrame.frameId });
          })
          .catch((error) => {
            sendResponse({
              success: false,
              reason: "Script injection failed",
              error: error.message,
            });
          });
      });

      return true;
    }

    if (msg.type === "VC_STATUS") {
      if (msg.navId !== navId) {
        console.log(`[BG] Dropped outdated navId: ${msg.navId} !== ${navId}`);
        return;
      }

      const currPendingUrl = _pendingUrlValue;
      const currPendingChange = _pendingUrlChange;
      const frameId = sender.frameId;
      pendingVCReplies = Math.max(0, pendingVCReplies - 1);

      if (msg.success) {
        const senderTabId = sender.tab?.id;
        if (!senderTabId) {
          console.warn(
            `[BG] Ignoring VC_STATUS message from unidentified sender`,
          );
          return;
        }

        if (
          !_vcReady &&
          (senderTabId === pendingTabId || senderTabId === controlledTabId)
        ) {
          _vcReady = true;
          console.log(`[VC READY] frame ID: ${sender.frameId}`);

          if (pendingTabId && controlledTabId !== pendingTabId) {
            controlledTabId = pendingTabId;
            pendingTabId = null;
            saveControlledTabId(controlledTabId);
          }

          if (frameId) controlledFrameId = frameId; // TODO: multiple frames may have video

          // Only send message after video controller is ready
          // Drops any outdated VC_STATUS associated to previous outdated URLs
          if (currPendingUrl) {
            sendAckNackMsg(currPendingUrl);
            if (currPendingChange) maybeSendNextVideo(currPendingUrl);
            else {
              _pendingUrlValue = null;
              saveNavState();
            }
          }

          showVideoStatusNotification(true);
        }

        return;
      } else {
        if (pendingVCReplies <= 0 && !_vcReady) {
          // Only send message after video controller is ready
          if (currPendingUrl) {
            sendAckNackMsg(currPendingUrl);
          }

          // Notify registration failure
          if (!controlledTabId) showVideoStatusNotification(false);
        }

        return;
      }
    }

    // ===================================================================
    // BACKGROUND -> CONTENT SCRIPT FORWARDING
    // ===================================================================

    if (msg.type === "SEND_VIDEO_STATE") {
      if (controlledTabId !== null) {
        forwardSendVideoState(controlledTabId, msg, controlledFrameId);
      } else {
        console.log("[ERROR] No tab registered");
      }
      return;
    }

    if (msg.type === "VIDEO_ACTIONS") {
      if (controlledTabId !== null) {
        forwardVideoActionsMsg(controlledTabId, msg, controlledFrameId);
      } else {
        console.log("[ERROR] No tab registered");
      }
      return;
    }

    if (isPeerNextVideoMessage(msg)) {
      if (msg.url === _pendingUrlValue) {
        _pendingUrlChange = false;
        _pendingUrlValue = null;
        saveNavState();
      }

      if (controlledTabId !== null) {
        forwardNotifyNextVideo(controlledTabId, msg, 0); // Main frame only
      } else {
        console.log("[ERROR] No tab registered");
      }
      return;
    }

    if (msg.type === "READINESS_UPDATE") {
      if (controlledTabId !== null) {
        forwardUpdatePeerReadinessMsg(controlledTabId, msg, 0); // Main frame only
      } else {
        console.log("[ERROR] No tab registered");
      }
      return;
    }

    if (msg.type === "GET_MY_TAB_ID") {
      sendResponse({ tabId: sender.tab?.id });
      return true;
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === controlledTabId) {
      controlledTabId = null;

      if (sendTimeout) {
        clearTimeout(sendTimeout);
        sendTimeout = null;
      }

      saveControlledTabId(controlledTabId);
      resetVCStates();
      sendAckNackMsg(""); // Sends Nack
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId !== controlledTabId) return;

    if (changeInfo.status === "loading") resetVCStates();
    if (changeInfo.url) onUrlChange(changeInfo.url);
    if (changeInfo.status === "complete")
      sendPrepareVcMsg(controlledTabId, navId);
  });

  // ===================================================================
  // TAB REGISTRATION AND URL TRACKING
  // ===================================================================

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
      _pendingUrlChange = false;
      resetVCStates();
      navId++;
      saveNavState();
      sendPrepareVcMsg(tabId, navId);
      sendLocalUrlChangeMsg(tabUrl);
    });
  }

  function onUrlChange(newUrl: string) {
    if (newUrl !== lastObservedUrl) {
      sendLocalUrlChangeMsg(newUrl);
      lastObservedUrl = newUrl;

      if (sendTimeout) {
        clearTimeout(sendTimeout);
        sendTimeout = null;
      }

      // Debounce: Filter out quick navigations
      sendTimeout = setTimeout(() => {
        if (controlledTabId !== null) {
          _pendingUrlChange = true;
          _pendingUrlValue = newUrl;
          navId++; // Takes precedence over the sendPrepareVcMsg() called in changeInfo "complete"
          resetVCStates();
          saveNavState();
          sendPrepareVcMsg(controlledTabId, navId);
        } else console.log("[ERROR] No tab registered");
      }, 500);
    }
  }

  // ===================================================================
  // VIDEO CONTROL HELPERS
  // ===================================================================

  async function maybeSendNextVideo(pendingUrl: string) {
    const shouldSend = _pendingUrlChange && _vcReady && pendingUrl;
    if (!shouldSend) return;

    const room = await loadRoomUrl();
    const roomUrl = room?.url ?? "";

    // Double check in case the current url is invalid/new value/same as room url
    if (_pendingUrlValue === roomUrl) {
      _pendingUrlChange = false;
      _pendingUrlValue = null;
      saveNavState();
      return;
    }

    if (!_vcReady || _pendingUrlValue !== pendingUrl) return;

    sendVCMsg({
      type: PeerMessageType.NextVideo,
      url: pendingUrl,
    });
  }

  // ===================================================================
  // STATE MANAGEMENT HELPERS
  // ===================================================================

  function resetVCStates() {
    controlledFrameId = undefined;
    _vcReady = false;
    pendingVCReplies = 0;
  }

  function saveNavState() {
    saveNavStates({
      navId,
      urlValue: _pendingUrlValue,
      urlChange: _pendingUrlChange,
    });
  }

  /** Reset all states and clears local chrome storage */
  function resetAll() {
    isInRoom = false;
    cachedRoomDetails = null;
    controlledTabId = null;
    pendingTabId = null;
    navId = 0;
    _pendingUrlChange = false;
    _pendingUrlValue = null;
    resetVCStates();

    clearRoomSessionStorage();
  }

  // ===================================================================
  // ROOM / SESSION HELPERS
  // ===================================================================

  function markInRoom() {
    isInRoom = true;
    saveIsInRoom(isInRoom);
  }

  function sendJoinSuccess() {
    if (cachedRoomDetails) {
      sendJoinSuccessMsg(
        cachedRoomDetails.roomName,
        cachedRoomDetails.participantsCount,
      );
      markInRoom();
    } else {
      throw new Error("[Background] No room details found");
    }
  }

  // ===================================================================
  // TYPE GUARDS
  // ===================================================================

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
          msg,
        );
        return false;
      }
      return true;
    }
    return false;
  }
}

init();
