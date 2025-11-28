async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;

  await chrome.offscreen.createDocument({
    url: "src/p2p/offscreen.html",
    reasons: ["WEB_RTC"],
    justification: "Keep Socket.IO connection alive for watch party",
  });
}

ensureOffscreen();

let watchers = new Set<number>();
let isInRoom = false;
let vcReady = false;

chrome.storage.session.get(["watchers", "isInRoom", "vcReady"], (data) => {
  if (Array.isArray(data.watchers)) {
    watchers = new Set(data.watchers);
  }
  isInRoom = !!data.isInRoom;
  vcReady = !!data.vcReady;

  console.log("Restored state:", {
    watchers: [...watchers],
    isInRoom,
    vcReady,
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "IN_ROOM") {
    isInRoom = true;
    console.log("INROOM");
    registerActiveTab();
    return;
  }

  if (msg.type === "VC_READY") {
    vcReady = true;
    console.log("VCREADY");
    registerActiveTab();
    return;
  }

  // TODO:
  if (msg.type === "LEFT_ROOM") {
    watchers.clear();
    isInRoom = false;
    vcReady = false;

    saveState();
    return;
  }

  if (msg.type === "VIDEO_ACTIONS") {
    console.log("VIDEOACTIONS");
    // Relay messages from offscreen to content script
    for (const tabId of watchers) {
      console.log("tabId: ", tabId);
      chrome.tabs.sendMessage(tabId, msg);
    }
    return;
  }
});

function saveState() {
  chrome.storage.session.set({
    watchers: [...watchers],
    isInRoom,
    vcReady,
  });
}

function registerActiveTab() {
  if (!(isInRoom && vcReady)) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (!tabId) {
      console.log("No active tab to register");
      return;
    }

    console.log("Registering tab:", tabId);
    watchers.add(tabId);

    // Prevent registering irrelevant tabs
    vcReady = false;

    saveState();
  });
}
