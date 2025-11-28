import { PeerMessage } from "../../common/sync-messages-types";

function sendChromeMsg(msg: any) {
  chrome.runtime.sendMessage(msg);
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
}

export function sendHostSuccessMsg(roomId: string) {
  sendChromeMsg({ type: "HOST_SUCCESS", roomId });
}

/** Forward PeerMessage to VideoController */
export function forwardRemotePeerMsg(msg: PeerMessage) {
  sendChromeMsg({
    type: "VIDEO_ACTIONS",
    payload: msg,
  });
}
