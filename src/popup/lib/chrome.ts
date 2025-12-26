function sendChromeMsg(msg: any) {
  chrome.identity.getProfileUserInfo().then((res) => {
    const toSend = { ...res, ...msg };
    chrome.runtime.sendMessage(toSend);
  });
}

export function sendJoinMsg(roomId: string) {
  sendChromeMsg({ type: "JOIN", roomId });
}

export function waitForJoinSuccess(): Promise<{
  roomName: string;
  participantsCount: number;
}> {
  return new Promise((resolve) => {
    function handler(msg: any) {
      if (msg.type === "JOIN_SUCCESS") {
        // Only listens to one JOIN_SUCCESS
        chrome.runtime.onMessage.removeListener(handler);
        resolve({
          roomName: msg.roomName,
          participantsCount: msg.participantsCount,
        });
      }
    }
    chrome.runtime.onMessage.addListener(handler);
  });
}

export function sendHostMsg(roomName: string, currentUrl: string) {
  sendChromeMsg({ type: "HOST", roomName, currentUrl });
}

export function waitForHostSuccess(): Promise<{ roomId: string }> {
  return new Promise((resolve) => {
    function handler(msg: any) {
      if (msg.type === "HOST_SUCCESS") {
        // Only listens to one HOST_SUCCESS
        chrome.runtime.onMessage.removeListener(handler);
        resolve({ roomId: msg.roomId });
      }
    }
    chrome.runtime.onMessage.addListener(handler);
  });
}

export function registerCurrentTab() {
  sendChromeMsg({ type: "REGISTER_TAB" });
}

export function registerTabListener() {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "VC_STATUS") {
      if (msg.success === false)
        alert(
          "[WatchToGather] Failed to register tab. Please ensure the tab has a video element and keep the tab active."
        );
      else alert("[WatchToGather] Register success!");
    }
  });
}
