import { sendChromeMsg, sendTabMsg } from "../../common/chrome-utils";
import {
  LocalVideoEvent,
  PeerNextVideoMessage,
  PeerTimeMessage,
  ReadinessUIUpdate,
  VCActions,
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
  participantsCount: number
) {
  sendChromeMsg({
    type: "JOIN_SUCCESS",
    roomName: roomName,
    participantsCount: participantsCount,
  });
  // Notify background
  sendChromeMsg({
    type: "IN_ROOM",
  });
}

export function sendHostSuccessMsg(roomId: string) {
  sendChromeMsg({ type: "HOST_SUCCESS", roomId });
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

/** Offscreen -> Background */
export function updatePeerReadinessUI(readinessMap: Record<string, boolean>) {
  sendChromeMsg({ type: "READINESS_UPDATE", readinessMap });
}

/** Background -> Content Script */
export function forwardUpdatePeerReadinessMsg(
  tabId: number,
  msg: ReadinessUIUpdate
) {
  sendTabMsg(tabId, msg);
}
