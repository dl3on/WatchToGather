import { RoomDetails } from "../../common/types";

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

export function sendHostMsg(roomName: string) {
  sendChromeMsg({ type: "HOST", roomName });
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

export function loadRoomDetails(): Promise<RoomDetails | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get("roomDetails", (res) => {
      resolve(res.roomDetails ?? null);
    });
  });
}

export function loadRegisteredTabId(): Promise<number | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get("controlledTabId", (res) => {
      resolve(res.controlledTabId ?? null);
    });
  });
}

export function saveRoomDetails(roomDetails: RoomDetails) {
  chrome.storage.local.set({ roomDetails });
}

export function clearRoomDetails() {
  chrome.storage.local.remove("roomDetails");
}

export function registerCurrentTab() {
  sendChromeMsg({ type: "REGISTER_TAB" });
}

export function registerTabListener() {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "VC_STATUS") {
      if (msg.success === false) alert("Failed to register this tab.");
      else alert("Register success!");
    }
  });
}
