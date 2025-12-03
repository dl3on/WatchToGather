import {
  forwardVideoActionsMsg,
  loadVCStates,
  saveVCStates,
  sendPrepareVcMsg,
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

  const data = await loadVCStates();
  controlledTabId = data.controlledTabId;
  isInRoom = data.isInRoom;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "IN_ROOM") {
      isInRoom = true;

      saveState();
      return;
    }

    if (msg.type === "REGISTER_TAB") {
      registerActiveTab();
      return;
    }

    if (msg.type === "VC_STATUS") {
      if (msg.success) {
        controlledTabId = pendingTabId;

        saveState();
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
      // Relay messages from offscreen to content script
      if (controlledTabId !== null) {
        forwardVideoActionsMsg(controlledTabId, msg);
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
}

init();
