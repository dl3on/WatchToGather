import { sendChromeMsg, sendTabMsg } from "../../common/chrome-utils";
import {
  LocalVideoEvent,
  PeerNextVideoMessage,
  PeerReadinessMap,
  PeerTimeMessage,
  ReadinessUIUpdate,
  VCActions,
  VideoStateRequest,
} from "../../common/sync-messages-types";

export function sendRoomDetails(roomName: string, participantsCount: number) {
  sendChromeMsg({
    type: "ROOM_DETAILS",
    roomName: roomName,
    participantsCount: participantsCount,
  });
}

export function sendJoinSuccessMsg(
  roomName: string,
  participantsCount: number,
) {
  // Background -> Popup
  sendChromeMsg({
    type: "JOIN_SUCCESS",
    roomName: roomName,
    participantsCount: participantsCount,
  });
}

export function sendHostSuccessMsg(roomId: string) {
  sendChromeMsg({ type: "HOST_SUCCESS", roomId }); // Offscreen -> Popup
  sendChromeMsg({ type: "IN_ROOM" }); // Offscreen -> Background
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

export function sendPrepareVcMsg(
  tabId: number,
  navId: number,
  frameId?: number,
) {
  sendTabMsg(tabId, { type: "PREPARE_VC", navId: navId }, frameId);
}

/** Forward PeerTimeMessage to Content Script */
export function forwardVideoActionsMsg(
  tabId: number,
  msg: VCActions,
  frameId?: number,
) {
  sendTabMsg(tabId, msg, frameId);
}

/** Forward PeerNextVideoMessage to Content Script */
export function forwardNotifyNextVideo(
  tabId: number,
  msg: PeerNextVideoMessage,
  frameId?: number,
) {
  sendTabMsg(tabId, msg, frameId);
}

/** Background -> Offscreen */
export function sendVCMsg(msg: LocalVideoEvent) {
  sendChromeMsg(msg);
}

/** Offscreen -> Background */
export function sendSaveRoomUrlMsg(url: string) {
  sendChromeMsg({ type: "SAVE_ROOM_URL", url });
}

/** Offscreen -> Background */
export function sendHostLinkCompleteMsg() {
  sendChromeMsg({ type: "SEND_JOIN_SUCCESS" });
}

export function sendLocalUrlChangeMsg(url: string) {
  sendChromeMsg({ type: "LOCAL_URL_CHANGE", url });
}

export function sendAckNackMsg(url: string) {
  sendChromeMsg({ type: "ACK_OR_NACK", url });
}

/** Offscreen -> Background & Popup */
export function updatePeerReadinessUI(readinessMap: PeerReadinessMap) {
  sendChromeMsg({ type: "READINESS_UPDATE", readinessMap });
}

/** Offscreen -> Background */
export function sendSaveParticipantsCount(participantsCount: number) {
  sendChromeMsg({ type: "SAVE_PARTICIPANTS_COUNT", count: participantsCount });
}

/** Background -> Content Script */
export function forwardUpdatePeerReadinessMsg(
  tabId: number,
  msg: ReadinessUIUpdate,
  frameId?: number,
) {
  sendTabMsg(tabId, msg, frameId);
}

export function showVideoStatusNotification(success: boolean) {
  const title = "WatchToGather";
  const message = success
    ? "Video ready to watch!"
    : "[Video not found] Ensure video exists and keep the tab active. Please try again.";

  const iconUrl = chrome.runtime.getURL("evadr.jpg");

  chrome.notifications.create({
    type: "basic",
    iconUrl: iconUrl,
    title,
    message,
    priority: 2,
    requireInteraction: false,
  });
}

/** Offscreen (MessageManager) -> Background */
export function sendCurrentVideoState(peerId: string) {
  sendChromeMsg({ type: "SEND_VIDEO_STATE", target: peerId });
}

/** Background -> Content Script */
export function forwardSendVideoState(
  tabId: number,
  msg: VideoStateRequest,
  frameId?: number,
) {
  sendTabMsg(tabId, msg, frameId);
}

/** Background -> Popup */
export function notifyPopupLeftRoom() {
  sendChromeMsg({ type: "LEFT_ROOM" });
}

/** Background -> Popup */
export function sendRoomDisbandMsg() {
  sendChromeMsg({ type: "DISBANDING_ROOM" });
}

/** Background -> Popup */
export function notifyPopupDisband() {
  sendChromeMsg({ type: "ROOM_DISBANDED" });
}

/** Background -> Content Script */
export function notifyCSLeftRoom(tabId: number, frameId?: number) {
  sendTabMsg(tabId, { type: "LEFT_ROOM" }, frameId);
}
