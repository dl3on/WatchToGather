import {
  LocalVideoEvent,
  PeerNextVideoMessage,
  PeerTimeMessage,
  VCActions,
} from "../../common/sync-messages-types";
import { RoomDetails } from "../../common/types";

function sendChromeMsg(msg: any) {
  chrome.runtime.sendMessage(msg);
}

function sendTabMsg(tabId: number, msg: any) {
  chrome.tabs.sendMessage(tabId, msg);
}

export function sendJoinSuccessMsg(
  roomName: string,
  participantsCount: number,
  currentUrl: string
) {
  sendChromeMsg({
    type: "JOIN_SUCCESS",
    roomName: roomName,
    participantsCount: participantsCount,
    currentUrl: currentUrl,
  });
  // Notify background
  sendChromeMsg({
    type: "IN_ROOM",
  });
}

export function sendHostSuccessMsg(roomId: string, currentUrl: string) {
  sendChromeMsg({ type: "HOST_SUCCESS", roomId, currentUrl });
  sendChromeMsg({ type: "IN_ROOM" });
}

/** Forward PeerTimeMessage to Background */
export function forwardRemotePeerMsg(msg: PeerTimeMessage) {
  sendChromeMsg({
    type: "VIDEO_ACTIONS",
    payload: msg,
  });
}

/** Forward PeerNextVideoMessage to Background */
export function notifyNextVideo(msg: PeerNextVideoMessage) {
  sendChromeMsg(msg);
}

export function sendPrepareVcMsg(tabId: number) {
  sendTabMsg(tabId, { type: "PREPARE_VC" });
}

/** Forward PeerTimeMessage to Content Script */
export function forwardVideoActionsMsg(tabId: number, msg: VCActions) {
  sendTabMsg(tabId, msg);
}

/** Forward PeerNextVideoMessage to Content Script */
export function forwardNotifyNextVideo(
  tabId: number,
  msg: PeerNextVideoMessage
) {
  sendTabMsg(tabId, msg);
}

export function sendUrlChangeMsg(tabId: number, url: string) {
  sendTabMsg(tabId, { type: "URL_CHANGED", url });
}

export function loadVCStates(): Promise<{
  controlledTabId: number | null;
  isInRoom: boolean;
}> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["controlledTabId", "isInRoom"], (res) => {
      resolve({
        controlledTabId: res.controlledTabId ?? null,
        isInRoom: !!res.isInRoom,
      });
    });
  });
}

export function saveVCStates(
  controlledTabId: number | null,
  isInRoom: boolean
) {
  chrome.storage.local.set({ controlledTabId, isInRoom });
}

export function loadRoomDetails(): Promise<RoomDetails | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get("roomDetails", (res) => {
      resolve(res.roomDetails ?? null);
    });
  });
}

export function sendVCMsg(msg: LocalVideoEvent) {
  sendChromeMsg(msg);
}

// TODO: function to save room url
