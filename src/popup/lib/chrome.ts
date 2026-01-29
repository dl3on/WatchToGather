import { getPeerId } from "../../common/chrome-storage";
import { sendChromeMsg } from "../../common/chrome-utils";

export async function sendJoinMsg(roomId: string, username: string) {
  const peerId = await getPeerId();
  sendChromeMsg({ type: "JOIN", peerId, username, roomId });
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

export async function sendHostMsg(
  username: string,
  roomName: string,
  currentUrl: string,
) {
  const peerId = await getPeerId();
  sendChromeMsg({ type: "HOST", peerId, username, roomName, currentUrl });
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

export function waitForRegisterComplete(): Promise<boolean> {
  return new Promise((resolve) => {
    function handler(msg: any) {
      if (msg.type === "REGISTER_DONE") {
        // Only listens to one VC_STATUS success
        chrome.runtime.onMessage.removeListener(handler);
        resolve(msg.isRoomValid);
      }
    }
    chrome.runtime.onMessage.addListener(handler);
  });
}
